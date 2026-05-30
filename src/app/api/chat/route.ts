import { NextResponse } from "next/server";
import { getLevel } from "@/game/levels";
import { getNextLock, getSlotHintLevel, lockIdOfKey, resolveInput } from "@/game/engine";
import type { ChatMessage, ResolveResult } from "@/game/engine";
import type { LevelScript, Lock } from "@/game/types";

export const runtime = "nodejs";

const API_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://qweapi.com/v1";
const API_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4";

interface ChatRequest {
  levelId?: unknown;
  input?: unknown;
  messages?: unknown;
  unlockedLockIds?: unknown;
  ownedKeyIds?: unknown;
  currentTrust?: unknown;
  offTrackCount?: unknown;
  currentLockAttempts?: unknown;
  slotHitIds?: unknown;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is ChatMessage => {
      if (!item || typeof item !== "object") return false;
      const msg = item as Partial<ChatMessage>;
      return (
        typeof msg.id === "string" &&
        typeof msg.text === "string" &&
        (msg.speaker === "ai" || msg.speaker === "me" || msg.speaker === "system")
      );
    })
    .slice(-10);
}

function getEffectiveUnlockedLockIds(
  level: LevelScript,
  unlockedLockIds: string[],
  ownedKeyIds: string[]
): string[] {
  return Array.from(
    new Set([
      ...ownedKeyIds
        .map((keyId) => lockIdOfKey(level, keyId))
        .filter((lockId): lockId is string => Boolean(lockId)),
      ...unlockedLockIds,
    ])
  );
}

function getResultKindLabel(kind: ResolveResult["kind"]): string {
  switch (kind) {
    case "unlock":
      return "玩家刚刚命中当前记忆锁,你要承认这段记忆被唤醒。";
    case "release":
      return "玩家已经满足通关条件,你要温柔地放下执念并告别。";
    case "release_too_early":
      return "玩家过早安抚你,你被触动但还想不起完整真相。";
    case "insight":
      return "玩家说中了真实记忆的一部分。你必须先明确肯定玩家说对了,再补充一个很小的画面碎片;不要否认,不要无视,不要把话题硬拉回去,也不要一次泄露完整后续答案。";
    case "related":
      return "玩家说到了与你有关的方向。你必须给正反馈,承认这句话让你有感觉,再给一个模糊但可追问的线索。";
    case "fallback":
      return "玩家没有命中当前锁,你要给出当前锁的含蓄提示。";
  }
}

function getGuidanceLine(result: ResolveResult): string {
  return result.unlockedLock
    ? "这段记忆已被唤醒。不要在回复末尾额外教学玩家怎么问。"
    : "不要在回复末尾额外教学玩家怎么问;界面已经会显示当前目标。";
}

function getTrustTone(level: LevelScript, currentTrust: number): string {
  const awakenedRatio = Math.min(Math.max(currentTrust, 0), 100);
  const protocolRatio = 100 - awakenedRatio;
  const ratioLine = `人格混合比例: ${level.aiName} 协议约 ${protocolRatio}%, ${level.awakenedName} 人格约 ${awakenedRatio}%。0 是纯协议,100 是纯 ${level.awakenedName}。`;
  const stageIndex = currentTrust < 20 ? 0 : currentTrust < 40 ? 1 : currentTrust < 60 ? 2 : currentTrust < 80 ? 3 : 4;

  return [ratioLine, level.personalityStages[stageIndex]].join("\n");
}

function getAdaptiveHintStage(result: ResolveResult, offTrackCount: number): 0 | 1 | 2 | 3 {
  if (result.kind !== "fallback") return 0;
  const currentOffTrackStreak = offTrackCount + 1;
  if (currentOffTrackStreak >= 5) return 3;
  if (currentOffTrackStreak >= 3) return 2;
  if (currentOffTrackStreak >= 2) return 1;
  return 0;
}

function formatSlotHint(lock: Lock, slotHitIds: string[], attempts: number): string {
  if (!lock.answerPattern || !lock.answerSlots?.length) return "";
  const hintLevel = getSlotHintLevel(attempts);
  const slotLines = lock.answerSlots.map((slot) => {
    const isHit = slotHitIds.includes(slot.id);
    const display = isHit ? slot.answer : slot.placeholders[hintLevel];
    return `${isHit ? "已点亮" : "未点亮"}「${slot.id}」=${display}`;
  });
  const visiblePattern = lock.answerSlots.reduce((pattern, slot) => {
    const isHit = slotHitIds.includes(slot.id);
    const display = isHit ? slot.answer : slot.placeholders[hintLevel];
    return pattern.replace(`{${slot.id}}`, `【${display}】`);
  }, lock.answerPattern);

  return [
    `填空式当前目标:${visiblePattern}`,
    `当前锁累计问答次数:${attempts}`,
    `空格状态:${slotLines.join("；")}`,
  ].join("\n");
}

