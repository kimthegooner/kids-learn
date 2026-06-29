// 한글 단어를 "획순 합성"한다.
// 음절을 초성/중성/종성으로 분해하고, 각 자모의 기본 획(data/strokes.json)을
// 음절 칸 안의 적절한 위치(박스)로 변환해 이어 붙인다.
// 결과: 단어 전체를 순서대로 그릴 수 있는 획 리스트(획순 + 위치).

import strokesData from "@/data/strokes.json";

type RawGlyph = { char: string; strokes: string[] };
const STROKE_MAP: Record<string, string[]> = {};
for (const g of strokesData as RawGlyph[]) STROKE_MAP[g.char] = g.strokes;

// 자모 음소 인덱스
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ".split("");
const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ".split("");
const JONG = "_ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ".split("");

// 복합 자모를 기본 자모(획 데이터가 있는)들로 분해
const DECOMP: Record<string, string[]> = {
  // 쌍자음
  "ㄲ": ["ㄱ", "ㄱ"], "ㄸ": ["ㄷ", "ㄷ"], "ㅃ": ["ㅂ", "ㅂ"],
  "ㅆ": ["ㅅ", "ㅅ"], "ㅉ": ["ㅈ", "ㅈ"],
  // 복합 모음
  "ㅐ": ["ㅏ", "ㅣ"], "ㅒ": ["ㅑ", "ㅣ"], "ㅔ": ["ㅓ", "ㅣ"], "ㅖ": ["ㅕ", "ㅣ"],
  "ㅘ": ["ㅗ", "ㅏ"], "ㅙ": ["ㅗ", "ㅏ", "ㅣ"], "ㅚ": ["ㅗ", "ㅣ"],
  "ㅝ": ["ㅜ", "ㅓ"], "ㅞ": ["ㅜ", "ㅓ", "ㅣ"], "ㅟ": ["ㅜ", "ㅣ"], "ㅢ": ["ㅡ", "ㅣ"],
  // 복합 받침
  "ㄳ": ["ㄱ", "ㅅ"], "ㄵ": ["ㄴ", "ㅈ"], "ㄶ": ["ㄴ", "ㅎ"], "ㄺ": ["ㄹ", "ㄱ"],
  "ㄻ": ["ㄹ", "ㅁ"], "ㄼ": ["ㄹ", "ㅂ"], "ㄽ": ["ㄹ", "ㅅ"], "ㄾ": ["ㄹ", "ㅌ"],
  "ㄿ": ["ㄹ", "ㅍ"], "ㅀ": ["ㄹ", "ㅎ"], "ㅄ": ["ㅂ", "ㅅ"],
};
const atoms = (j: string): string[] => DECOMP[j] ?? [j];

const V_BARS = new Set(["ㅏ", "ㅓ", "ㅑ", "ㅕ", "ㅣ"]); // 세로획 모음
const H_BARS = new Set(["ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ"]); // 가로획 모음

type Box = { x: number; y: number; w: number; h: number };
const B = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });

// path "d"(M/L/A 만 사용)를 박스로 선형 변환
function transformPath(d: string, box: Box, ox: number): string {
  const sx = box.w / 100;
  const sy = box.h / 100;
  const X = (v: number) => ox + box.x + v * sx;
  const Y = (v: number) => box.y + v * sy;
  const t = d.match(/[MLA]|-?[\d.]+/g);
  if (!t) return d;
  const out: string[] = [];
  let i = 0;
  while (i < t.length) {
    const cmd = t[i++];
    if (cmd === "M" || cmd === "L") {
      const x = parseFloat(t[i++]);
      const y = parseFloat(t[i++]);
      out.push(`${cmd}${X(x).toFixed(2)} ${Y(y).toFixed(2)}`);
    } else if (cmd === "A") {
      const rx = parseFloat(t[i++]) * sx;
      const ry = parseFloat(t[i++]) * sy;
      const rot = t[i++];
      const laf = t[i++];
      const sf = t[i++];
      const x = parseFloat(t[i++]);
      const y = parseFloat(t[i++]);
      out.push(
        `A${rx.toFixed(2)} ${ry.toFixed(2)} ${rot} ${laf} ${sf} ${X(x).toFixed(2)} ${Y(y).toFixed(2)}`
      );
    }
  }
  return out.join(" ");
}

