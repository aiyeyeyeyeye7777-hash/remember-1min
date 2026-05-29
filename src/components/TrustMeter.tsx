"use client";

export function TrustMeter({
  trust,
  baseTrust,
  goal,
}: {
  trust: number;
  baseTrust: number;
  goal: number;
}) {
  const fill = Math.min((trust / goal) * 100, 100);
  const over = Math.max(trust - goal, 0);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-medium tracking-wide text-gray-400">
          临时信任
        </span>
        <span className={trust >= goal ? "text-[11px] font-bold text-accent" : "text-[10px] text-gray-400"}>
          {trust}/{goal}
          {over > 0 ? ` 爆表 +${over}` : ""}
        </span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-line">
        {baseTrust > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-rain/35"
            style={{ width: `${Math.min((baseTrust / goal) * 100, 100)}%` }}
          />
        )}
        <div
          className={[
            "absolute inset-y-0 left-0 transition-all duration-500",
            trust >= goal ? "bg-accent animate-keyglow" : "bg-gradient-to-r from-accentSoft to-accent",
          ].join(" ")}
          style={{ width: `${fill}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[9px] text-gray-600">
        <span>信物基础 {baseTrust}</span>
        <span>60 秒后跌回基础值</span>
      </div>
    </div>
  );
}
