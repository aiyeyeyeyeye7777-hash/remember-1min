"use client";

function getAvatarStage(trust: number): number {
  if (trust < 20) return 1;
  if (trust < 40) return 2;
  if (trust < 60) return 3;
  if (trust < 80) return 4;
  return 5;
}

export function GuardianAvatar({
  trust,
  avatarSet,
  alt = "guardian avatar",
  size = 36,
}: {
  trust: number;
  avatarSet: string;
  alt?: string;
  size?: number;
}) {
  const stage = getAvatarStage(trust);

  return (
    <div
      className="shrink-0 overflow-hidden rounded-full border border-line bg-ai bg-cover bg-center shadow-sm"
      style={{
        width: size,
        height: size,
        backgroundImage: `url('/avatars/${avatarSet}/${stage}.png')`,
        imageRendering: "pixelated",
      }}
      aria-label={alt}
    />
  );
}
