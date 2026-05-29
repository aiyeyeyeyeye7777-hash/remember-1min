// ============================================================
// localStorage 持久化(只存"跨轮需要保留"的进度)
// 60 秒清空的是聊天与本轮锁状态,不在这里持久化;
// 这里只持久化:已永久拥有的钥匙、是否通关。
// ============================================================

export interface SaveData {
  levelId: number;
  /** 永久拥有的钥匙 id(跨 60 秒轮次保留) */
  ownedKeyIds: string[];
  /** 是否已通关该关 */
  cleared: boolean;
  /** 总共经历了多少轮记忆清空(用于剧情/统计) */
  rounds: number;
  /** 每个锁尚未解开时经历了多少次记忆清空,用于递进提示 */
  stuckRoundsByLockId: Record<string, number>;
  updatedAt: number;
}

const KEY_PREFIX = "remember1min:save:";

export function storageKey(levelId: number): string {
  return `${KEY_PREFIX}${levelId}`;
}

export function loadSave(levelId: number): SaveData {
  const fallback: SaveData = {
    levelId,
    ownedKeyIds: [],
    cleared: false,
    rounds: 0,
    stuckRoundsByLockId: {},
    updatedAt: Date.now(),
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(levelId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      levelId,
      ownedKeyIds: Array.isArray(parsed.ownedKeyIds) ? parsed.ownedKeyIds : [],
      cleared: Boolean(parsed.cleared),
      rounds: typeof parsed.rounds === "number" ? parsed.rounds : 0,
      stuckRoundsByLockId:
        parsed.stuckRoundsByLockId &&
        typeof parsed.stuckRoundsByLockId === "object" &&
        !Array.isArray(parsed.stuckRoundsByLockId)
          ? Object.fromEntries(
              Object.entries(parsed.stuckRoundsByLockId).filter(
                ([, value]) => typeof value === "number"
              )
            )
          : {},
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return fallback;
  }
}

export function writeSave(data: SaveData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(data.levelId),
      JSON.stringify({ ...data, updatedAt: Date.now() })
    );
  } catch {
    // localStorage 不可用时静默失败,不影响当前会话游玩
  }
}

export function clearSave(levelId: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(levelId));
  } catch {
    /* noop */
  }
}
