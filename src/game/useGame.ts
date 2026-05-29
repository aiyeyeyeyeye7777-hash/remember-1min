"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LevelScript } from "./types";
import {
  getNextLock,
  getBaseTrust,
  lockIdOfKey,
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
  const [justReset, setJustReset] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const saveRef = useRef(save);
  saveRef.current = save;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const unlockedLockIdsRef = useRef(unlockedLockIds);
  unlockedLockIdsRef.current = unlockedLockIds;
  const trustRef = useRef(trust);
  trustRef.current = trust;
  const clearedRef = useRef(save.cleared);
  clearedRef.current = save.cleared;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

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
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id]);

  // 记忆清空:重置本轮层,保留钥匙,rounds+1
  const resetMemory = useCallback(() => {
    setJustReset(true);
    setUnlockedLockIds([]);
    setPaused(false);
    setPauseUsed(false);
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

    const t = window.setInterval(() => {
      if (pausedRef.current) return;

      setTimeLeft((prev) => {
        if (prev <= 1) {
          // 放到下一帧执行 reset,避免在 setState 里再 setState
          window.setTimeout(() => {
            if (!clearedRef.current) resetMemory();
          }, 0);
          return level.memorySeconds; // 视觉上立即回满
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(t);
  }, [hydrated, resetMemory, level.memorySeconds]);

  // 发送一条玩家消息并由状态机产出 AI 回复
  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || thinking || clearedRef.current) return;

      if (pausedRef.current) setPaused(false);
      setMessages((m) => [...m, mkMsg("me", text)]);
      setThinking(true);

      const ownedKeyIds = saveRef.current.ownedKeyIds;
      const curLocks = getEffectiveUnlockedLockIds(
        ownedKeyIds,
        unlockedLockIdsRef.current
      );

      requestChatReply({
        input: text,
        messages: messagesRef.current,
        unlockedLockIds: curLocks,
        ownedKeyIds,
        currentTrust: trustRef.current,
      })
        .then((result) => {
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
                stuckRoundsByLockId: {
                  ...prev.stuckRoundsByLockId,
                  [lock.id]: 0,
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

          setThinking(false);
        })
        .catch(() => {
          setMessages((m) => [
            ...m,
            mkMsg("ai", "……信号断了一下。你能再说一遍吗?"),
          ]);
          setThinking(false);
        });
    },
    [thinking]
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
    setThinking(false);
    setPaused(false);
    setPauseUsed(false);
  }, [level.id, level.greeting, level.memorySeconds]);

  const pauseTimer = useCallback(() => {
    if (pauseUsed || paused || thinking || saveRef.current.cleared) return;
    setPaused(true);
    setPauseUsed(true);
  }, [pauseUsed, paused, thinking]);

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
    thinking,
    cleared: save.cleared,
    justReset,
  };

  return { state, send, restart, pauseTimer, nextLock, hydrated };
}
