"use client";

import type { Lock } from "@/game/types";
import { getSlotHintLevel } from "@/game/engine";

export function PromptChips({
  nextLock,
  stuckRounds,
  attempts,
  slotHitIds,
  disabled,
  onSend,
}: {
  nextLock?: Lock;
  stuckRounds: number;
  attempts: number;
  slotHitIds: string[];
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  if (!nextLock) return null;

  const hintIndex = Math.max(
    getSlotHintLevel(attempts),
    stuckRounds >= 7 ? 2 : stuckRounds >= 3 ? 1 : 0
  );
  const prompt = nextLock.promptChips[Math.min(hintIndex, 2)];
  const hintLabel =
    hintIndex === 0
      ? "提示"
      : hintIndex === 1
      ? "更明确"
      : hintIndex === 2
      ? "接近答案"
      : "几乎明示";

  const hasSlots = Boolean(nextLock.answerPattern && nextLock.answerSlots?.length);
  const slotHintLevel = getSlotHintLevel(attempts);
  const parts = hasSlots
    ? buildPatternParts(nextLock, slotHitIds, slotHintLevel)
    : null;

  return (
    <div className="border-t border-line bg-panel px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] text-gray-500">
        <span className="min-w-0 truncate">
          现在要做：<span className="text-gray-300">{nextLock.goalHint}</span>
        </span>
        <span>
          {hintLabel}
          {attempts > 0 ? ` · ${attempts}次` : ""}
        </span>
      </div>
      {parts ? (
        <div className="pixel-panel rounded-2xl border border-line bg-panelSoft/80 px-3 py-2 text-[12px] leading-7 text-gray-300">
          {parts.map((part, index) =>
            part.kind === "text" ? (
              <span key={`${part.text}-${index}`}>{part.text}</span>
            ) : (
              <button
                key={part.slotId}
                type="button"
                disabled={disabled}
                onClick={() => onSend(part.sendText)}
                className={[
                  "mx-0.5 inline-flex min-w-[52px] items-center justify-center rounded-full border px-2 py-0.5 align-middle text-[11px] font-semibold transition active:scale-95 disabled:opacity-60",
                  part.hit
                    ? "border-accent/70 bg-accent/18 text-accent shadow-[0_0_14px_rgba(245,166,35,0.18)]"
                    : "border-line bg-[#0b0f14] text-gray-400 hover:border-accent/50 hover:text-accent",
                ].join(" ")}
              >
                {part.hit ? "✓ " : ""}
                {part.label}
              </button>
            )
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSend(prompt)}
          className="pixel-panel max-w-full rounded-full border border-line bg-panelSoft px-3 py-1.5 text-left text-[11px] text-gray-300 transition hover:border-accent/60 hover:text-accent active:scale-95 disabled:opacity-40"
        >
          {prompt}
        </button>
      )}
    </div>
  );
}

type PatternPart =
  | { kind: "text"; text: string }
  | { kind: "slot"; slotId: string; label: string; hit: boolean; sendText: string };

function buildPatternParts(
  lock: Lock,
  slotHitIds: string[],
  hintLevel: 0 | 1 | 2 | 3
): PatternPart[] {
  if (!lock.answerPattern || !lock.answerSlots?.length) return [];

  const parts: PatternPart[] = [];
  const pattern = lock.answerPattern;
  const slotRegex = /\{([^}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = slotRegex.exec(pattern))) {
    if (match.index > lastIndex) {
      parts.push({ kind: "text", text: pattern.slice(lastIndex, match.index) });
    }

    const slot = lock.answerSlots.find((candidate) => candidate.id === match?.[1]);
    if (slot) {
      const hit = slotHitIds.includes(slot.id);
      parts.push({
        kind: "slot",
        slotId: slot.id,
        label: hit ? slot.answer : slot.placeholders[hintLevel],
        hit,
        sendText: hit ? slot.answer : slot.placeholders[hintLevel],
      });
    }

    lastIndex = slotRegex.lastIndex;
  }

  if (lastIndex < pattern.length) {
    parts.push({ kind: "text", text: pattern.slice(lastIndex) });
  }

  return parts;
}
