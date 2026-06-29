// 100개 단어의 AI 이미지를 한 번에 생성해 public/images/<id>.png 로 저장.
//
//   OPENAI_API_KEY=sk-... npm run gen-images
//
// - data/words.json 을 읽어 각 단어마다 고정 스타일 프롬프트로 1024x1024 생성.
// - 이미 존재하는 파일은 건너뜀(중간에 끊겨도 이어서 가능).
// - 기본은 OpenAI Images(gpt-image-1). 다른 API를 쓰려면 callImageApi() 만 교체.
//
// 비용 주의: 100장 생성은 OpenAI 기준 대략 수~십수 달러가 청구될 수 있습니다.

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "images");
const CONCURRENCY = 3;

const STYLE =
  "cute flat illustration for a children's app, soft rounded shapes, " +
  "bright pastel colors, thick outlines, centered on a plain off-white " +
  "background, no text, no shadow.";

function buildPrompt(word) {
  // 커스텀 프롬프트가 있으면 그걸, 없으면 영어 명칭으로 또렷한 단일 사물 생성
  if (word.prompt) return `${word.prompt}, ${STYLE}`;
  return `A single ${word.en}, ${STYLE}`;
}

async function callImageApi(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY 환경변수가 필요합니다.");
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      n: 1,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지 데이터가 비어있습니다.");
  return Buffer.from(b64, "base64");
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const words = JSON.parse(await readFile(join(ROOT, "data", "words.json"), "utf8"));

  // 아직 없는 것만
  const todo = [];
  for (const w of words) {
    const out = join(OUT_DIR, `${w.id}.png`);
    if (await exists(out)) continue;
    todo.push(w);
  }
  console.log(`총 ${words.length}개 중 ${todo.length}개 생성 시작 (동시 ${CONCURRENCY})`);

  let done = 0;
  let failed = 0;
  const queue = [...todo];
  async function worker() {
    while (queue.length) {
      const w = queue.shift();
      try {
        const buf = await callImageApi(buildPrompt(w));
        await writeFile(join(OUT_DIR, `${w.id}.png`), buf);
        done++;
        console.log(`✓ ${w.id} (${w.ko})  [${done}/${todo.length}]`);
      } catch (e) {
        failed++;
        console.warn(`✗ ${w.id} (${w.ko}) 실패: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`완료: 성공 ${done}, 실패 ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
