"""Ollama と mlx-lm のスループット比較ベンチ。

同一モデル (Qwen3.8-27B, 4bit 相当) を Ollama 経由と mlx-lm 直叩きで走らせ、
prefill / decode それぞれの tok/s と TTFT、ピークメモリを測る。

  uv run python bench.py                    # 両方
  uv run python bench.py --engine ollama    # 片方だけ
"""

import argparse
import json
import subprocess
import time
import urllib.request

OLLAMA_URL = "http://localhost:11434/api/chat"

# prefill を測るための長文。同じ本文を n 回繰り返してトークン数を稼ぐ。
FILLER = (
    "Apple Silicon の統合メモリアーキテクチャでは、CPU と GPU が同一の物理メモリを共有する。"
    "そのため大規模言語モデルの重みを GPU 側へコピーする必要がなく、メモリ帯域がそのまま "
    "推論スループットの上限を決める。M4 Pro の帯域は 273GB/s で、4bit 量子化した 27B モデルの "
    "重みは約 15GB なので、理論上の生成速度はここから見積もることができる。"
)

CASES = [
    # (名前, prompt, max_tokens)
    ("decode", "フィボナッチ数列を計算する Python 関数を書き、計算量を説明してください。", 256),
    ("prefill", FILLER * 40 + "\n\n上の文章を3行で要約してください。", 64),
]


def run_ollama(model: str, prompt: str, max_tokens: int, num_ctx: int, nonce: str = "") -> dict:
    prompt = nonce + prompt
    body = json.dumps(
        {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": True,
            "think": False,
            "options": {
                "temperature": 0,
                "seed": 42,
                "num_predict": max_tokens,
                "num_ctx": num_ctx,
            },
        }
    ).encode()
    req = urllib.request.Request(OLLAMA_URL, data=body, headers={"Content-Type": "application/json"})

    t0 = time.perf_counter()
    ttft = None
    final = None
    with urllib.request.urlopen(req) as res:
        for line in res:
            if not line.strip():
                continue
            chunk = json.loads(line)
            if ttft is None and chunk.get("message", {}).get("content"):
                ttft = time.perf_counter() - t0
            if chunk.get("done"):
                final = chunk
    wall = time.perf_counter() - t0

    return {
        "prompt_tokens": final["prompt_eval_count"],
        "prompt_tps": final["prompt_eval_count"] / (final["prompt_eval_duration"] / 1e9),
        "gen_tokens": final["eval_count"],
        "gen_tps": final["eval_count"] / (final["eval_duration"] / 1e9),
        "ttft": ttft,
        "wall": wall,
    }


def run_mlx(model, tokenizer, prompt: str, max_tokens: int, nonce: str = "") -> dict:
    prompt = nonce + prompt
    import mlx.core as mx
    from mlx_lm import stream_generate
    from mlx_lm.sample_utils import make_sampler

    text = tokenizer.apply_chat_template(
        [{"role": "user", "content": prompt}],
        add_generation_prompt=True,
        enable_thinking=False,
    )

    mx.clear_cache()
    mx.reset_peak_memory()
    t0 = time.perf_counter()
    ttft = None
    last = None
    for resp in stream_generate(
        model, tokenizer, text, max_tokens=max_tokens, sampler=make_sampler(temp=0.0)
    ):
        if ttft is None:
            ttft = time.perf_counter() - t0
        last = resp
    wall = time.perf_counter() - t0

    return {
        "prompt_tokens": last.prompt_tokens,
        "prompt_tps": last.prompt_tps,
        "gen_tokens": last.generation_tokens,
        "gen_tps": last.generation_tps,
        "ttft": ttft,
        "wall": wall,
        "peak_gb": last.peak_memory,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", choices=["both", "ollama", "mlx"], default="both")
    ap.add_argument("--ollama-model", default="qwen3.8:27b-mlx")
    ap.add_argument("--mlx-model", default="mlx-community/Qwen3.8-27B-4bit")
    ap.add_argument("--num-ctx", type=int, default=16384)
    ap.add_argument("--repeat", type=int, default=2, help="計測回数 (最良値を採用)")
    ap.add_argument("--json-out", default="")
    args = ap.parse_args()

    results = {}

    if args.engine in ("both", "ollama"):
        print(f"== ollama: {args.ollama_model} ==", flush=True)
        print("  warmup...", flush=True)
        run_ollama(args.ollama_model, "hello", 8, args.num_ctx)
        for name, prompt, mt in CASES:
            runs = [run_ollama(args.ollama_model, prompt, mt, args.num_ctx, nonce=f"[run {i}] ")
                    for i in range(args.repeat)]
            best = max(runs, key=lambda r: r["gen_tps"])
            results[("ollama", name)] = best
            print(f"  {name}: {best['gen_tps']:.1f} tok/s gen / {best['prompt_tps']:.0f} tok/s prefill", flush=True)

        subprocess.run(["ollama", "stop", args.ollama_model], check=False)
        print("  unloaded ollama model", flush=True)

    if args.engine in ("both", "mlx"):
        from mlx_lm import load

        print(f"== mlx-lm: {args.mlx_model} ==", flush=True)
        t0 = time.perf_counter()
        model, tokenizer = load(args.mlx_model)
        print(f"  load: {time.perf_counter() - t0:.1f}s", flush=True)
        run_mlx(model, tokenizer, "hello", 8)
        for name, prompt, mt in CASES:
            runs = [run_mlx(model, tokenizer, prompt, mt, nonce=f"[run {i}] ")
                    for i in range(args.repeat)]
            best = max(runs, key=lambda r: r["gen_tps"])
            results[("mlx", name)] = best
            print(f"  {name}: {best['gen_tps']:.1f} tok/s gen / {best['prompt_tps']:.0f} tok/s prefill", flush=True)

    print()
    print(f"{'case':<18}{'prompt tok':>11}{'prefill t/s':>13}{'gen tok':>9}{'gen t/s':>10}{'TTFT s':>9}")
    print("-" * 70)
    for (engine, name), r in results.items():
        print(
            f"{engine + '/' + name:<18}{r['prompt_tokens']:>11}{r['prompt_tps']:>13.0f}"
            f"{r['gen_tokens']:>9}{r['gen_tps']:>10.1f}{r['ttft']:>9.2f}"
            f"{r.get('peak_gb', float('nan')):>9.1f}"
        )

    for name, _, _ in CASES:
        o, m = results.get(("ollama", name)), results.get(("mlx", name))
        if o and m:
            print(f"\n{name}: mlx-lm は ollama の {m['gen_tps'] / o['gen_tps']:.2f}x (生成), "
                  f"{m['prompt_tps'] / o['prompt_tps']:.2f}x (prefill)")

    if args.json_out:
        with open(args.json_out, "w") as f:
            json.dump({f"{e}/{n}": r for (e, n), r in results.items()}, f, indent=2, ensure_ascii=False)
        print(f"\nwrote {args.json_out}")


if __name__ == "__main__":
    main()
