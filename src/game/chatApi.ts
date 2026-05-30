import type { ChatMessage, ResolveResult } from "./engine";

export type ChatApiResult = ResolveResult;

export async function requestChatReply({
  levelId,
  input,
  messages,
  unlockedLockIds,
  ownedKeyIds,
  currentTrust,
}: {
  levelId: number;
  input: string;
  messages: ChatMessage[];
  unlockedLockIds: string[];
  ownedKeyIds: string[];
  currentTrust: number;
}): Promise<ChatApiResult> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      levelId,
      input,
      messages,
      unlockedLockIds,
      ownedKeyIds,
      currentTrust,
    }),
  });

  if (!response.ok) {
    throw new Error("chat_api_failed");
  }

  return response.json() as Promise<ChatApiResult>;
}
