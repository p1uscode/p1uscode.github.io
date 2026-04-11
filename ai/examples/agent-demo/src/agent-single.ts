/**
 * 単発 (1 ターン) モード。
 *
 * CLI 引数で渡された prompt を 1 度だけ agent.invoke() に流し、応答を
 * 出力してプロセスを終了する。会話履歴は保持せず、LLM が追加質問を返した
 * としてもそれをそのまま最終出力として表示するだけで終わる。
 *
 * 複数ターンの対話や LLM からの追加質問にユーザとして応答したい場合は
 * agent-chat.ts を使うこと。
 *
 * 実行: `mise run agent-single -- "your prompt"`
 */
import {
  createAgentInstance,
  createLangfuseHandler,
  printBanner,
  renderContent,
  shutdown,
} from "@/setup.js";

printBanner("agent-single");

const agent = createAgentInstance("single-shot");

const userInput =
  process.argv.slice(2).join(" ") ||
  "Tokyo の現在時刻と、直近の日本の政策金利について調べて要約して。";

console.log(`\n> ${userInput}\n`);

const langfuse = createLangfuseHandler("single-shot");

const result = await agent.invoke(
  { messages: [{ role: "user", content: userInput }] },
  { callbacks: [langfuse], metadata: { source: "agent-single" } },
);

const finalMessage = result.messages[result.messages.length - 1];
console.log("\n=== Final answer ===\n");
console.log(renderContent(finalMessage.content));

await shutdown();
