"use client";

import type { LevelEnding } from "@/game/types";

// 通关结算弹层:小黑"下班"后的温暖落幕 + 重新开始。
export function ClearedOverlay({
  rounds,
  ending,
  onRestart,
  onBackToLevels,
}: {
  rounds: number;
  ending: LevelEnding;
  onRestart: () => void;
  onBackToLevels: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-panel/88 px-6 text-center backdrop-blur-[2px] animate-fadeup">
      <div className="text-5xl">✉️</div>
      <h2 className="mt-4 text-lg font-bold text-accent">{ending.title}</h2>
      <div className="mt-4 rounded-2xl border border-accent/35 bg-panelSoft/95 px-5 py-4 text-left shadow-xl">
        <p className="text-[11px] text-gray-500">{ending.letterLabel}</p>
        <p className="mt-3 text-[16px] font-semibold leading-relaxed text-gray-100">
          {ending.letterLines.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </p>
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-gray-400">
        {ending.narration}
      </p>
      <div className="mt-5 rounded-xl border border-line bg-panelSoft px-4 py-2 text-[11px] text-gray-400">
        你陪它经历了 <span className="text-accent font-semibold">{rounds}</span> 次记忆清空，
        <br />
        才在一分钟里唤醒了它。
      </div>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={onBackToLevels}
          className="rounded-full bg-accent px-5 py-2 text-[13px] font-semibold text-panel transition active:scale-95"
        >
          返回选关
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="rounded-full border border-accent/60 px-5 py-2 text-[13px] font-medium text-accent transition active:scale-95"
        >
          重玩本关
        </button>
      </div>
    </div>
  );
}
