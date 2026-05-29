"use client";

import type { MemoryKey } from "@/game/types";

// 记忆信物卡片横向滚动条。
// 已拥有:亮色,可点击 -> 自动发送 autoSend 句子,并在下一轮提供基础信任。
// 未拥有:灰显占位,显示"???",提示还有哪些关系锚点没拿到。
export function KeyShelf({
  allKeys,
  ownedKeyIds,
  onSend,
  disabled,
}: {
  allKeys: MemoryKey[];
  ownedKeyIds: string[];
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="border-t border-line bg-panelSoft/60 px-3 pt-2 pb-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium tracking-wide text-gray-400">
          记忆信物 · 下一轮提供基础信任
        </span>
        <span className="text-[10px] text-accent">
          {ownedKeyIds.length}/{allKeys.length}
        </span>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {allKeys.map((k) => {
          const owned = ownedKeyIds.includes(k.id);
          return (
            <button
              key={k.id}
              type="button"
              disabled={!owned || disabled}
              onClick={() => owned && onSend(k.autoSend)}
              className={[
                "flex w-[118px] shrink-0 flex-col rounded-xl border px-2.5 py-2 text-left transition active:scale-[0.97]",
                owned
                  ? "border-accent/60 bg-gradient-to-b from-accent/15 to-panel text-gray-100 hover:border-accent"
                  : "border-line bg-panel/60 text-gray-600 cursor-not-allowed",
                disabled && owned ? "opacity-50" : "",
              ].join(" ")}
            >
              <span className="text-lg leading-none">{owned ? k.emoji : "🔒"}</span>
              <span className="mt-1 text-[11px] font-semibold leading-tight">
                {owned ? k.title : "未知信物"}
              </span>
              <span className="mt-0.5 text-[10px] leading-tight opacity-80">
                {owned ? `${k.subtitle} · +${k.baseTrust}` : "??? ?????"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
