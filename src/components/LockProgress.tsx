"use client";

// 五重锁进度条:已解开的锁亮起,下一重待解的锁微微闪烁。
export function LockProgress({
  total,
  unlockedCount,
}: {
  total: number;
  unlockedCount: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const opened = i < unlockedCount;
        const isNext = i === unlockedCount;
        return (
          <div
            key={i}
            className={[
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              opened ? "bg-accent" : isNext ? "bg-accentSoft animate-flash" : "bg-line",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}
