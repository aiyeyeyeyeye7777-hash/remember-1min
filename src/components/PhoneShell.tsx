"use client";

import { ReactNode, useEffect, useState } from "react";

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;

export function PhoneShell({
  children,
  cleared = false,
  backgroundImage,
}: {
  children: ReactNode;
  cleared?: boolean;
  backgroundImage?: string;
}) {
  const [phoneScale, setPhoneScale] = useState(1);

  useEffect(() => {
    function updatePhoneScale() {
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const horizontalPadding = viewportWidth < 480 ? 16 : 32;
      const verticalPadding = viewportHeight < 720 ? 8 : 24;
      const nextScale = Math.min(
        (viewportWidth - horizontalPadding) / PHONE_WIDTH,
        (viewportHeight - verticalPadding) / PHONE_HEIGHT,
        1
      );

      setPhoneScale(Math.max(0.5, nextScale));
    }

    updatePhoneScale();
    window.addEventListener("resize", updatePhoneScale);
    window.visualViewport?.addEventListener("resize", updatePhoneScale);
    window.visualViewport?.addEventListener("scroll", updatePhoneScale);

    return () => {
      window.removeEventListener("resize", updatePhoneScale);
      window.visualViewport?.removeEventListener("resize", updatePhoneScale);
      window.visualViewport?.removeEventListener("scroll", updatePhoneScale);
    };
  }, []);

  return (
    <main
      className={[
        "relative flex h-dvh w-screen items-center justify-center overflow-hidden px-2 py-2 sm:px-4 sm:py-3",
        cleared ? "bg-[#05070a]" : "bg-gradient-to-b from-[#05070a] to-[#0b0f14]",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,rgba(245,166,35,0.16),rgba(245,166,35,0.055)_30%,transparent_58%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[92dvh] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-18dvh] h-[42dvh] w-[76vw] max-w-[680px] rounded-full bg-rain/10 blur-3xl" />

      {backgroundImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center animate-fadeup"
            style={{ backgroundImage }}
          />
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-y-0 left-1/2 w-[520px] -translate-x-1/2 bg-black/45 blur-3xl" />
        </>
      )}

      <div
        className="relative z-10"
        style={{
          width: PHONE_WIDTH * phoneScale,
          height: PHONE_HEIGHT * phoneScale,
        }}
      >
        <div
          className="flex flex-col overflow-hidden rounded-[34px] border border-accent/20 bg-panel shadow-[0_0_70px_rgba(245,166,35,0.22),0_28px_80px_rgba(0,0,0,0.7)]"
          style={{
            width: PHONE_WIDTH,
            height: PHONE_HEIGHT,
            transform: `scale(${phoneScale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
