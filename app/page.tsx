"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  wordsByCategory,
  type Category,
} from "@/lib/words";
import { sayBoth, sayEn, sayKo, cancelSpeech } from "@/lib/speech";
import { Picture } from "@/lib/ui";
import { BASE } from "@/lib/config";
import ConnectScreen from "@/components/ConnectScreen";
import WriteScreen from "@/components/WriteScreen";
import StrokeScreen from "@/components/StrokeScreen";
import EnglishScreen from "@/components/EnglishScreen";
import MathScreen from "@/components/MathScreen";

type View =
  | "lang" // 한글 / 영어 / 수학 고르기
  | "english" // 영어(유머용 수능 문제)
  | "math" // 수학(유머용 미적분 문제)
  | "category" // 동물/음식/몸/주변
  | "activity" // 배우기/잇기/따라쓰기/획순
  | "learn"
  | "connect"
  | "write"
  | "stroke";

const STAR_KEY = "kidslearn.stars";

export default function Home() {
  const [view, setView] = useState<View>("lang");
  const [category, setCategory] = useState<Category | null>(null);
  const [stars, setStars] = useState(0);

  useEffect(() => {
    const saved = Number(localStorage.getItem(STAR_KEY) ?? "0");
    if (!Number.isNaN(saved)) setStars(saved);
  }, []);
  const addStar = useCallback(() => {
    setStars((s) => {
      const next = s + 1;
      localStorage.setItem(STAR_KEY, String(next));
      return next;
    });
  }, []);

  useEffect(() => () => cancelSpeech(), [view]);

  // 한 단계 뒤로
  const back = () => {
    cancelSpeech();
    if (view === "english" || view === "math" || view === "category") setView("lang");
    else if (view === "activity") setView("category");
    else if (
      view === "learn" ||
      view === "connect" ||
      view === "write" ||
      view === "stroke"
    )
      setView("activity");
  };

  return (
    <main>
      <TopBar onBack={view === "lang" ? undefined : back} stars={stars} />

      {view === "lang" && (
        <LangScreen
          onKorean={() => setView("category")}
          onEnglish={() => setView("english")}
          onMath={() => setView("math")}
        />
      )}

      {view === "english" && <EnglishScreen />}

      {view === "math" && <MathScreen onStar={addStar} />}

      {view === "category" && (
        <CategoryScreen
          onPick={(c) => {
            setCategory(c);
            setView("activity");
          }}
        />
      )}

      {view === "activity" && category && (
        <ActivityScreen
          category={category}
          onLearn={() => setView("learn")}
          onConnect={() => setView("connect")}
          onWrite={() => setView("write")}
          onStroke={() => setView("stroke")}
        />
      )}

      {view === "learn" && category && <LearnScreen category={category} />}

      {view === "connect" && category && (
        <ConnectScreen category={category} onStar={addStar} onDone={() => setView("activity")} />
      )}

      {view === "write" && category && <WriteScreen category={category} />}

      {view === "stroke" && <StrokeScreen />}
    </main>
  );
}

// 상단 로고: /images/banner.png 가 있으면 사진, 없으면 🛴 로 폴백.
// new Image() 로 먼저 탐지(404 broken-icon 방지). 파일을 넣으면 다음 로드 때 사진으로 바뀜.
function BrandLogo() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const im = new Image();
    im.onload = () => setOk(true);
    im.onerror = () => setOk(false);
    im.src = `${BASE}/images/banner.png`;
  }, []);
  return ok ? (
    <img className="brand-logo" src={`${BASE}/images/banner.png`} alt="" />
  ) : (
    <span className="brand-logo emoji">🛴</span>
  );
}

