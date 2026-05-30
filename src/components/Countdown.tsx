"use client";

// 60 秒倒计时环 + 数字。最后 10 秒变红闪烁,提示玩家"记忆即将清空"。
export function Countdown({
  timeLeft,
  total,
  paused,
  pauseUsed,
  timerStarted,
  thinking,
  onPause,
}: {
  timeLeft: number;
  total: number;
  paused: boolean;
  pauseUsed: boolean;
  timerStarted: boolean;
  thinking: boolean;
  onPause: () => void;
}) {
  const ratio = Math.max(0, Math.min(1, timeLeft / total));
  const R = 16;
  const C = 2 * Math.PI * R;
  const danger = timerStarted && timeLeft <= 10;
  const canPause = timerStarted && !thinking && !paused && !pauseUsed;
  const mainText = !timerStarted ? "待" : paused ? "停" : timeLeft;
  const statusText = !timerStarted
    ? "发问后计时"
    : thinking
    ? "AI 思考暂停"
    : paused
    ? "已暂停"
    : danger
    ? "即将遗忘…"
    : pauseUsed
    ? "暂停已用"
    : "点击/按 ~ 暂停";

  return (
    <button
      type="button"
      aria-label="暂停倒计时"
      onClick={onPause}
      disabled={!canPause}
      className="flex items-center gap-2 rounded-xl text-left transition active:scale-95 disabled:cursor-default"
      title={
        !timerStarted
          ? "发出第一句话后开始倒计时"
          : thinking
          ? "AI 思考时倒计时会暂停"
          : paused
          ? "已暂停，输入后继续"
          : pauseUsed
          ? "本轮暂停已用"
          : "点击或按 ~ 暂停本轮倒计时"
      }
    >
      <div className="relative h-10 w-10">
        <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90">
          <circle cx="20" cy="20" r={R} fill="none" stroke="#232a33" strokeWidth="4" />
          <circle
            cx="20"
            cy="20"
            r={R}
            fill="none"
            stroke={!timerStarted || thinking ? "#6b7280" : paused ? "#ffd23f" : danger ? "#e5484d" : "#f5a623"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - ratio)}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
          />
        </svg>
        <div
          className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
            paused ? "text-rain" : danger ? "text-danger animate-flash" : "text-accent"
          }`}
        >
          {mainText}
        </div>
      </div>
      <div className="leading-tight">
        <div className="text-[10px] text-gray-400">记忆剩余</div>
        <div className={`text-xs font-medium ${paused ? "text-rain" : danger ? "text-danger" : "text-gray-200"}`}>
          {statusText}
        </div>
      </div>
    </button>
  );
}
