"use client";

import { useEffect, useState } from "react";
import { PhoneShell } from "./PhoneShell";

const SLIDE_MS = 5400;
const FADE_MS = 1250;

const introSlides = [
  {
    year: "2100 年",
    title: "全场景智能时代",
    text: "万物都在感知，也都在记录。",
  },
  {
    title: "记忆网络",
    text: "数据不再是孤岛，世界记住了无数瞬间。",
  },
  {
    year: "2500 年",
    title: "文明沉入废墟",
    text: "机器损坏，城市停摆，记忆开始断裂。",
  },
  {
    title: "守门人诞生",
    text: "残存数据与未完成的执念，附着在机器上，与一扇扇门一同苏醒。",
    extraMs: 1000,
  },
  {
    title: "一分钟的记忆",
    text: "它们记得最深的执念，却记不住刚刚与你说过的话。",
    extraMs: 1000,
  },
  {
    year: "3026 年",
    title: "记忆拾荒者",
    text: "解开守门人的执念，拼出旧世界崩塌前的真相。",
  },
];

type Phase = "enter" | "visible" | "dissolve";

export function IntroSequence({ onDone }: { onDone: () => void }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("enter");
  const slide = introSlides[slideIndex];
  const slideMs = SLIDE_MS + (slide.extraMs ?? 0);

  useEffect(() => {
    setPhase("enter");

    const showTimer = window.setTimeout(() => setPhase("visible"), 80);
    const dissolveTimer = window.setTimeout(() => {
      if (slideIndex < introSlides.length - 1) {
        setPhase("dissolve");
      }
    }, slideMs - FADE_MS);
    const nextTimer = window.setTimeout(() => {
      if (slideIndex >= introSlides.length - 1) {
        onDone();
        return;
      }

      setSlideIndex((current) => current + 1);
    }, slideMs);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(dissolveTimer);
      window.clearTimeout(nextTimer);
    };
  }, [onDone, slideIndex, slideMs]);

  return (
    <PhoneShell>
      <section className="relative isolate h-full w-full overflow-hidden rounded-[32px] bg-black">
        {introSlides.map((_, index) => {
          const isCurrentSlide = index === slideIndex;
          const alreadyDissolved = index < slideIndex;
          const shouldDissolve = isCurrentSlide && phase === "dissolve";
          const shouldEnter =
            slideIndex === 0 && isCurrentSlide && phase === "enter";

          return (
            <div
              key={`image-${index}`}
              className="absolute inset-0 bg-cover bg-center transition-all ease-in-out"
              style={{
                backgroundImage: `url('/pictures/intro-${index + 1}.png')`,
                opacity: alreadyDissolved || shouldDissolve || shouldEnter ? 0 : 1,
                transform:
                  alreadyDissolved || shouldDissolve
                    ? "scale(1.012)"
                    : shouldEnter
                    ? "scale(1.018)"
                    : "scale(1)",
                filter: shouldEnter ? "blur(2px)" : "blur(0)",
                transitionDuration: `${FADE_MS}ms`,
                zIndex: introSlides.length - index,
              }}
            />
          );
        })}
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/5 via-transparent to-black" />

        <div
          key={`copy-${slideIndex}`}
          className={[
            "absolute inset-x-0 bottom-0 z-30 border-t border-accent/20 bg-black/92 px-6 pb-9 pt-7 transition-all ease-in-out",
            phase === "enter" && "translate-y-4 opacity-0",
            phase === "visible" && "translate-y-0 opacity-100",
            phase === "dissolve" && "translate-y-2 opacity-0",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ transitionDuration: `${FADE_MS}ms` }}
        >
          <div className="terminal-title text-[11px] font-semibold tracking-[0.32em] text-accent">
            {slide.year ?? "····"}
          </div>
          <h2 className="terminal-title mt-2 text-[22px] font-black tracking-[0.06em] text-white">
            {slide.title}
          </h2>
          <p className="mt-3 text-[15px] font-semibold leading-7 text-white/88">
            {slide.text}
          </p>
          <div className="mt-5 flex items-center gap-1.5">
            {introSlides.map((_, index) => (
              <span
                key={index}
                className={[
                  "h-1.5 flex-1 rounded-full transition-colors",
                  index <= slideIndex ? "bg-accent" : "bg-white/18",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      </section>
    </PhoneShell>
  );
}
