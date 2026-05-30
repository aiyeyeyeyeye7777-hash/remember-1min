"use client";

import { useState } from "react";
import type { LevelScript } from "@/game/types";
import { loadSave } from "@/game/storage";
import { GuardianAvatar } from "./GuardianAvatar";
import { PhoneShell } from "./PhoneShell";

type View =
  | { name: "levels" }
  | { name: "stories" }
  | { name: "story"; level: LevelScript };

export function LevelSelect({
  levels,
  onSelect,
}: {
  levels: LevelScript[];
  onSelect: (level: LevelScript) => void;
}) {
  const [view, setView] = useState<View>({ name: "levels" });

  return (
    <PhoneShell>
      {view.name === "levels" && (
        <LevelGrid
          levels={levels}
          onSelect={onSelect}
          onOpenStories={() => setView({ name: "stories" })}
        />
      )}
      {view.name === "stories" && (
        <StoryCollection
          levels={levels}
          onBack={() => setView({ name: "levels" })}
          onOpenStory={(level) => setView({ name: "story", level })}
        />
      )}
      {view.name === "story" && (
        <StoryDetail
          level={view.level}
          onBack={() => setView({ name: "stories" })}
        />
      )}
    </PhoneShell>
  );
}

function LevelGrid({
  levels,
  onSelect,
  onOpenStories,
}: {
  levels: LevelScript[];
  onSelect: (level: LevelScript) => void;
  onOpenStories: () => void;
}) {
  const cells = Array.from({ length: 6 }, (_, index) => levels[index] ?? null);

  return (
    <div className="relative flex h-full flex-col bg-gradient-to-b from-panel to-[#090c11] px-5 py-6">
      <header className="shrink-0">
        <p className="terminal-title text-[10px] font-semibold tracking-[0.32em] text-accent/80">
          REMEMBER 1 MIN
        </p>
        <h1 className="terminal-title mt-2 text-2xl font-bold text-gray-100">
          我只能记住你一分钟
        </h1>
        <p className="mt-2 text-[12px] leading-relaxed text-gray-500">
          选择一扇门。每一关都是一段只剩 60 秒的记忆。
        </p>
      </header>

      <div className="mt-6 grid flex-1 grid-cols-2 grid-rows-3 gap-3 pb-16">
        {cells.map((level, index) => {
          if (!level) {
            return (
              <div
                key={`locked-${index}`}
                className="pixel-panel rounded-2xl border border-dashed border-line bg-panelSoft/35 p-3 opacity-70"
              >
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="text-2xl">🔒</div>
                  <div className="mt-2 text-[12px] font-semibold text-gray-600">
                    未开放
                  </div>
                  <div className="mt-1 text-[10px] text-gray-700">
                    门还在生成中
                  </div>
                </div>
              </div>
            );
          }

          const save = typeof window === "undefined" ? null : loadSave(level.id);
          const ownedCount = save?.ownedKeyIds.length ?? 0;
          const cleared = Boolean(save?.cleared);

          return (
            <button
              key={level.id}
              type="button"
              onClick={() => onSelect(level)}
              className="signal-card pixel-panel group rounded-2xl border border-line bg-panelSoft/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-accent/60 hover:bg-panelSoft active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <GuardianAvatar
                  trust={cleared ? 100 : ownedCount * 18}
                  avatarSet={level.avatarSet}
                  alt={level.avatarAlt}
                  size={42}
                />
                <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-gray-500">
                  {cleared ? "已通关" : `${ownedCount}/${level.locks.length}`}
                </span>
              </div>
              <div className="mt-3 text-[10px] text-accent">第 {level.id} 关</div>
              <h2 className="mt-1 line-clamp-2 text-[14px] font-bold leading-tight text-gray-100">
                {level.title}
              </h2>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${(ownedCount / level.locks.length) * 100}%` }}
                />
              </div>
              <div className="mt-2 text-[10px] font-semibold text-accent group-hover:text-rain">
                进入 →
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onOpenStories}
        className="terminal-title absolute bottom-5 right-5 rounded-full border border-accent/50 bg-accent px-4 py-2 text-[12px] font-bold text-panel shadow-[0_0_22px_rgba(245,166,35,0.25)] transition active:scale-95"
      >
        回收档案
      </button>
    </div>
  );
}

function StoryCollection({
  levels,
  onBack,
  onOpenStory,
}: {
  levels: LevelScript[];
  onBack: () => void;
  onOpenStory: (level: LevelScript) => void;
}) {
  return (
    <div className="flex h-full flex-col bg-panel">
      <header className="shrink-0 border-b border-line bg-panel/95 px-5 py-5">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-line px-3 py-1 text-[11px] text-gray-500 transition hover:border-accent/50 hover:text-accent active:scale-95"
        >
          ← 选关
        </button>
        <h1 className="terminal-title mt-4 text-2xl font-bold text-gray-100">回收档案</h1>
        <p className="mt-2 text-[12px] text-gray-500">
          通关后的完整故事会作为旧世界记忆归档。
        </p>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-2">
          {levels.map((level) => {
            const save = typeof window === "undefined" ? null : loadSave(level.id);
            const cleared = Boolean(save?.cleared);

            return (
              <button
                key={level.id}
                type="button"
                onClick={() => cleared && onOpenStory(level)}
                disabled={!cleared}
                className={[
                  "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99]",
                  cleared
                    ? "signal-card pixel-panel border-accent/45 bg-panelSoft hover:border-accent"
                    : "cursor-not-allowed border-line bg-panelSoft/35 opacity-55",
                ].join(" ")}
              >
                <GuardianAvatar
                  trust={cleared ? 100 : 0}
                  avatarSet={level.avatarSet}
                  alt={level.avatarAlt}
                  size={38}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-accent">第 {level.id} 关</div>
                  <div className="mt-0.5 truncate text-[14px] font-bold text-gray-100">
                    {level.ending.storyTitle ?? level.title}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    {cleared ? "点击阅读完整故事" : "通关后解锁"}
                  </div>
                </div>
                <div className="text-[16px] text-gray-500">{cleared ? "›" : "🔒"}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StoryDetail({
  level,
  onBack,
}: {
  level: LevelScript;
  onBack: () => void;
}) {
  return (
    <article className="flex h-full flex-col bg-panel">
      <header className="shrink-0 border-b border-line bg-panel/95 px-5 py-5">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-line px-3 py-1 text-[11px] text-gray-500 transition hover:border-accent/50 hover:text-accent active:scale-95"
        >
          ← 回收档案
        </button>
        <div className="mt-4 flex items-center gap-3">
          <GuardianAvatar
            trust={100}
            avatarSet={level.avatarSet}
            alt={level.avatarAlt}
            size={44}
          />
          <div className="min-w-0">
            <div className="text-[10px] text-accent">第 {level.id} 关</div>
            <h1 className="terminal-title truncate text-xl font-bold text-gray-100">
              {level.ending.storyTitle ?? level.title}
            </h1>
          </div>
        </div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-5">
        <div className="pixel-panel rounded-2xl border border-accent/25 bg-panelSoft/75 p-4">
          <p className="text-[11px] text-gray-500">{level.ending.letterLabel}</p>
          <div className="mt-3 space-y-1 text-[15px] font-semibold leading-relaxed text-gray-100">
            {level.ending.letterLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-4 text-[13px] leading-7 text-gray-300">
          {level.ending.fullStory.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </article>
  );
}
