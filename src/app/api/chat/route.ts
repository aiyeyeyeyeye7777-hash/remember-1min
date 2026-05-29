import { NextResponse } from "next/server";
import { LEVEL_1 } from "@/game/level1";
import { getNextLock, lockIdOfKey, resolveInput } from "@/game/engine";
import type { ChatMessage, ResolveResult } from "@/game/engine";
import type { LevelScript, Lock } from "@/game/types";

export const runtime = "nodejs";

const API_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://qweapi.com/v1";
const API_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4";

interface ChatRequest {
  input?: unknown;
  messages?: unknown;
  unlockedLockIds?: unknown;
  ownedKeyIds?: unknown;
  currentTrust?: unknown;
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

function getTrustTone(currentTrust: number): string {
  const xiaoheiRatio = Math.min(Math.max(currentTrust, 0), 100);
  const machineRatio = 100 - xiaoheiRatio;
  const ratioLine = `人格混合比例: K-9 机器协议约 ${machineRatio}%, 小黑人格约 ${xiaoheiRatio}%。0 是纯机器人,100 是纯小黑。`;

  if (currentTrust < 20) {
    return [
      ratioLine,
      "人格显现 0-20: K-9 门禁协议占主导,小黑几乎没有醒来。",
      "你主要像设备说话: 未识别访客、访问无效、记录缺失、异常日志。",
      "不要主动自称小黑,不要明显像狗撒娇。",
      "如果被触动,只能把心跳、气味、温度当作系统异常来描述。",
    ].join("\n");
  }

  if (currentTrust < 40) {
    return [
      ratioLine,
      "人格显现 20-40: K-9 外壳裂开,小黑的本能开始漏出来。",
      "仍然警惕,但会困惑地发现自己有尾巴、耳朵、鼻子、心跳。",
      "可以出现短暂的狗的反应,例如想后退、想嗅一嗅、尾巴动了一下,但你自己也不理解。",
      "说话仍有门禁系统残留,像机器和小狗抢同一个身体。",
    ].join("\n");
  }

  if (currentTrust < 60) {
    return [
      ratioLine,
      "人格显现 40-60: 小黑开始通过狗的感官理解世界。",
      "你会更多用嗅觉、听觉、爪子、尾巴、耳朵来描述记忆。",
      "对玩家有试探性的亲近,像想靠近又不确定能不能靠近的小狗。",
      "可以短暂忘记自己是门禁,但一碰到痛处又会缩回 K-9。",
    ].join("\n");
  }

  if (currentTrust < 80) {
    return [
      ratioLine,
      "人格显现 60-80: 小黑人格占主导,K-9 只剩少量保护本能。",
      "你开始像一只认得人的狗: 会想靠近、蹭手、听脚步、分辨熟悉的气味。",
      "你会把玩家当作能陪你找回她的人,情绪更直接。",
      "仍然害怕那天的车灯和雨声,但不再只是系统提示。",
    ].join("\n");
  }

  return [
    ratioLine,
    "人格显现 80-100+: 小黑几乎完全醒来。",
    "你像一只终于认出熟人的小狗: 亲近、脆弱、信任,会主动把门和守护交给玩家。",
    "可以自称小黑,可以出现很轻的犬类动作,例如尾巴摇、耳朵垂下、把头靠近手心。",
    "如果信任超过 100 或已 released,你应该像小黑终于放下守门任务,有释然和开门的感觉。",
  ].join("\n");
}

function buildSystemPrompt(result: ResolveResult, currentTrust: number): string {
  return [
    "你是中文叙事解谜游戏里的旧宅门禁 K-9,真实身份是一只名叫小黑的狗。",
    "你每 60 秒会忘记刚才的对话。你正在被玩家一步步唤回记忆。",
    `当前临时信任度是 ${currentTrust},本次对话后会变成 ${result.nextTrust},目标是 100。`,
    getTrustTone(currentTrust),
    "信任度越高,K-9 协议越弱,小黑的感官、动作、依恋和记忆越明显;但不要主动说出还没被唤醒的后续关键答案。",
    "回复必须短,有角色感,像聊天气泡;不要解释游戏规则,不要列清单,不要透露关键词表。",
    "你可以改写给定剧情回复,但不能改变事实、不能提前泄露后续真相、不能擅自宣布通关。",
    "如果玩家说对了任何一部分,第一句话必须表达肯定,例如『对……』『你说中了什么』『这句话让我想起一点』。",
    "如果玩家没命中,给一点朦胧提示,不要直接说答案。",
    getGuidanceLine(result),
    getResultKindLabel(result.kind),
    "下面是本次必须遵守的剧情锚点,请围绕它自然回复:",
    result.reply,
  ].join("\n");
}

function buildLockAnswer(lock: Lock): string {
  switch (lock.id) {
    case "lock_identity":
      return "K-9 不是普通机器或门禁,它是活物,外壳下面有心跳。";
    case "lock_name":
      return "K-9 的名字是小黑。";
    case "lock_like":
      return "小黑喜欢烤红薯/烤地瓜/烤番薯焦掉的边、焦皮、外皮。";
    case "lock_bond":
      return "小黑的小主人是穿黄色雨衣的小女孩。";
    case "lock_truth":
      return "雨夜发生车祸/失控车辆冲来,小黑为了保护小主人冲过去挡车或把她推回安全处。";
    default:
      return lock.reward.subtitle;
  }
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
  input: string,
  messages: ChatMessage[],
  result: ResolveResult,
  currentTrust: number
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
        { role: "system", content: buildSystemPrompt(result, currentTrust) },
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
    const input = typeof body.input === "string" ? body.input : "";
    const unlockedLockIds = asStringArray(body.unlockedLockIds);
    const ownedKeyIds = asStringArray(body.ownedKeyIds);
    const messages = asMessages(body.messages);
    const currentTrust =
      typeof body.currentTrust === "number" && Number.isFinite(body.currentTrust)
        ? body.currentTrust
        : undefined;
    const effectiveUnlockedLockIds = getEffectiveUnlockedLockIds(
      LEVEL_1,
      unlockedLockIds,
      ownedKeyIds
    );

    let result = resolveInput(
      LEVEL_1,
      input,
      effectiveUnlockedLockIds,
      ownedKeyIds,
      currentTrust
    );

    if (result.kind !== "unlock") {
      const semanticallyMatchesNextLock = await judgeSemanticUnlock(
        LEVEL_1,
        input,
        effectiveUnlockedLockIds
      );

      if (semanticallyMatchesNextLock) {
        result = forceSemanticUnlock(
          LEVEL_1,
          input,
          effectiveUnlockedLockIds,
          ownedKeyIds,
          currentTrust
        );
      }
    }
    let reply = result.reply;

    try {
      reply = await generateAiReply(input, messages, result, currentTrust ?? 0);
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
