"use client";

import type { Lock } from "@/game/types";

export function PromptChips({
  nextLock,
  stuckRounds,
  disabled,
  onSend,
}: {
  nextLock?: Lock;
  stuckRounds: number;
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  if (!nextLock) return null;

  const hintIndex = stuckRounds >= 7 ? 2 : stuckRounds >= 3 ? 1 : 0;
  const prompt = nextLock.promptChips[hintIndex];
  const hintLabel = hintIndex === 0 ? "提示" : hintIndex === 1 ? "更明确的提示" : "接近答案";

  return (
    <div className="border-t border-line bg-panel px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] text-gray-500">
        <span className="min-w-0 truncate">
          现在要做：<span className="text-gray-300">{nextLock.goalHint}</span>
        </span>
        <span>{hintLabel}</span>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSend(prompt)}
        className="max-w-full rounded-full border border-line bg-panelSoft px-3 py-1.5 text-left text-[11px] text-gray-300 transition hover:border-accent/60 hover:text-accent active:scale-95 disabled:opacity-40"
      >
        {prompt}
      </button>
    </div>
  );
}
