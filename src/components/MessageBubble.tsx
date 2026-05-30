"use client";

import type { ChatMessage } from "@/game/engine";
import { GuardianAvatar } from "./GuardianAvatar";

// 聊天气泡:AI(左) / 玩家(右) / 系统(居中提示)。
// 触发解锁的 AI 气泡会有暖色描边动画。
export function MessageBubble({
  msg,
  trust,
  avatarSet,
  avatarAlt,
}: {
  msg: ChatMessage;
  trust: number;
  avatarSet: string;
  avatarAlt: string;
}) {
  if (msg.speaker === "system") {
    return (
      <div className="my-2 flex justify-center animate-fadeup">
        <span className="pixel-panel rounded-full bg-panelSoft/70 px-3 py-1 text-[10px] text-gray-400 border border-line">
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
        <div className="mr-2.5 mt-0.5">
          <GuardianAvatar trust={trust} avatarSet={avatarSet} alt={avatarAlt} />
        </div>
      )}
      <div
        className={[
          "max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed",
          isMe
            ? "bg-me text-gray-100 rounded-br-sm"
            : "bg-ai text-gray-200 rounded-bl-sm",
          unlocked ? "border border-accent animate-keyglow pixel-panel" : "border border-transparent",
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