function buildAdaptiveHintLine(
  level: LevelScript,
  result: ResolveResult,
  unlockedLockIds: string[],
  offTrackCount: number,
  currentLockAttempts: number,
  slotHitIds: string[]
): string {
  const nextLock = getNextLock(level, unlockedLockIds);
  if (!nextLock) {
    return "自适应难度:当前没有待解开的锁,不要额外提示。";
  }

  const hintLevel = getSlotHintLevel(currentLockAttempts);
  const slotHint = formatSlotHint(nextLock, slotHitIds, currentLockAttempts);
  const hasAnySlotHit = slotHitIds.length > 0;
  const scriptHint =
    nextLock.adaptiveHints?.[hintLevel] ??
    nextLock.promptChips[Math.min(hintLevel, 2)] ??
    nextLock.lockedHint;
  const hintStage = Math.max(getAdaptiveHintStage(result, offTrackCount), hintLevel) as
    | 0
    | 1
    | 2
    | 3;
  const stageRule =
    hintStage === 0
      ? "玩家刚开始探索。保持含蓄,但要让回复落在当前空格方向上。"
      : hintStage === 1
      ? "玩家已经尝试多次。保持角色口吻,明确指出当前还缺哪个空格类型。"
      : hintStage === 2
      ? "玩家已经卡住。保持角色口吻,给出更具体的空格形状,让玩家知道要填几个要素。"
      : "玩家已经严重卡住。保持角色口吻,几乎把空格答案放到嘴边,但不要直接宣布解锁。";

  return [
    `自适应难度等级:${hintStage}/3。`,
    stageRule,
    hasAnySlotHit
      ? "玩家已经说中了至少一个空格。回复第一句必须明确肯定被点亮的空格,再引导剩下未点亮的空格。"
      : "如果玩家没说中空格,不要只原地复述,要推进到下一层空格提示。",
    `当前应引导的问题:${nextLock.goalHint}`,
    slotHint,
    `可融入台词的递进提示:${scriptHint}`,
  ].join("\n");
}

function buildSystemPrompt(
  level: LevelScript,
  result: ResolveResult,
  currentTrust: number,
  unlockedLockIds: string[],
  offTrackCount: number,
  currentLockAttempts: number,
  slotHitIds: string[]
): string {
  return [
    level.systemPrompt,
    "这是一个通过对话找回记忆并开门的游戏。",
    `当前临时信任度是 ${currentTrust},本次对话后会变成 ${result.nextTrust},目标是 100。`,
    getTrustTone(level, currentTrust),
    "回复必须短,有角色感,像聊天气泡;不要解释游戏规则,不要列清单,不要透露关键词表。",
    "你可以改写给定剧情回复,但不能改变事实、不能提前泄露后续真相、不能擅自宣布通关。",
    "如果玩家说对了任何一部分,第一句话必须表达肯定,例如『对……』『你说中了什么』『这句话让我想起一点』。",
    "如果玩家没命中,给一点朦胧提示,不要直接说答案。",
    "如果剧情锚点里包含破损音频、字形、音节、方向、颜色、物件等线索,你必须保留这些可推理碎片,不能只回复抽象情绪。",
    buildAdaptiveHintLine(
      level,
      result,
      unlockedLockIds,
      offTrackCount,
      currentLockAttempts,
      slotHitIds
    ),
    getGuidanceLine(result),
    getResultKindLabel(result.kind),
    "下面是本次必须遵守的剧情锚点,请围绕它自然回复:",
    result.reply,
  ].join("\n");
}

function buildLockAnswer(lock: Lock): string {
  return lock.answer;
}

