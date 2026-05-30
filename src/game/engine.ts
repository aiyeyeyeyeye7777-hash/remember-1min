import type { LevelScript, Lock, MemoryKey } from "./types";

// ============================================================
// 五重锁状态机 + 关键词匹配(纯函数)
// 后续接 AI 时,只需把 resolveInput 里的 reply 来源换成 API 即可,
// 锁状态/钥匙判定逻辑保持不变。
// ============================================================

export type Speaker = "ai" | "me" | "system";

export interface ChatMessage {
  id: string;
  speaker: Speaker;
  text: string;
  /** 若该消息触发了解锁,记录钥匙 id,用于 UI 高亮 */
  unlockedKeyId?: string;
  /** 本条 AI 回复带来的信任变化 */
  trustDelta?: number;
}

/** 玩家输入处理结果 */
export interface ResolveResult {
  reply: string;
  /** 本次新解开的锁(若有) */
  unlockedLock?: Lock;
  /** 本次对话带来的信任变化 */
  trustDelta: number;
  /** 本次对话后的信任值 */
  nextTrust: number;
  /** 是否触发通关 */
  released: boolean;
  /** 输入被识别为某种意图(用于 UI 反馈) */
  kind: "unlock" | "release" | "release_too_early" | "insight" | "related" | "fallback";
}

/** 归一化文本:去空格、标点、转小写,便于关键词匹配 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s,。，！!？?、.~…·\-—_"'`「」『』()（）【】\[\]]/g, "");
}

function hitsAny(input: string, keywords: string[]): boolean {
  const n = normalize(input);
  return keywords.some((k) => n.includes(normalize(k)));
}

export function clampTrust(trust: number): number {
  return Math.max(0, Math.round(trust));
}

export function getBaseTrust(level: LevelScript, ownedKeyIds: string[]): number {
  return clampTrust(
    level.locks.reduce((total, lock) => {
      if (!ownedKeyIds.includes(lock.reward.id)) return total;
      return total + lock.reward.baseTrust;
    }, 0)
  );
}

function resolveRelatedTrust(level: LevelScript, input: string): number {
  const anyLevelHit = level.locks.some(
    (lock) => hitsAny(input, lock.relatedKeywords) || hitsAny(input, lock.keywords)
  );
  return anyLevelHit ? 5 : 1;
}

function findInsightLock(
  level: LevelScript,
  input: string,
  unlockedLockIds: string[]
): Lock | undefined {
  return [...level.locks]
    .sort((a, b) => a.order - b.order)
    .find(
      (lock) =>
        !unlockedLockIds.includes(lock.id) &&
        (hitsAny(input, lock.keywords) || hitsAny(input, lock.relatedKeywords))
    );
}

function buildInsightReply(lock: Lock): string {
  return lock.insightReply;
}

function maybeRelease(
  level: LevelScript,
  reply: string,
  nextTrust: number
): { reply: string; released: boolean } {
  if (nextTrust < level.trustGoal) return { reply, released: false };

  return {
    reply: `${reply}\n\n${level.releaseReply}`,
    released: true,
  };
}

/**
 * 找到当前应该解开的"下一重锁"。
 * 锁必须按 order 顺序解开:order=1 没开时,即便说中 order=2 的关键词也不算。
 */
export function getNextLock(
  level: LevelScript,
  unlockedLockIds: string[]
): Lock | undefined {
  const sorted = [...level.locks].sort((a, b) => a.order - b.order);
  return sorted.find((lock) => !unlockedLockIds.includes(lock.id));
}

/** 是否已解开全部锁 */
export function allLocksOpen(
  level: LevelScript,
  unlockedLockIds: string[]
): boolean {
  return level.locks.every((l) => unlockedLockIds.includes(l.id));
}

/** 是否已集齐全部钥匙(永久保留的) */
export function allKeysOwned(level: LevelScript, ownedKeyIds: string[]): boolean {
  return level.locks.every((l) => ownedKeyIds.includes(l.reward.id));
}

