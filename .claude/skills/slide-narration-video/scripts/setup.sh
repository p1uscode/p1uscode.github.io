#!/usr/bin/env bash
# Clone + sync Irodori-TTS into a cache dir (NOT inside this repo — model weights
# are large). Idempotent: safe to re-run. Honors env overrides:
#   IRODORI_DIR   target clone dir (default: $HOME/.cache/irodori-tts/Irodori-TTS)
#   IRODORI_EXTRA uv sync extra (default: cpu on macOS, cu128 if nvidia-smi, else cpu)
set -euo pipefail

IRODORI_DIR="${IRODORI_DIR:-$HOME/.cache/irodori-tts/Irodori-TTS}"
REPO_URL="https://github.com/Aratako/Irodori-TTS.git"

if ! command -v uv >/dev/null 2>&1; then
  echo "error: 'uv' not found on PATH. Install it (e.g. 'brew install uv' or via mise)." >&2
  exit 1
fi

EXTRA="${IRODORI_EXTRA:-}"
if [ -z "$EXTRA" ]; then
  if [ "$(uname)" = "Darwin" ]; then
    EXTRA="cpu"            # macOS: cpu extra ships PyTorch with MPS support
  elif command -v nvidia-smi >/dev/null 2>&1; then
    EXTRA="cu128"
  else
    EXTRA="cpu"
  fi
fi

if [ ! -d "$IRODORI_DIR/.git" ]; then
  echo "[setup] cloning Irodori-TTS -> $IRODORI_DIR"
  mkdir -p "$(dirname "$IRODORI_DIR")"
  git clone --depth 1 "$REPO_URL" "$IRODORI_DIR"
else
  echo "[setup] reusing existing clone at $IRODORI_DIR"
fi

cd "$IRODORI_DIR"
echo "[setup] uv sync --extra $EXTRA (this can take a while on first run)"
uv sync --extra "$EXTRA"

echo "[setup] done. Irodori-TTS ready at: $IRODORI_DIR"
echo "[setup] export IRODORI_DIR=\"$IRODORI_DIR\" if you used a custom path."
