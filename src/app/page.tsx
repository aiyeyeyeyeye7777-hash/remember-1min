import { PhoneGame } from "@/components/PhoneGame";
import { LEVEL_1 } from "@/game/level1";

export default function Home() {
  return <PhoneGame level={LEVEL_1} />;
}
