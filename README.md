# Remember 1 Minute

A narrative AI game about rebuilding trust with a guardian who forgets you every 60 seconds.

## Run locally

```bash
npm install
npm run dev
```

Create `.env.local` with:

```bash
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://qweapi.com/v1
OPENAI_MODEL=gpt-5.4
```

## Generate image assets

The image generator is server/local only. Keep the key out of browser code:

```bash
IMAGE_API_KEY=...
IMAGE_API_BASE_URL=https://spatialai.vip
IMAGE_API_MODEL=gpt-image-2
```

Generate an asset:

```bash
node scripts/generate-image-asset.mjs \
  --prompt "5 square avatar icons in one horizontal sprite sheet..." \
  --out public/avatars/k9-xiaohei-sprite.png
```
