"use client";

// 60 秒倒计时环 + 数字。最后 10 秒变红闪烁,提示玩家"记忆即将清空"。
export function Countdown({
  timeLeft,
  total,
  paused,
  pauseUsed,
  onPause,
}: {
  timeLeft: number;
  total: number;
  paused: boolean;
  pauseUsed: boolean;
  onPause: () => void;
}) {
  const ratio = Math.max(0, Math.min(1, timeLeft / total));
  const R = 16;
  const C = 2 * Math.PI * R;
  const danger = timeLeft <= 10;
  const canPause = !paused && !pauseUsed;

  return (
    <button
      type="button"
      aria-label="暂停倒计时"
      onClick={onPause}
      disabled={!canPause}
      className="flex items-center gap-2 rounded-xl text-left transition active:scale-95 disabled:cursor-default"
      title={paused ? "已暂停，输入后继续" : pauseUsed ? "本轮暂停已用" : "点击暂停本轮倒计时"}
    >
      <div className="relative h-10 w-10">
        <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90">
          <circle cx="20" cy="20" r={R} fill="none" stroke="#232a33" strokeWidth="4" />
          <circle
            cx="20"
            cy="20"
            r={R}
            fill="none"
            stroke={paused ? "#ffd23f" : danger ? "#e5484d" : "#f5a623"}
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
          {paused ? "停" : timeLeft}
        </div>
      </div>
      <div className="leading-tight">
        <div className="text-[10px] text-gray-400">记忆剩余</div>
        <div className={`text-xs font-medium ${paused ? "text-rain" : danger ? "text-danger" : "text-gray-200"}`}>
          {paused ? "思考中" : danger ? "即将遗忘…" : pauseUsed ? "暂停已用" : "点击暂停"}
        </div>
      </div>
    </button>
  );
}
