"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LevelScript } from "./types";
import {
  getNextLock,
  getBaseTrust,
  lockIdOfKey,
  getHitSlotIds,
  type ChatMessage,
} from "./engine";
import { requestChatReply } from "./chatApi";
import { loadSave, writeSave, clearSave, type SaveData } from "./storage";

// ============================================================
// useGame:把状态机 + 倒计时 + localStorage 串起来的核心 hook
// 关键区分:
//   - 永久层(存 localStorage):ownedKeyIds / cleared / rounds
//   - 本轮层(60秒,内存):messages / unlockedLockIds / timeLeft
// 倒计时归零 => 清空本轮层,rounds+1,AI 重新开场(它忘了你),
//             但 ownedKeyIds 保留。
// ============================================================

let msgSeq = 0;
function mkMsg(
  speaker: ChatMessage["speaker"],
  text: string,
  unlockedKeyId?: string,
  trustDelta?: number
): ChatMessage {
  msgSeq += 1;
  return { id: `m${Date.now()}_${msgSeq}`, speaker, text, unlockedKeyId, trustDelta };
}

export interface GameState {
  save: SaveData;
  messages: ChatMessage[];
  /** 本轮已解开的锁 id(不持久化) */
  unlockedLockIds: string[];
  /** 本轮临时信任度,可超过 100,倒计时归零后回到信物基础值 */
  trust: number;
  /** 信物在每轮开场提供的基础信任 */
  baseTrust: number;
  timeLeft: number;
  /** 本回合倒计时是否暂停 */
  paused: boolean;
  /** 本回合是否已经使用过暂停 */
  pauseUsed: boolean;
  /** 本回合倒计时是否已经由玩家第一句话启动 */
  timerStarted: boolean;
  /** AI 正在"思考/打字" */
  thinking: boolean;
  cleared: boolean;
  /** 本轮是否刚刚发生记忆清空(用于播放过场动画) */
  justReset: boolean;
}