// 가로로 k등분한 i번째 칸
function splitH(box: Box, k: number, i: number): Box {
  const w = box.w / k;
  return B(box.x + w * i, box.y, w, box.h);
}

// 한 자모(여러 atom일 수 있음)를 박스에 가로로 나눠 배치 → 획 d 배열
function placeJamo(jamo: string, box: Box, ox: number): string[] {
  const a = atoms(jamo);
  const out: string[] = [];
  a.forEach((atom, idx) => {
    const sub = a.length > 1 ? splitH(box, a.length, idx) : box;
    for (const d of STROKE_MAP[atom] ?? []) out.push(transformPath(d, sub, ox));
  });
  return out;
}

// 한 음절 분해
function parse(ch: string): { cho: string; jung: string; jong: string } | null {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return {
    cho: CHO[Math.floor(code / 588)],
    jung: JUNG[Math.floor((code % 588) / 28)],
    jong: JONG[code % 28],
  };
}

// 한 음절 → 순서대로 그릴 획 d 배열 (cho → jung → jong)
function composeSyllable(ch: string, syllIdx: number): string[] {
  const p = parse(ch);
  const ox = syllIdx * 100;
  if (!p) return [];

  const jAtoms = atoms(p.jung);
  const hasV = jAtoms.some((a) => V_BARS.has(a));
  const hasH = jAtoms.some((a) => H_BARS.has(a));
  const hasJong = p.jong !== "_";

  let choBox: Box, vBox: Box | null = null, hBox: Box | null = null, jongBox: Box | null = null;

  if (hasV && !hasH) {
    // 세로모음: 초성 왼쪽 / 중성 오른쪽
    if (hasJong) {
      choBox = B(10, 8, 40, 52); vBox = B(52, 6, 40, 56); jongBox = B(14, 66, 72, 28);
    } else {
      choBox = B(10, 12, 42, 76); vBox = B(54, 8, 38, 84);
    }
  } else if (!hasV && hasH) {
    // 가로모음: 초성 위 / 중성 아래
    if (hasJong) {
      choBox = B(24, 6, 52, 30); hBox = B(8, 40, 84, 24); jongBox = B(14, 68, 72, 26);
    } else {
      choBox = B(22, 10, 56, 40); hBox = B(8, 54, 84, 38);
    }
  } else {
    // 복합모음(ㅘㅝ…): 초성 좌상 / 가로획 아래 / 세로획 오른쪽
    if (hasJong) {
      choBox = B(10, 6, 40, 40); hBox = B(8, 46, 84, 22); vBox = B(56, 6, 36, 62); jongBox = B(14, 70, 72, 24);
    } else {
      choBox = B(10, 8, 40, 46); hBox = B(8, 54, 84, 34); vBox = B(56, 8, 36, 80);
    }
  }

  const out: string[] = [];
  // 초성
  out.push(...placeJamo(p.cho, choBox, ox));
  // 중성 (분해 순서대로: 가로획 atom → hBox, 세로획 atom → vBox)
  const vCount = jAtoms.filter((a) => V_BARS.has(a)).length;
  let vi = 0;
  for (const a of jAtoms) {
    if (H_BARS.has(a) && hBox) {
      for (const d of STROKE_MAP[a] ?? []) out.push(transformPath(d, hBox, ox));
    } else if (vBox) {
      const sub = vCount > 1 ? splitH(vBox, vCount, vi++) : vBox;
      for (const d of STROKE_MAP[a] ?? []) out.push(transformPath(d, sub, ox));
    }
  }
  // 종성
  if (hasJong && jongBox) out.push(...placeJamo(p.jong, jongBox, ox));
  return out;
}

export type ComposedStroke = { d: string; num: number };
export type ComposedWord = { cells: number; strokes: ComposedStroke[] };

// 단어 전체 → 음절별로 번호를 매긴 획순 리스트
export function composeWord(word: string): ComposedWord {
  const chars = [...word];
  const strokes: ComposedStroke[] = [];
  chars.forEach((ch, idx) => {
    const ds = composeSyllable(ch, idx);
    ds.forEach((d, k) => strokes.push({ d, num: k + 1 })); // 음절마다 번호 1부터
  });
  return { cells: chars.length, strokes };
}
