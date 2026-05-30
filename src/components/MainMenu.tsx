"use client";

import { PhoneShell } from "./PhoneShell";

export function MainMenu({ onStart }: { onStart: () => void }) {
  return (
    <PhoneShell>
      <section className="relative h-full w-full overflow-hidden bg-[#05070a]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/pictures/home-main.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/8 via-transparent to-black/42" />
        <div className="absolute inset-x-0 top-0 px-2 pt-8 text-center">
          <img
            src="/pictures/home-title.png"
            alt="我只能记住你一分钟"
            className="mx-auto w-full max-w-[370px] drop-shadow-[0_0_28px_rgba(245,166,35,0.28)]"
          />
          <p className="-mt-4 text-[12px] leading-relaxed text-gray-300/75">
            在废墟的门前，唤醒一分钟的灵魂。
          </p>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="absolute bottom-[82px] left-1/2 w-[315px] max-w-[84%] -translate-x-1/2 transition hover:scale-[1.02] active:scale-[0.97]"
          aria-label="开始游戏"
        >
          <img
            src="/pictures/start-button.png"
            alt="开始游戏"
            className="h-auto w-full drop-shadow-[0_0_24px_rgba(245,166,35,0.48)]"
          />
        </button>

        <div className="pointer-events-none absolute bottom-8 left-0 right-0 text-center">
          <p className="terminal-title text-[10px] tracking-[0.22em] text-accent/70">
            TAP TO ENTER THE RUINS
          </p>
        </div>
      </section>
    </PhoneShell>
  );
}
