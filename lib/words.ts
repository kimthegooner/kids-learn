import raw from "@/data/words.json";
import { BASE } from "./config";

export type Category =
  | "animal" | "sea" | "bugs" | "fruit" | "vegetable" | "food"
  | "vehicle" | "nature" | "body" | "home" | "clothing" | "family"
  | "feelings" | "places" | "play" | "instruments" | "colors" | "soccer" | "footballers";
export type CategoryGroup = "nature" | "food" | "life" | "play";
export type Word = {
  id: string;
  ko: string;
  en: string;
  emoji: string;
  image?: string;
  category: Category;
  audioKo?: string;
  audioEn?: string;
  instrumentAudio?: string;
  prompt?: string;
  wiki?: string;
  quizGroup?: string; // Related pictures that would make an ambiguous question.
};
export type CategoryInfo = {
  id: Category;
  ko: string;
  emoji: string;
  description: string;
  group: CategoryGroup;
  color: string;
};
export const CATEGORIES: CategoryInfo[] = [
  { id: "animal", ko: "동물 친구", emoji: "🐰", description: "숲속 친구들을 만나자", group: "nature", color: "peach" },
  { id: "sea", ko: "바다 친구", emoji: "🐳", description: "푸른 바닷속으로 풍덩", group: "nature", color: "blue" },
  { id: "bugs", ko: "작은 생물", emoji: "🦋", description: "풀숲에 누가 숨었을까?", group: "nature", color: "mint" },
  { id: "fruit", ko: "과일", emoji: "🍓", description: "알록달록 달콤한 친구", group: "food", color: "pink" },
  { id: "vegetable", ko: "채소", emoji: "🥕", description: "텃밭에서 쑥쑥 자라요", group: "food", color: "peach" },
  { id: "food", ko: "맛있는 음식", emoji: "🥞", description: "냠냠, 오늘은 뭘 먹을까?", group: "food", color: "yellow" },
  { id: "vehicle", ko: "탈것", emoji: "🚌", description: "부릉부릉, 함께 떠나자", group: "life", color: "yellow" },
  { id: "nature", ko: "자연과 날씨", emoji: "🌈", description: "하늘과 땅을 둘러봐", group: "nature", color: "blue" },
  { id: "body", ko: "우리 몸", emoji: "✋", description: "소중한 내 몸을 알아봐", group: "life", color: "pink" },
  { id: "home", ko: "우리 집 물건", emoji: "🧺", description: "매일 만나는 작은 보물", group: "life", color: "mint" },
  { id: "clothing", ko: "옷과 소품", emoji: "🧦", description: "오늘은 무엇을 입을까?", group: "life", color: "lavender" },
  { id: "family", ko: "가족", emoji: "👨‍👩‍👧‍👦", description: "함께라서 더 따뜻해", group: "life", color: "peach" },
  { id: "feelings", ko: "마음과 감정", emoji: "😊", description: "지금 내 마음은 어때?", group: "life", color: "yellow" },
  { id: "places", ko: "우리 동네", emoji: "🏡", description: "동네 한 바퀴, 구경 가자", group: "life", color: "mint" },
  { id: "play", ko: "신나는 놀이", emoji: "🪁", description: "신나게 뛰고 놀아 봐", group: "play", color: "lavender" },
  { id: "instruments", ko: "악기", emoji: "🎹", description: "이름을 듣고 악기 소리도 만나자", group: "play", color: "lavender" },
  { id: "colors", ko: "색깔", emoji: "🎨", description: "세상을 알록달록 칠해 봐", group: "play", color: "pink" },
  { id: "footballers", ko: "축구선수", emoji: "⚽", description: "내가 좋아하는 선수 도감", group: "play", color: "mint" },
  { id: "soccer", ko: "축구", emoji: "⚽", description: "함께 뛰고 골을 넣어 봐!", group: "play", color: "blue" },
];

// Stable IDs preserve earlier learning history and existing photos/recordings.
export const WORDS: Word[] = (raw as Word[]).map((w) => ({
  ...w,
  image: w.image ? `${BASE}${w.image}` : `${BASE}/images/${w.id}.png`,
  instrumentAudio: w.instrumentAudio ? `${BASE}${w.instrumentAudio}` : undefined,
}));
export function wordsByCategory(category: Category): Word[] {
  return WORDS.filter((w) => w.category === category);
}