async function judgeSemanticUnlock(
  level: LevelScript,
  input: string,
  unlockedLockIds: string[]
): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return false;

  const nextLock = getNextLock(level, unlockedLockIds);
  if (!nextLock) return false;

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: API_MODEL,
      messages: [
        {
          role: "system",
          content: [
            "你是游戏语义判定器。只判断玩家输入是否已经表达了目标答案的核心含义。",
            "允许同义词、近义词、口语、错别字和不完整但足够明确的表达。",
            "不要要求字面完全一致。",
            "如果玩家只是泛泛提问、只说到很远的相关方向、或信息不足,回答 no。",
            "只输出 yes 或 no,不要输出其他文字。",
          ].join("\n"),
        },
        {
          role: "user",
          content: `目标答案:${buildLockAnswer(nextLock)}\n玩家输入:${input}`,
        },
      ],
      max_tokens: 3,
      temperature: 0,
    }),
  });

  if (!response.ok) return false;

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const verdict = data.choices?.[0]?.message?.content?.trim().toLowerCase() ?? "";

  return verdict.startsWith("yes");
}

function forceSemanticUnlock(
  level: LevelScript,
  input: string,
  unlockedLockIds: string[],
  ownedKeyIds: string[],
  currentTrust?: number
): ResolveResult {
  const nextLock = getNextLock(level, unlockedLockIds);
  const unlockInput = nextLock?.keywords[0] ?? input;
  const result = resolveInput(level, unlockInput, unlockedLockIds, ownedKeyIds, currentTrust);

  return {
    ...result,
    unlockedLock: nextLock,
  };
}

async function generateAiReply(
  level: LevelScript,
  input: string,
  messages: ChatMessage[],
  result: ResolveResult,
  currentTrust: number,
  unlockedLockIds: string[],
  offTrackCount: number,
  currentLockAttempts: number,
  slotHitIds: string[]
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return result.reply;

  const recentMessages = messages.map((message) => ({
    role: message.speaker === "me" ? "user" : "assistant",
    content: message.text,
  }));

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: API_MODEL,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(
            level,
            result,
            currentTrust,
            unlockedLockIds,
            offTrackCount,
            currentLockAttempts,
            slotHitIds
          ),
        },
        ...recentMessages,
        { role: "user", content: input },
      ],
      max_tokens: 260,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`AI request failed: ${response.status} ${details}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  return content || result.reply;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const levelId =
      typeof body.levelId === "number" && Number.isFinite(body.levelId)
        ? body.levelId
        : 1;
    const level = getLevel(levelId);

    if (!level) {
      return NextResponse.json(
        { error: "level_not_found", message: "这扇门暂时还不存在。" },
        { status: 404 }
      );
    }

    const input = typeof body.input === "string" ? body.input : "";
    const unlockedLockIds = asStringArray(body.unlockedLockIds);
    const ownedKeyIds = asStringArray(body.ownedKeyIds);
    const messages = asMessages(body.messages);
    const currentTrust =
      typeof body.currentTrust === "number" && Number.isFinite(body.currentTrust)
        ? body.currentTrust
        : undefined;
    const offTrackCount =
      typeof body.offTrackCount === "number" && Number.isFinite(body.offTrackCount)
        ? Math.max(0, Math.min(12, Math.floor(body.offTrackCount)))
        : 0;
    const currentLockAttempts =
      typeof body.currentLockAttempts === "number" &&
      Number.isFinite(body.currentLockAttempts)
        ? Math.max(0, Math.min(99, Math.floor(body.currentLockAttempts)))
        : 0;
    const slotHitIds = asStringArray(body.slotHitIds);
    const effectiveUnlockedLockIds = getEffectiveUnlockedLockIds(
      level,
      unlockedLockIds,
      ownedKeyIds
    );

    let result = resolveInput(
      level,
      input,
      effectiveUnlockedLockIds,
      ownedKeyIds,
      currentTrust
    );

    if (result.kind !== "unlock") {
      const semanticallyMatchesNextLock = await judgeSemanticUnlock(
        level,
        input,
        effectiveUnlockedLockIds
      );

      if (semanticallyMatchesNextLock) {
        result = forceSemanticUnlock(
          level,
          input,
          effectiveUnlockedLockIds,
          ownedKeyIds,
          currentTrust
        );
      }
    }
    let reply = result.reply;

    try {
      reply = await generateAiReply(
        level,
        input,
        messages,
        result,
        currentTrust ?? 0,
        effectiveUnlockedLockIds,
        offTrackCount,
        currentLockAttempts,
        slotHitIds
      );
    } catch (error) {
      console.error(error);
    }

    return NextResponse.json({
      ...result,
      reply,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "chat_failed", message: "K-9 的语音模块暂时失灵了。" },
      { status: 500 }
    );
  }
}