export function useGame(level: LevelScript) {
  const [save, setSave] = useState<SaveData>(() => loadSave(level.id));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unlockedLockIds, setUnlockedLockIds] = useState<string[]>([]);
  const [trust, setTrust] = useState<number>(() => getBaseTrust(level, save.ownedKeyIds));
  const [timeLeft, setTimeLeft] = useState<number>(level.memorySeconds);
  const [thinking, setThinking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pauseUsed, setPauseUsed] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [justReset, setJustReset] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const roundEndsAtRef = useRef<number>(Date.now() + level.memorySeconds * 1000);
  const pauseStartedAtRef = useRef<number | null>(null);
  const thinkingPauseStartedAtRef = useRef<number | null>(null);
  const resettingRef = useRef(false);
  const offTrackCountRef = useRef(0);

  const saveRef = useRef(save);
  saveRef.current = save;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const unlockedLockIdsRef = useRef(unlockedLockIds);
  unlockedLockIdsRef.current = unlockedLockIds;
  const trustRef = useRef(trust);
  trustRef.current = trust;
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;
  const clearedRef = useRef(save.cleared);
  clearedRef.current = save.cleared;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const thinkingRef = useRef(thinking);
  thinkingRef.current = thinking;
  const timerStartedRef = useRef(timerStarted);
  timerStartedRef.current = timerStarted;

  function getDisplayedTimeLeft() {
    return Math.max(0, Math.ceil((roundEndsAtRef.current - Date.now()) / 1000));
  }

  function startRoundTimer() {
    if (timerStartedRef.current) return;
    timerStartedRef.current = true;
    setTimerStarted(true);
    roundEndsAtRef.current = Date.now() + timeLeftRef.current * 1000;
  }

  function resumeManualPause() {
    if (pauseStartedAtRef.current === null) return;
    roundEndsAtRef.current += Date.now() - pauseStartedAtRef.current;
    pauseStartedAtRef.current = null;
    pausedRef.current = false;
    setPaused(false);
    setTimeLeft(getDisplayedTimeLeft());
  }

  function beginThinkingPause() {
    if (!timerStartedRef.current || thinkingPauseStartedAtRef.current !== null) {
      return;
    }
    thinkingPauseStartedAtRef.current = Date.now();
  }

  function endThinkingPause() {
    if (thinkingPauseStartedAtRef.current === null) return;
    roundEndsAtRef.current += Date.now() - thinkingPauseStartedAtRef.current;
    thinkingPauseStartedAtRef.current = null;
    setTimeLeft(getDisplayedTimeLeft());
  }

  function getEffectiveUnlockedLockIds(ownedKeyIds: string[], roundLockIds: string[]) {
    return Array.from(
      new Set([
        ...ownedKeyIds
          .map((keyId) => lockIdOfKey(level, keyId))
          .filter((lockId): lockId is string => Boolean(lockId)),
        ...roundLockIds,
      ])
    );
  }

  // 首次挂载:从 localStorage 读取并开场
  useEffect(() => {
    const loaded = loadSave(level.id);
    setSave(loaded);
    setMessages([mkMsg("ai", level.greeting)]);
    setUnlockedLockIds([]);
    setTrust(getBaseTrust(level, loaded.ownedKeyIds));
    setTimeLeft(level.memorySeconds);
    roundEndsAtRef.current = Date.now() + level.memorySeconds * 1000;
    pauseStartedAtRef.current = null;
    thinkingPauseStartedAtRef.current = null;
    offTrackCountRef.current = 0;
    timerStartedRef.current = false;
    setPaused(false);
    setPauseUsed(false);
    setTimerStarted(false);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id]);

  // 记忆清空:重置本轮层,保留钥匙,rounds+1
  const resetMemory = useCallback(() => {
    setJustReset(true);
    setUnlockedLockIds([]);
    setPaused(false);
    setPauseUsed(false);
    setTimerStarted(false);
    timerStartedRef.current = false;
    resettingRef.current = false;
    roundEndsAtRef.current = Date.now() + level.memorySeconds * 1000;
    pauseStartedAtRef.current = null;
    thinkingPauseStartedAtRef.current = null;
    const baseTrust = getBaseTrust(level, saveRef.current.ownedKeyIds);
    setTrust(baseTrust);
    setTimeLeft(level.memorySeconds);

    const prev = saveRef.current;
    const effectiveLockIds = getEffectiveUnlockedLockIds(
      prev.ownedKeyIds,
      unlockedLockIdsRef.current
    );
    const stuckLock = getNextLock(level, effectiveLockIds);
    const nextSave: SaveData = {
      ...prev,
      rounds: prev.rounds + 1,
      stuckRoundsByLockId: stuckLock
        ? {
            ...prev.stuckRoundsByLockId,
            [stuckLock.id]: (prev.stuckRoundsByLockId[stuckLock.id] ?? 0) + 1,
          }
        : prev.stuckRoundsByLockId,
    };
    setSave(nextSave);
    writeSave(nextSave);

    // AI 忘了你:系统提示 + 重新开场白
    setMessages([
      mkMsg(
        "system",
        `—— 滴。记忆缓存已清空。信任度跌回 ${baseTrust}。K-9 不再记得刚才的对话。——`
      ),
      mkMsg("ai", level.greeting),
    ]);

    // 过场动画标记很快关掉
    window.setTimeout(() => setJustReset(false), 900);
  }, [level.greeting, level.memorySeconds]);

  // 倒计时:每秒递减;通关后停止;归零触发记忆清空
  useEffect(() => {
    if (!hydrated) return;
    if (clearedRef.current) return;

    const tick = () => {
      if (
        !timerStartedRef.current ||
        pausedRef.current ||
        thinkingRef.current ||
        thinkingPauseStartedAtRef.current !== null
      ) {
        return;
      }

      const nextTimeLeft = getDisplayedTimeLeft();

      setTimeLeft(nextTimeLeft);

      if (nextTimeLeft <= 0) {
        timerStartedRef.current = false;
        setTimerStarted(false);
        if (resettingRef.current) return;
        resettingRef.current = true;
        window.setTimeout(() => {
          if (!clearedRef.current) resetMemory();
        }, 0);
      }
    };

    tick();
    const t = window.setInterval(tick, 250);

    return () => window.clearInterval(t);
  }, [hydrated, resetMemory, level.memorySeconds]);

  // 发送一条玩家消息并由状态机产出 AI 回复
  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || thinkingRef.current || clearedRef.current) return;

      startRoundTimer();
      resumeManualPause();
      setMessages((m) => [...m, mkMsg("me", text)]);
      thinkingRef.current = true;
      setThinking(true);
      beginThinkingPause();

      const ownedKeyIds = saveRef.current.ownedKeyIds;
      const curLocks = getEffectiveUnlockedLockIds(
        ownedKeyIds,
        unlockedLockIdsRef.current
      );
      const currentLock = getNextLock(level, curLocks);
      const hitSlotIds = currentLock ? getHitSlotIds(currentLock, text) : [];
      const previousSlotHits = currentLock
        ? saveRef.current.slotHitsByLockId[currentLock.id] ?? []
        : [];
      const nextSlotHitIds = Array.from(new Set([...previousSlotHits, ...hitSlotIds]));
      const currentLockAttempts = currentLock
        ? (saveRef.current.attemptsByLockId[currentLock.id] ?? 0) + 1
        : 0;

      if (currentLock) {
        setSave((prev) => {
          const next = {
            ...prev,
            attemptsByLockId: {
              ...prev.attemptsByLockId,
              [currentLock.id]: currentLockAttempts,
            },
            slotHitsByLockId: {
              ...prev.slotHitsByLockId,
              [currentLock.id]: nextSlotHitIds,
            },
          };
          writeSave(next);
          return next;
        });
      }

      requestChatReply({
        levelId: level.id,
        input: text,
        messages: messagesRef.current,
        unlockedLockIds: curLocks,
        ownedKeyIds,
        currentTrust: trustRef.current,
        offTrackCount: offTrackCountRef.current,
        currentLockAttempts,
        slotHitIds: nextSlotHitIds,
      })
        .then((result) => {
          endThinkingPause();
          offTrackCountRef.current =
            result.kind === "fallback" ? offTrackCountRef.current + 1 : 0;
          setTrust(result.nextTrust);
          if (result.unlockedLock) {
            const lock = result.unlockedLock;
            // 加入 AI 解锁回复 + 获得钥匙
            setMessages((m) => [
              ...m,
              mkMsg("ai", result.reply, lock.reward.id, result.trustDelta),
            ]);
            // 持久化新钥匙
            setSave((prev) => {
              if (prev.ownedKeyIds.includes(lock.reward.id)) return prev;
              const next = {
                ...prev,
                ownedKeyIds: [...prev.ownedKeyIds, lock.reward.id],
                attemptsByLockId: {
                  ...prev.attemptsByLockId,
                  [lock.id]: 0,
                },
                stuckRoundsByLockId: {
                  ...prev.stuckRoundsByLockId,
                  [lock.id]: 0,
                },
                slotHitsByLockId: {
                  ...prev.slotHitsByLockId,
                  [lock.id]: [],
                },
              };
              writeSave(next);
              return next;
            });
            setUnlockedLockIds((ids) =>
              ids.includes(lock.id) ? ids : [...ids, lock.id]
            );
          } else {
            setMessages((m) => [...m, mkMsg("ai", result.reply, undefined, result.trustDelta)]);
          }

          if (result.released) {
            setSave((prev) => {
              const next = { ...prev, cleared: true };
              writeSave(next);
              return next;
            });
          }

          thinkingRef.current = false;
          setThinking(false);
        })
        .catch(() => {
          endThinkingPause();
          setMessages((m) => [
            ...m,
            mkMsg("ai", "……信号断了一下。你能再说一遍吗?"),
          ]);
          thinkingRef.current = false;
          setThinking(false);
        });
    },
    []
  );

  // 重新开始(清空存档)
  const restart = useCallback(() => {
    clearSave(level.id);
    const fresh = loadSave(level.id);
    setSave(fresh);
    setMessages([mkMsg("ai", level.greeting)]);
    setUnlockedLockIds([]);
    setTrust(getBaseTrust(level, fresh.ownedKeyIds));
    setTimeLeft(level.memorySeconds);
    roundEndsAtRef.current = Date.now() + level.memorySeconds * 1000;
    pauseStartedAtRef.current = null;
    thinkingPauseStartedAtRef.current = null;
    offTrackCountRef.current = 0;
    timerStartedRef.current = false;
    setThinking(false);
    setPaused(false);
    setPauseUsed(false);
    setTimerStarted(false);
  }, [level.id, level.greeting, level.memorySeconds]);

  const pauseTimer = useCallback(() => {
    if (
      !timerStartedRef.current ||
      pauseUsed ||
      pausedRef.current ||
      thinkingRef.current ||
      saveRef.current.cleared
    ) {
      return;
    }
    pauseStartedAtRef.current = Date.now();
    pausedRef.current = true;
    setPaused(true);
    setPauseUsed(true);
  }, [pauseUsed]);

  const effectiveUnlockedLockIds = getEffectiveUnlockedLockIds(
    save.ownedKeyIds,
    unlockedLockIds
  );
  const nextLock = getNextLock(level, effectiveUnlockedLockIds);
  const baseTrust = getBaseTrust(level, save.ownedKeyIds);

  const state: GameState = {
    save,
    messages,
    unlockedLockIds,
    trust,
    baseTrust,
    timeLeft,
    paused,
    pauseUsed,
    timerStarted,
    thinking,
    cleared: save.cleared,
    justReset,
  };

  return { state, send, restart, pauseTimer, nextLock, hydrated };
}
