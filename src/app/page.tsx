"use client";

import { useState } from "react";
import { LevelSelect } from "@/components/LevelSelect";
import { PhoneGame } from "@/components/PhoneGame";
import { LEVELS } from "@/game/levels";
import type { LevelScript } from "@/game/types";

export default function Home() {
  const [selectedLevel, setSelectedLevel] = useState<LevelScript | null>(null);

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
