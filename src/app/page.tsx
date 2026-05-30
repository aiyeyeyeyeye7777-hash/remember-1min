"use client";

import { useState } from "react";
import { IntroSequence } from "@/components/IntroSequence";
import { LevelSelect } from "@/components/LevelSelect";
import { MainMenu } from "@/components/MainMenu";
import { PhoneGame } from "@/components/PhoneGame";
import { LEVELS } from "@/game/levels";
import type { LevelScript } from "@/game/types";

type Screen = "menu" | "intro" | "levels";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedLevel, setSelectedLevel] = useState<LevelScript | null>(null);

  if (screen === "menu") {
    return <MainMenu onStart={() => setScreen("intro")} />;
  }

  if (screen === "intro") {
    return <IntroSequence onDone={() => setScreen("levels")} />;
  }

  if (!selectedLevel) {
    return <LevelSelect levels={LEVELS} onSelect={setSelectedLevel} />;
  }

  return (
    <PhoneGame
      level={selectedLevel}
      onBackToLevels={() => setSelectedLevel(null)}
    />
  );
}
