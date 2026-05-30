import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

await loadDotEnvLocal();

const args = parseArgs(process.argv.slice(2));
const apiKey = process.env.IMAGE_API_KEY;
const baseUrl = (process.env.IMAGE_API_BASE_URL ?? "https://spatialai.vip").replace(/\/$/, "");
const model = args.model ?? process.env.IMAGE_API_MODEL ?? "gpt-image-2";
const prompt = args.prompt;
const out = args.out;
const size = args.size ?? "1536x1024";
const quality = args.quality ?? "medium";

if (!apiKey) {
  fail("Missing IMAGE_API_KEY. Add it to .env.local or export it before running.");
}

if (!prompt || !out) {
  fail(
    "Usage: node scripts/generate-image-asset.mjs --prompt \"...\" --out public/avatars/example.png [--size 1536x1024] [--quality medium]",
  );
}

const response = await fetch(`${baseUrl}/v1/images/generations`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ model, prompt, size, quality }),
});

const payload = await response.json().catch(() => null);

if (!response.ok) {
  fail(`Image generation failed (${response.status}): ${JSON.stringify(payload)}`);
}

const image = payload?.data?.[0];
const b64 = image?.b64_json;

if (!b64) {
  fail(`Image response did not include data[0].b64_json: ${JSON.stringify(payload)}`);
}

const outputPath = resolve(out);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(b64, "base64"));

console.log(`Generated ${outputPath}`);
if (image.revised_prompt) {
  console.log(`Revised prompt: ${image.revised_prompt}`);
}

function parseArgs(rawArgs) {
  const parsed = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, inlineValue] = arg.slice(2).split("=", 2);
    const value = inlineValue ?? rawArgs[index + 1];
    parsed[key] = value;

    if (inlineValue === undefined) {
      index += 1;
    }
  }

  return parsed;
}

async function loadDotEnvLocal() {
  let content = "";

  try {
    content = await readFile(resolve(".env.local"), "utf8");
  } catch {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
