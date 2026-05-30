// ============================================================
// 游戏核心类型定义
// 设计原则:剧本与玩法解耦,后续可把 reply 生成替换为 AI API。
// ============================================================

/** 一把记忆钥匙:玩家在某一轮对话中获得后永久保留 */
export interface MemoryKey {
  id: string;
  /** 钥匙卡片上显示的标题,例如「真实身份」 */
  title: string;
  /** 卡片副标题/内容,例如「它其实是一只狗」 */
  subtitle: string;
  /** 点击钥匙卡片时自动发送到聊天框的句子 */
  autoSend: string;
  /** 下一轮开始时提供的基础信任值 */
  baseTrust: number;
  emoji: string;
}

/** 一重锁:需要玩家说出关键词才能解开,解开后获得对应钥匙 */
export interface Lock {
  id: string;
  /** 锁的层级,1 为最外层 */
  order: number;
  /** 锁住时,AI 的态度/提示语(用于引导玩家) */
  lockedHint: string;
  /** 玩家当前要探索的问题方向 */
  goalHint: string;
  /** 可展示给玩家的三层递进提示: 初始 / 卡 3 轮 / 卡 7 轮 */
  promptChips: [string, string, string];
  /** 触发解锁的关键词数组,命中任意一个即可解锁 */
  keywords: string[];
  /** 当前锁的核心语义答案,用于 AI 语义判定 */
  answer: string;
  /** 与当前记忆方向相关但还不足以解锁的词,命中后小幅增加信任 */
  relatedKeywords: string[];
  /** 玩家说中一部分但还不足以解锁时的正反馈 */
  insightReply: string;
  /** 命中关键信息时增加的信任值,可让信任度冲破 100 */
  trustBoost: number;
  /** 解锁瞬间 AI 的回复 */
  unlockReply: string;
  /** 解锁后获得的钥匙 */
  reward: MemoryKey;
}

export interface LevelEnding {
  title: string;
  storyTitle: string;
  letterLabel: string;
  letterLines: string[];
  narration: string;
  fullStory: string[];
}

/** 一关完整剧本 */
export interface LevelScript {
  id: number;
  title: string;
  aiName: string;
  awakenedName: string;
  avatarSet: string;
  avatarAlt: string;
  /** 给大模型的本关世界观/角色设定,不直接展示给玩家 */
  systemPrompt: string;
  /** 信任度从 0→100 的五段人格变化提示 */
  personalityStages: [string, string, string, string, string];
  /** 进入新一轮(记忆被清空)时 AI 的开场白 */
  greeting: string;
  /** 玩家说了无法识别的话时,AI 的兜底回复(可多条随机) */
  fallbackReplies: string[];
  /** 五重锁,按 order 排列 */
  locks: Lock[];
  /** 释放句关键词:集齐所有钥匙且全部锁解开后,命中即可通关 */
  releaseKeywords: string[];
  /** 通关时 AI 的最终回复 */
  releaseReply: string;
  /** 还没集齐钥匙时,玩家提前说释放句,AI 的回应 */
  releaseTooEarlyReply: string;
  /** 通关后门内展示的文本 */
  ending: LevelEnding;
  /** 每轮记忆时长(秒) */
  memorySeconds: number;
  /** 本关信任度目标,达到即可通关 */
  trustGoal: number;
}
