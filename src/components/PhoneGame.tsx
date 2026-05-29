"use client";

import { useEffect, useRef } from "react";
import type { LevelScript } from "@/game/types";
import { useGame } from "@/game/useGame";
import { getAllKeys } from "@/game/engine";
import { Countdown } from "./Countdown";
import { TrustMeter } from "./TrustMeter";
import { MessageBubble } from "./MessageBubble";
import { KeyShelf } from "./KeyShelf";
import { PromptChips } from "./PromptChips";
import { ChatInput } from "./ChatInput";
import { ClearedOverlay } from "./ClearedOverlay";

// ============================================================
// PhoneGame:390x844 手机竖屏外壳,组装全部玩法部件。
// ============================================================
export function PhoneGame({ level }: { level: LevelScript }) {
  const { state, send, restart, pauseTimer, nextLock, hydrated } = useGame(level);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allKeys = getAllKeys(level);
  const readyToRelease = state.trust >= level.trustGoal;

  // 新消息自动滚到底
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [state.messages, state.thinking]);

  const placeholder = state.cleared
    ? "它已经休息了…"
    : readyToRelease
    ? "信任已经满了，门正在打开…"
    : "说出让它相信你的话…";

  return (
    <div
      className={[
        "relative flex min-h-screen items-center justify-center overflow-hidden p-2 sm:p-4",
        state.cleared ? "bg-[#05070a]" : "bg-gradient-to-b from-[#05070a] to-[#0b0f14]",
      ].join(" ")}
    >
      {state.cleared && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center animate-fadeup"
            style={{ backgroundImage: "url('/pictures/image01.png')" }}
          />
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-y-0 left-1/2 w-[520px] -translate-x-1/2 bg-black/45 blur-3xl" />
        </>
      )}
      {/* 手机外壳 390x844 */}
      <div
        className="relative z-10 flex flex-col overflow-hidden rounded-[34px] border border-line bg-panel shadow-2xl"
        style={{ width: 390, height: 844, maxHeight: "100dvh", maxWidth: "100vw" }}
      >
        {/* 顶部状态条 */}
        <header className="shrink-0 border-b border-line bg-panel/90 px-4 pt-3 pb-2 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent animate-flash" />
                <h1 className="text-[15px] font-bold text-gray-100">{level.aiName}</h1>
                <span className="text-[10px] text-gray-500">· {level.title}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-gray-500">
                第 {state.save.rounds + 1} 段记忆 · 它每分钟忘记你一次
              </p>
            </div>
            <Countdown
              timeLeft={state.timeLeft}
              total={level.memorySeconds}
              paused={state.paused}
              pauseUsed={state.pauseUsed}
              onPause={pauseTimer}
            />
          </div>
          <div className="mt-2">
            <TrustMeter
              trust={state.trust}
              baseTrust={state.baseTrust}
              goal={level.trustGoal}
            />
          </div>
        </header>

        {/* 聊天区 */}
        <div
          ref={scrollRef}
          className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-3 py-3"
        >
          {!hydrated && (
            <div className="mt-10 text-center text-[12px] text-gray-600">
              正在唤醒 K-9…
            </div>
          )}
          {state.messages.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}
          {state.thinking && (
            <div className="flex justify-start">
              <div className="mr-2 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ai text-sm border border-line">
                🐾
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-ai px-3.5 py-2.5">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500" />
                </span>
              </div>
            </div>
          )}

          {readyToRelease && !state.cleared && (
            <div className="mt-1 flex justify-center animate-fadeup">
              <span className="rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-[10px] text-accent">
                信任已满 · 门锁正在松动
              </span>
            </div>
          )}
        </div>

        {/* 钥匙架 */}
        <KeyShelf
          allKeys={allKeys}
          ownedKeyIds={state.save.ownedKeyIds}
          onSend={send}
          disabled={state.thinking || state.cleared}
        />

        <PromptChips
          nextLock={nextLock}
          stuckRounds={nextLock ? state.save.stuckRoundsByLockId[nextLock.id] ?? 0 : 0}
          disabled={state.thinking || state.cleared}
          onSend={send}
        />

        {/* 输入栏 */}
        <ChatInput
          onSend={send}
          disabled={state.thinking || state.cleared}
          placeholder={placeholder}
        />

        {/* 记忆清空过场 */}
        {state.justReset && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-panel/80 animate-fadeup">
            <div className="text-center">
              <div className="text-3xl">🧠💨</div>
              <p className="mt-2 text-[12px] text-gray-400">记忆正在消散…</p>
            </div>
          </div>
        )}

        {/* 通关结算 */}
        {state.cleared && (
          <ClearedOverlay rounds={state.save.rounds + 1} onRestart={restart} />
        )}
      </div>
    </div>
  );
}
