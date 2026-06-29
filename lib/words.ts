// 단어 데이터는 data/words.json 이 원본(앱·이미지 생성 스크립트 공용).
// 여기서 각 단어에 image 경로를 자동으로 붙인다:
//   image = /images/<id>.png  → 파일이 있으면 그림, 없으면(404) 이모지로 폴백(Picture 참고)
// 음성은 audioKo/En 이 있으면 녹음, 없으면 브라우저 TTS.

import raw from "@/data/words.json";
import { BASE } from "./config";

export type Category =
  | "animal"
  | "sea"
  | "fruit"
  | "food"
  | "vehicle"
  | "nature"
  | "body"
  | "home"
  | "soccer";

export type Word = {
  id: string;
  ko: string;
  en: string;
  emoji: string;
  image?: string;
  category: Category;
  audioKo?: string;
  audioEn?: string;
  prompt?: string; // AI 이미지 생성용 커스텀 프롬프트(없으면 en 사용)
};

export const CATEGORIES: { id: Category; ko: string; emoji: string }[] = [
  { id: "animal", ko: "동물", emoji: "🐶" },
  { id: "sea", ko: "바다", emoji: "🐠" },
  { id: "fruit", ko: "과일", emoji: "🍓" },
  { id: "food", ko: "음식", emoji: "🍪" },
  { id: "vehicle", ko: "탈것", emoji: "🚗" },
  { id: "nature", ko: "자연", emoji: "🌈" },
  { id: "body", ko: "몸", emoji: "✋" },
  { id: "home", ko: "물건", emoji: "🧸" },
  { id: "soccer", ko: "축구선수", emoji: "⚽" },
];

type RawWord = Omit<Word, "image">;

export const WORDS: Word[] = (raw as RawWord[]).map((w) => ({
  ...w,
  image: `${BASE}/images/${w.id}.png`,
}));

export function wordsByCategory(category: Category): Word[] {
  return WORDS.filter((w) => w.category === category);
}
