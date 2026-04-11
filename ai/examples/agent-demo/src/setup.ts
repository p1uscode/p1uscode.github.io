/**
 * agent.ts / agent-chat.ts 共通のセットアップ。
 *
 * OTel + Langfuse の初期化 / モデル選択 / ツール読み込み / createAgent まで
 * すべてここで行い、単発モード・対話モードはエージェントの「呼び出し方」だけ
 * に集中できるようにする。
 */
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { CallbackHandler } from "@langfuse/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
import { selectTools } from "@/tools.js";

// ────────────────────────────────────────────────────────────────────
// 1. OpenTelemetry + Langfuse tracer 登録
// ────────────────────────────────────────────────────────────────────
const tracerProvider = new NodeTracerProvider({
  spanProcessors: [
    new LangfuseSpanProcessor({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.AGENT_LANGFUSE_HOST ?? "http://langfuse.home.arpa",
      shouldExportSpan: () => true, // 学習用途のため全 span を送る
    }),
  ],
});
tracerProvider.register();

// ────────────────────────────────────────────────────────────────────
// 2. 環境変数でモデルを選択 (バックエンドは常に LiteLLM)
//   - LLM_BASE_URL: LiteLLM エンドポイントを上書きしたいとき
//   - AGENT_MODEL: `claude-sonnet-4-6` / `gpt-5.4` / `ollama/qwen3.5:9b` 等
// ────────────────────────────────────────────────────────────────────
const LLM_BASE_URL =
  process.env.LLM_BASE_URL ?? "http://litellm.home.arpa/v1";
const MODEL = process.env.AGENT_MODEL ?? "ollama/qwen3.5:9b";

// ────────────────────────────────────────────────────────────────────
// 3. LLM + tools + agent
// ────────────────────────────────────────────────────────────────────
const llm = new ChatOpenAI({
  model: MODEL,
  temperature: 0,
  apiKey: "sk-none", // LiteLLM はキー強制なし
  configuration: { baseURL: LLM_BASE_URL },
});

const tools = selectTools();

const BASE_PROMPT = [
  "You are a careful research assistant.",
  "Use the provided tools when they help you produce a more accurate answer.",
  "Think step-by-step and chain multiple tool calls if needed.",
  "Answer in the user's language.",
].join(" ");

const CHAT_ADDENDUM = [
  "This is an interactive multi-turn chat session.",
  "If the user's request is ambiguous or missing information you genuinely need,",
  "ask one focused clarifying question (do NOT call any tool in that turn).",
  "When the user's needs are fully met and no further exchange is needed,",
  "you MAY call the `end_chat` tool to signal the conversation is complete.",
  "Never call `end_chat` unless the current user turn is actually finished.",
].join(" ");

/**
 * mode に応じた system prompt を組み立ててエージェントを返す。
 *   - "single-shot": `end_chat` は使わない前提。シンプルな research assistant
 *   - "interactive": `end_chat` 使用可 + 追加質問許可 (チャット用)
 */
export function createAgentInstance(mode: "single-shot" | "interactive") {
  const systemPrompt =
    mode === "interactive" ? `${BASE_PROMPT} ${CHAT_ADDENDUM}` : BASE_PROMPT;
  return createAgent({
    model: llm,
    tools,
    systemPrompt,
  });
}

// ────────────────────────────────────────────────────────────────────
// 4. 共通ヘルパ
// ────────────────────────────────────────────────────────────────────

/** 起動バナーを出す (model / 有効ツール一覧を表示) */
export function printBanner(name: string): void {
  console.log(
    `[${name}] model=${MODEL} tools=[${tools.map((t) => t.name).join(", ")}]`,
  );
}

/** Langfuse CallbackHandler を作成。mode は trace 識別用の tag */
export function createLangfuseHandler(
  mode: "single-shot" | "interactive",
): CallbackHandler {
  return new CallbackHandler({
    sessionId: `agent-demo-${Date.now()}`,
    tags: ["agent-demo", mode],
  });
}

/**
 * AIMessage.content は string または content parts 配列
 * ([{ type: "text", text: "..." }]) のどちらかを返す可能性があるので両対応
 */
export function renderContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const text = content
      .filter((part) => part && typeof part === "object" && "text" in part)
      .map((part) => (part as { text: string }).text)
      .join("\n");
    return text || JSON.stringify(content, null, 2);
  }
  return JSON.stringify(content, null, 2);
}

/** 未送信の OTel span を flush してプロバイダを停止 */
export async function shutdown(): Promise<void> {
  await tracerProvider.forceFlush();
  await tracerProvider.shutdown();
}
