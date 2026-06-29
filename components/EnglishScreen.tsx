"use client";

// 영어: 쉬운 인사·자기소개 다이얼로그 + 중간중간 기초 단어를
// 한국어 → 영어로 읽어주는 듣기 화면. (글 못 읽어도 소리로 익히기)
// 카드가 바뀌면 자동 재생, 탭하면 다시, 🔊 한국어 / 🅰️ 영어 따로 듣기.

import { useEffect, useMemo, useState } from "react";
import { sayBoth, sayKo, sayEn, cancelSpeech } from "@/lib/speech";
import { BASE } from "@/lib/config";

type Line = { emoji: string; ko: string; en: string; kind: "talk" | "word"; img?: string };

const LINES: Line[] = [
  // 인사·자기소개
  { emoji: "👋", ko: "안녕!", en: "Hello!", kind: "talk" },
  { emoji: "☀️", ko: "좋은 아침!", en: "Good morning!", kind: "talk" },
  { emoji: "👦", ko: "내 이름은 건오야", en: "My name is Geono.", kind: "talk", img: "/images/banner.png" },
  { emoji: "🤝", ko: "만나서 반가워", en: "Nice to meet you.", kind: "talk" },
  { emoji: "😊", ko: "어떻게 지내?", en: "How are you?", kind: "talk" },
  { emoji: "👍", ko: "나는 좋아", en: "I am good.", kind: "talk" },
  { emoji: "✋", ko: "나는 다섯 살이야", en: "I am five years old.", kind: "talk" },

  // 가족
  { emoji: "👩", ko: "엄마", en: "mum", kind: "word" },
  { emoji: "👨", ko: "아빠", en: "dad", kind: "word" },
  { emoji: "👵", ko: "할머니", en: "grandma", kind: "word" },
  { emoji: "👴", ko: "할아버지", en: "grandpa", kind: "word" },
  { emoji: "👶", ko: "아기", en: "baby", kind: "word" },
  { emoji: "❤️", ko: "우리 가족을 사랑해", en: "I love my family.", kind: "talk" },

  // 감정
  { emoji: "😄", ko: "나는 행복해", en: "I am happy.", kind: "talk" },
  { emoji: "🍽️", ko: "나는 배고파", en: "I am hungry.", kind: "talk" },
  { emoji: "😴", ko: "나는 졸려", en: "I am sleepy.", kind: "talk" },

  // 음식
  { emoji: "🍎", ko: "사과", en: "apple", kind: "word" },
  { emoji: "🍌", ko: "바나나", en: "banana", kind: "word" },
  { emoji: "🥛", ko: "우유", en: "milk", kind: "word" },
  { emoji: "💧", ko: "물", en: "water", kind: "word" },
  { emoji: "🍞", ko: "빵", en: "bread", kind: "word" },
  { emoji: "😋", ko: "나는 사과를 좋아해", en: "I like apples.", kind: "talk" },

  // 동물
  { emoji: "🐶", ko: "강아지", en: "dog", kind: "word" },
  { emoji: "🐱", ko: "고양이", en: "cat", kind: "word" },
  { emoji: "🐰", ko: "토끼", en: "rabbit", kind: "word" },
  { emoji: "🦁", ko: "사자", en: "lion", kind: "word" },
  { emoji: "🐻", ko: "곰", en: "bear", kind: "word" },
  { emoji: "🐶", ko: "나는 강아지를 좋아해", en: "I like dogs.", kind: "talk" },

  // 숫자
  { emoji: "1️⃣", ko: "하나", en: "one", kind: "word" },
  { emoji: "2️⃣", ko: "둘", en: "two", kind: "word" },
  { emoji: "3️⃣", ko: "셋", en: "three", kind: "word" },
  { emoji: "4️⃣", ko: "넷", en: "four", kind: "word" },
  { emoji: "5️⃣", ko: "다섯", en: "five", kind: "word" },
  { emoji: "🔢", ko: "같이 세어보자", en: "Let's count!", kind: "talk" },

  // 색깔
  { emoji: "🔴", ko: "빨강", en: "red", kind: "word" },
  { emoji: "🔵", ko: "파랑", en: "blue", kind: "word" },
  { emoji: "🟡", ko: "노랑", en: "yellow", kind: "word" },
  { emoji: "🟢", ko: "초록", en: "green", kind: "word" },
  { emoji: "🌈", ko: "무지개는 알록달록해", en: "The rainbow is colourful.", kind: "talk" },

  // 몸
  { emoji: "✋", ko: "손", en: "hand", kind: "word" },
  { emoji: "👁️", ko: "눈", en: "eye", kind: "word" },
  { emoji: "👃", ko: "코", en: "nose", kind: "word" },
  { emoji: "👄", ko: "입", en: "mouth", kind: "word" },

  // 자연
  { emoji: "☀️", ko: "해", en: "sun", kind: "word" },
  { emoji: "🌙", ko: "달", en: "moon", kind: "word" },
  { emoji: "⭐", ko: "별", en: "star", kind: "word" },
  { emoji: "🌸", ko: "꽃", en: "flower", kind: "word" },

  // 놀이
  { emoji: "⚽", ko: "나는 축구를 좋아해", en: "I like football.", kind: "talk" },
  { emoji: "🧸", ko: "같이 놀자", en: "Let's play together.", kind: "talk" },

  // 예절·마무리
  { emoji: "🙏", ko: "고마워", en: "Thank you.", kind: "talk" },
  { emoji: "🙇", ko: "미안해", en: "I am sorry.", kind: "talk" },
  { emoji: "👌", ko: "괜찮아", en: "It's okay.", kind: "talk" },
  { emoji: "❤️", ko: "사랑해", en: "I love you.", kind: "talk" },
  { emoji: "💪", ko: "잘할 수 있어!", en: "You can do it!", kind: "talk" },
  { emoji: "👋", ko: "잘 가!", en: "Bye bye!", kind: "talk" },
  { emoji: "🙋", ko: "또 만나", en: "See you again.", kind: "talk" },
];

export default function EnglishScreen() {
  const [i, setI] = useState(0);
  const line = LINES[i];
  const isWord = line.kind === "word";

  // 카드가 바뀌면 자동으로 "한국어 → 영어" 들려주기
  useEffect(() => {
    sayBoth(line);
    return () => cancelSpeech();
  }, [line]);

  const prev = () => setI((n) => (n - 1 + LINES.length) % LINES.length);
  const next = () => setI((n) => (n + 1) % LINES.length);

  return (
    <div className="screen">
      <p className="subtitle">듣고 따라 말해봐 🗣️</p>
      <div className="flash" onClick={() => sayBoth(line)}>
        {line.img ? (
          <img className="flash-photo" src={`${BASE}${line.img}`} alt={line.ko} />
        ) : (
          <span className="flash-emoji">{line.emoji}</span>
        )}
      </div>
      <div className="dlg-text">
        <span className={isWord ? "word-ko" : "dlg-ko"}>{line.ko}</span>
        <span className={isWord ? "word-en" : "dlg-en"}>{line.en}</span>
      </div>
      <div className="nav-row">
        <button className="round-btn" onClick={prev} aria-label="이전">
          ◀
        </button>
        <button className="round-btn" onClick={() => sayKo(line)} aria-label="한국어 다시">
          🔊
        </button>
        <button className="round-btn" onClick={() => sayEn(line)} aria-label="영어 다시">
          🅰️
        </button>
        <button className="round-btn" onClick={next} aria-label="다음">
          ▶
        </button>
      </div>
    </div>
  );
}
