"use client";

import type { ChatMessage } from "@/game/engine";

// 聊天气泡:AI(左) / 玩家(右) / 系统(居中提示)。
// 触发解锁的 AI 气泡会有暖色描边动画。
export function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.speaker === "system") {
    return (
      <div className="my-2 flex justify-center animate-fadeup">
        <span className="rounded-full bg-panelSoft/70 px-3 py-1 text-[10px] text-gray-400 border border-line">
          {msg.text}
        </span>
      </div>
    );
  }

  const isMe = msg.speaker === "me";
  const unlocked = Boolean(msg.unlockedKeyId);
  const trustDelta = msg.trustDelta ?? 0;

  return (
    <div className={`flex animate-fadeup ${isMe ? "justify-end" : "justify-start"}`}>
      {!isMe && (
        <div className="mr-2 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ai text-sm border border-line">
          🐾
        </div>
      )}
      <div
        className={[
          "max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed",
          isMe
            ? "bg-me text-gray-100 rounded-br-sm"
            : "bg-ai text-gray-200 rounded-bl-sm",
          unlocked ? "border border-accent animate-keyglow" : "border border-transparent",
        ].join(" ")}
      >
        {msg.text}
        {!isMe && trustDelta > 0 && (
          <div className="mt-1.5 text-[10px] font-semibold text-accent">
            信任 +{trustDelta}
          </div>
        )}
      </div>
    </div>
  );
}
