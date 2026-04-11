/**
 * 対話 (マルチターン) モード。
 *
 * readline で標準入力から継続的にユーザ入力を受け付け、会話履歴 (messages
 * 配列) を保持したまま agent.invoke() を繰り返す。LLM がツールを呼ばずに
 * 追加質問を返したターンは、そのまま次のユーザ入力待ちに戻る (= 自然な
 * 「人間 ↔ エージェント」のキャッチボールが継続する)。
 *
 * LLM が `end_chat` ツールを呼んだ場合は、そのターンの最終応答を出した後に
 * チャットループを正常終了する。ユーザ側の `/exit` / `/quit` / Ctrl+D でも
 * 終了可能。
 *
 * 1 回だけ問い合わせて終わりたい場合は agent-single.ts を使うこと。
 *
 * 実行: `mise run agent-chat`
 */
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import {
  createAgentInstance,
  createLangfuseHandler,
  printBanner,
  renderContent,
  shutdown,
} from "@/setup.js";
import { consumeEndChatSignal } from "@/tools.js";

printBanner("agent-chat");

const agent = createAgentInstance("interactive");
const langfuse = createLangfuseHandler("interactive");
const rl = createInterface({ input, output });

// 会話履歴 (毎ターン全履歴を agent.invoke に渡す)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let messages: any[] = [];

console.log(`\nInteractive agent ready. Type your message; "/exit" to quit.\n`);

try {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let userInput: string;
    try {
      userInput = (await rl.question("\nyou> ")).trim();
    } catch {
      // stdin EOF (Ctrl+D or pipe closed) → 正常終了
      break;
    }
    if (!userInput) continue;
    if (userInput === "/exit" || userInput === "/quit") break;

    messages = [...messages, { role: "user", content: userInput }];

    const result = await agent.invoke(
      { messages },
      { callbacks: [langfuse], metadata: { source: "agent-chat" } },
    );

    // invoke の結果には user + assistant + tool のメッセージ全部が入って
    // 返ってくるので、それをそのまま次ターンの履歴として使う
    messages = result.messages;

    const last = messages[messages.length - 1];
    console.log(`\nagent> ${renderContent(last.content)}`);

    // このターン中に LLM が end_chat ツールを呼んでいたらループ終了
    const endSignal = consumeEndChatSignal();
    if (endSignal) {
      console.log(`\n[chat ended by agent: ${endSignal.reason}]`);
      break;
    }
  }
} finally {
  rl.close();
  await shutdown();
}
