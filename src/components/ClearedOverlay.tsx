"use client";

// 通关结算弹层:小黑"下班"后的温暖落幕 + 重新开始。
export function ClearedOverlay({
  rounds,
  onRestart,
}: {
  rounds: number;
  onRestart: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-panel/88 px-6 text-center backdrop-blur-[2px] animate-fadeup">
      <div className="text-5xl">✉️</div>
      <h2 className="mt-4 text-lg font-bold text-accent">门开了</h2>
      <div className="mt-4 rounded-2xl border border-accent/35 bg-panelSoft/95 px-5 py-4 text-left shadow-xl">
        <p className="text-[11px] text-gray-500">门后的信纸上，只有一行长大的字：</p>
        <p className="mt-3 text-[16px] font-semibold leading-relaxed text-gray-100">
          小黑，下雨的时候记得进屋。
          <br />
          我已经长大了。
        </p>
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-gray-400">
        门外的灯暗下来。K-9 没有再扫描访客，<br />
        只是很轻地摇了一下尾巴。
      </p>
      <div className="mt-5 rounded-xl border border-line bg-panelSoft px-4 py-2 text-[11px] text-gray-400">
        你陪它经历了 <span className="text-accent font-semibold">{rounds}</span> 次记忆清空，
        <br />
        才在一分钟里唤醒了它。
      </div>
      <button
        type="button"
        onClick={onRestart}
        className="mt-6 rounded-full border border-accent/60 px-5 py-2 text-[13px] font-medium text-accent transition active:scale-95"
      >
        重新开始（清空存档）
      </button>
      <p className="mt-3 text-[10px] text-gray-600">第二关，敬请期待…</p>
    </div>
  );
}