function TopBar({ onBack, stars }: { onBack?: () => void; stars: number }) {
  return (
    <div className="topbar">
      <div className="tb-side">
        {onBack ? (
          <button className="back-btn" onClick={onBack} aria-label="뒤로">
            ◀
          </button>
        ) : (
          <span />
        )}
      </div>
      <div className="brand">
        <BrandLogo />
        <span className="brand-text">
          김건오 고대 가기 프로젝트 · Let&apos;s go “Ancient”
        </span>
      </div>
      <div className="tb-side">
        <div className="star-count">
          <span>⭐</span>
          <span>{stars}</span>
        </div>
      </div>
    </div>
  );
}

function LangScreen({
  onKorean,
  onEnglish,
  onMath,
}: {
  onKorean: () => void;
  onEnglish: () => void;
  onMath: () => void;
}) {
  return (
    <div className="screen">
      <h1 className="title">무엇으로 놀까?</h1>
      <div className="lang-row">
        <button className="lang-card ko" onClick={onKorean}>
          <span className="lang-emoji">가</span>
          <span className="lang-label">한글</span>
        </button>
        <button className="lang-card en" onClick={onEnglish}>
          <span className="lang-emoji">A</span>
          <span className="lang-label">영어</span>
        </button>
        <button className="lang-card math" onClick={onMath}>
          <span className="lang-emoji">+</span>
          <span className="lang-label">수학</span>
        </button>
      </div>
    </div>
  );
}

function CategoryScreen({ onPick }: { onPick: (c: Category) => void }) {
  return (
    <div className="screen">
      <h1 className="title">무엇을 배워볼까?</h1>
      <p className="subtitle">그림을 눌러봐 👆</p>
      <div className="menu-grid">
        {CATEGORIES.map((c) => (
          <button key={c.id} className="menu-card" onClick={() => onPick(c.id)}>
            <span className="menu-emoji">{c.emoji}</span>
            <span className="menu-label">{c.ko}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActivityScreen({
  category,
  onLearn,
  onConnect,
  onWrite,
  onStroke,
}: {
  category: Category;
  onLearn: () => void;
  onConnect: () => void;
  onWrite: () => void;
  onStroke: () => void;
}) {
  const cat = CATEGORIES.find((c) => c.id === category)!;
  return (
    <div className="screen">
      <h1 className="title">
        {cat.emoji} {cat.ko}
      </h1>
      <div className="mode-row">
        <button className="mode-card learn" onClick={onLearn}>
          <span className="big">👀</span>
          배우기
        </button>
        <button className="mode-card connect" onClick={onConnect}>
          <span className="big">🔗</span>
          잇기
        </button>
        <button className="mode-card write" onClick={onWrite}>
          <span className="big">✏️</span>
          따라쓰기
        </button>
        <button className="mode-card stroke" onClick={onStroke}>
          <span className="big">🔢</span>
          획순쓰기
        </button>
      </div>
    </div>
  );
}

// 배우기: 그림 + 자동 "한국어 → 영어" 소리. (한글 단계에선 한국어 중심으로 듣기)
function LearnScreen({ category }: { category: Category }) {
  const words = useMemo(() => wordsByCategory(category), [category]);
  const [i, setI] = useState(0);
  const word = words[i];

  useEffect(() => {
    sayBoth(word);
    return () => cancelSpeech();
  }, [word]);

  const prev = () => setI((n) => (n - 1 + words.length) % words.length);
  const next = () => setI((n) => (n + 1) % words.length);

  return (
    <div className="screen">
      <div className="flash" onClick={() => sayBoth(word)}>
        <Picture word={word} className="flash-emoji" />
      </div>
      <div className="word-line">
        <span className="word-ko">{word.ko}</span>
        <span className="word-en">{word.en}</span>
      </div>
      <div className="nav-row">
        <button className="round-btn" onClick={prev} aria-label="이전">
          ◀
        </button>
        <button className="round-btn" onClick={() => sayKo(word)} aria-label="한국어 다시">
          🔊
        </button>
        <button className="round-btn" onClick={() => sayEn(word)} aria-label="영어 다시">
          🅰️
        </button>
        <button className="round-btn" onClick={next} aria-label="다음">
          ▶
        </button>
      </div>
    </div>
  );
}
