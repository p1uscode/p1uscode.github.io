/**
 * Agent 用ツール定義の集約モジュール。
 *
 * エージェント本体 (agent.ts / agent-chat.ts) は `selectTools()` でツールを読み込む。
 * 環境変数 `AGENT_TOOLS` でカンマ区切り指定できる (例: "search,calc")。
 * 未指定時は全ツール有効。
 */
import { tool } from "langchain";
import { z } from "zod";

const SEARXNG_BASE_URL =
  process.env.SEARXNG_BASE_URL ?? "http://searxng.home.arpa";

// ────────────────────────────────────────────────────────────────────
// search: SearXNG で Web 検索
// ────────────────────────────────────────────────────────────────────
export const searchTool = tool(
  async ({ query }: { query: string }) => {
    const url = new URL(`${SEARXNG_BASE_URL}/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`searxng ${res.status}`);
    const data = (await res.json()) as {
      results: Array<{ title: string; content: string; url: string }>;
    };
    return JSON.stringify(
      data.results.slice(0, 5).map((r) => ({
        title: r.title,
        content: r.content,
        url: r.url,
      })),
    );
  },
  {
    name: "search",
    description:
      "Search the web via SearXNG. Use for up-to-date information or factual lookups.",
    schema: z.object({
      query: z.string().describe("Search query in natural language."),
    }),
  },
);

// ────────────────────────────────────────────────────────────────────
// fetch_url: 任意の URL を取得して本文 (プレーン化) を返す
// ────────────────────────────────────────────────────────────────────
export const fetchUrlTool = tool(
  async ({ url }: { url: string }) => {
    const res = await fetch(url);
    if (!res.ok) return `error: HTTP ${res.status}`;
    const html = await res.text();
    // 超簡易 HTML ストリップ
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 3000);
  },
  {
    name: "fetch_url",
    description:
      "Fetch a URL and return the stripped text content (first 3000 chars).",
    schema: z.object({
      url: z.url().describe("The URL to fetch."),
    }),
  },
);

// ────────────────────────────────────────────────────────────────────
// wikipedia: 日本語 Wikipedia の要約を取得
// ────────────────────────────────────────────────────────────────────
export const wikipediaTool = tool(
  async ({ title, lang }: { title: string; lang?: string }) => {
    const language = lang ?? "ja";
    const url = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "p1uscode-agent-demo/0.0.0" },
    });
    if (res.status === 404) return `not found: ${title} (${language})`;
    if (!res.ok) return `error: HTTP ${res.status}`;
    const data = (await res.json()) as {
      title: string;
      extract: string;
      content_urls?: { desktop?: { page?: string } };
    };
    return JSON.stringify({
      title: data.title,
      extract: data.extract,
      url: data.content_urls?.desktop?.page,
    });
  },
  {
    name: "wikipedia",
    description:
      "Look up a Wikipedia article summary. Provide the article title and language code (default 'ja').",
    schema: z.object({
      title: z.string().describe("Wikipedia article title."),
      lang: z
        .string()
        .optional()
        .describe("Language code (e.g. 'ja', 'en'). Default 'ja'."),
    }),
  },
);

// ────────────────────────────────────────────────────────────────────
// now: 現在時刻 (ISO 8601 / UTC)
// ────────────────────────────────────────────────────────────────────
export const nowTool = tool(
  async () => new Date().toISOString(),
  {
    name: "now",
    description: "Return the current UTC time in ISO-8601 format.",
    schema: z.object({}),
  },
);

// ────────────────────────────────────────────────────────────────────
// calc: 単純な四則演算
// ────────────────────────────────────────────────────────────────────
export const calcTool = tool(
  async ({ expression }: { expression: string }) => {
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      return "error: expression contains disallowed characters";
    }
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      return String(result);
    } catch (e) {
      return `error: ${(e as Error).message}`;
    }
  },
  {
    name: "calc",
    description:
      "Evaluate a pure arithmetic expression. Only digits and +, -, *, /, ( ) allowed.",
    schema: z.object({
      expression: z.string().describe("Arithmetic expression."),
    }),
  },
);

// ────────────────────────────────────────────────────────────────────
// random_int: 指定範囲の乱数
// ────────────────────────────────────────────────────────────────────
export const randomIntTool = tool(
  async ({ min, max }: { min: number; max: number }) => {
    if (min > max) return "error: min must be <= max";
    const n = Math.floor(Math.random() * (max - min + 1)) + min;
    return String(n);
  },
  {
    name: "random_int",
    description: "Return a random integer in the inclusive range [min, max].",
    schema: z.object({
      min: z.number().int().describe("Minimum (inclusive)."),
      max: z.number().int().describe("Maximum (inclusive)."),
    }),
  },
);

// ────────────────────────────────────────────────────────────────────
// end_chat: チャット (マルチターン) を終了したいと LLM が判断したときに呼ぶ
//
// ツール実行は「LLM にエラーとして再試行させる」ではなく、「ツールの戻り値を
// LLM にフィードバックしつつ、module-level のフラグを立てて外側のチャット
// ループにシグナルを伝える」方式にする。
//
// invoke が完走したあとに `consumeEndChatSignal()` を呼んで、セットされていれば
// ループを break する。
// ────────────────────────────────────────────────────────────────────
let endChatSignal: { reason: string } | null = null;

export function consumeEndChatSignal(): { reason: string } | null {
  const s = endChatSignal;
  endChatSignal = null;
  return s;
}

export const endChatTool = tool(
  async ({ reason }: { reason: string }) => {
    endChatSignal = { reason };
    return `Conversation marked as complete. Reason: ${reason}`;
  },
  {
    name: "end_chat",
    description: [
      "Call this tool ONLY in an interactive multi-turn chat when the user's",
      "needs are fully met and no further exchange is needed.",
      "Do NOT call this tool during single-shot / one-off queries or while",
      "there is still pending work (tool chains, follow-up questions, etc.).",
    ].join(" "),
    schema: z.object({
      reason: z
        .string()
        .describe("Short reason why the conversation is being ended."),
    }),
  },
);

// ────────────────────────────────────────────────────────────────────
// 登録テーブル + セレクタ
// ────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOOLS: Record<string, any> = {
  search: searchTool,
  fetch_url: fetchUrlTool,
  wikipedia: wikipediaTool,
  now: nowTool,
  calc: calcTool,
  random_int: randomIntTool,
  end_chat: endChatTool,
};

/**
 * 環境変数 `AGENT_TOOLS` (カンマ区切り) でツール選択。
 *   - 未設定 (env var 自体なし) → 全ツール
 *   - 空文字列 `AGENT_TOOLS=""` → ツール 0 個 (LLM 単独モード)
 *   - `"search,now"` など → 指定ツールのみ
 * 不明なツール名は警告のうえ無視。
 */
export function selectTools() {
  const env = process.env.AGENT_TOOLS;
  if (env === undefined) return Object.values(TOOLS);
  const raw = env.trim();
  if (!raw) return [];
  const requested = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const selected = [];
  for (const name of requested) {
    if (name in TOOLS) {
      selected.push(TOOLS[name]);
    } else {
      console.warn(
        `[tools] unknown tool "${name}" (available: ${Object.keys(TOOLS).join(", ")})`,
      );
    }
  }
  return selected;
}
