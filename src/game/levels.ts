import type { LevelScript } from "./types";
import { LEVEL_1 } from "./level1";
import { LEVEL_2 } from "./level2";

export const LEVELS: LevelScript[] = [LEVEL_1, LEVEL_2];

export function getLevel(id: number): LevelScript | undefined {
  return LEVELS.find((level) => level.id === id);
}
