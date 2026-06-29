// 축구선수/구단 사진을 위키피디아(위키미디어 공용, 자유 라이선스)에서 받아
// public/images/<id>.png 로 저장한다.
//   node scripts/fetch-photos.mjs
//
// - 선수 사진은 위키피디아 인포박스 이미지(대개 CC 라이선스).
// - 구단 엠블럼은 상표/비자유 — 개인용으로만.

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "images");

// id → 위키피디아 문서 제목
const TARGETS = [
  { id: "saka", title: "Bukayo_Saka" },
  { id: "haaland", title: "Erling_Haaland" },
  { id: "yamal", title: "Lamine_Yamal" },
  { id: "arsenal", title: "Arsenal_F.C." },
  { id: "liverpool", title: "Liverpool_F.C." },
];

const UA = "kids-learn/0.1 (personal educational app)";

async function summaryImage(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`summary ${res.status}`);
  const j = await res.json();
  return j.originalimage?.source || j.thumbnail?.source || null;
}

async function download(src) {
  const res = await fetch(src, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`image ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const t of TARGETS) {
    try {
      const src = await summaryImage(t.title);
      if (!src) {
        console.warn(`✗ ${t.id}: 이미지 URL 없음`);
        continue;
      }
      const buf = await download(src);
      await writeFile(join(OUT, `${t.id}.png`), buf);
      console.log(`✓ ${t.id}  (${(buf.length / 1024).toFixed(0)} KB)  ${src}`);
    } catch (e) {
      console.warn(`✗ ${t.id}: ${e.message}`);
    }
  }
}

main();