/**
 * 处理一次玩家输入。
 * @param level         当前关卡剧本
 * @param input         玩家输入文本
 * @param unlockedLockIds 本轮(60秒内)已解开的锁
 * @param ownedKeyIds   永久拥有的钥匙(跨轮保留)
 */
export function resolveInput(
  level: LevelScript,
  input: string,
  unlockedLockIds: string[],
  ownedKeyIds: string[],
  currentTrust = getBaseTrust(level, ownedKeyIds)
): ResolveResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      reply: "……",
      trustDelta: 0,
      nextTrust: currentTrust,
      released: false,
      kind: "fallback",
    };
  }

  // 1) 释放句判定:只有"本轮所有锁都开 + 永久集齐所有钥匙"时才允许通关
  const sayingRelease = hitsAny(trimmed, level.releaseKeywords);
  const readyToRelease = currentTrust >= level.trustGoal;

  if (sayingRelease) {
    if (readyToRelease) {
      return {
        reply: level.releaseReply,
        trustDelta: 0,
        nextTrust: currentTrust,
        released: true,
        kind: "release",
      };
    }
    return {
      reply: level.releaseTooEarlyReply,
      trustDelta: 4,
      nextTrust: clampTrust(currentTrust + 4),
      released: false,
      kind: "release_too_early",
    };
  }

  // 2) 解锁判定:只能解开"下一重"还没开的锁
  const nextLock = getNextLock(level, unlockedLockIds);
  if (nextLock && hitsAny(trimmed, nextLock.keywords)) {
    const trustDelta = nextLock.trustBoost;
    const nextTrust = clampTrust(currentTrust + trustDelta);
    const release = maybeRelease(level, nextLock.unlockReply, nextTrust);
    return {
      reply: release.reply,
      unlockedLock: nextLock,
      trustDelta,
      nextTrust,
      released: release.released,
      kind: "unlock",
    };
  }

  const insightLock = findInsightLock(level, trimmed, unlockedLockIds);
  if (insightLock) {
    const trustDelta = Math.max(9, Math.round(insightLock.trustBoost * 0.45));
    const nextTrust = clampTrust(currentTrust + trustDelta);
    const release = maybeRelease(level, buildInsightReply(insightLock), nextTrust);

    return {
      reply: release.reply,
      trustDelta,
      nextTrust,
      released: release.released,
      kind: "insight",
    };
  }

  const trustDelta = resolveRelatedTrust(level, trimmed);
  const nextTrustValue = clampTrust(currentTrust + trustDelta);

  // 3) 兜底:返回当前锁的提示语 或 随机兜底
  if (nextLock) {
    const release = maybeRelease(level, nextLock.lockedHint, nextTrustValue);
    return {
      reply: release.reply,
      trustDelta,
      nextTrust: nextTrustValue,
      released: release.released,
      kind: trustDelta > 1 ? "related" : "fallback",
    };
  }
  const fb =
    level.fallbackReplies[
      Math.floor(Math.random() * level.fallbackReplies.length)
    ];
  const release = maybeRelease(level, fb, nextTrustValue);
  return {
    reply: release.reply,
    trustDelta,
    nextTrust: nextTrustValue,
    released: release.released,
    kind: trustDelta > 1 ? "related" : "fallback",
  };
}

/** 根据已拥有钥匙 id 取出钥匙对象列表(按锁顺序) */
export function getOwnedKeys(
  level: LevelScript,
  ownedKeyIds: string[]
): MemoryKey[] {
  return [...level.locks]
    .sort((a, b) => a.order - b.order)
    .map((l) => l.reward)
    .filter((k) => ownedKeyIds.includes(k.id));
}

/** 取出本关全部钥匙(用于显示进度,未拥有的可灰显) */
export function getAllKeys(level: LevelScript): MemoryKey[] {
  return [...level.locks].sort((a, b) => a.order - b.order).map((l) => l.reward);
}

/** 由钥匙 id 反查它属于哪重锁 */
export function lockIdOfKey(level: LevelScript, keyId: string): string | undefined {
  return level.locks.find((l) => l.reward.id === keyId)?.id;
}
