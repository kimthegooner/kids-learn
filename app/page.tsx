"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, WORDS, wordsByCategory, type Category, type CategoryGroup, type Word } from "@/lib/words";
import { cancelSpeech, unlockSpeech, saySentenceKo } from "@/lib/speech";
import { awardStar, localDay, readProgress, readStars } from "@/lib/progress";
import ConnectScreen from "@/components/ConnectScreen";
import WriteScreen from "@/components/WriteScreen";
import StrokeScreen from "@/components/StrokeScreen";
import EnglishScreen from "@/components/EnglishScreen";
import MathScreen from "@/components/MathScreen";
import ListenScreen from "@/components/ListenScreen";
import DailyScreen from "@/components/DailyScreen";
import ParentScreen from "@/components/ParentScreen";
import LearnBook from "@/components/LearnBook";
import ForestScene, { SproutMark } from "@/components/ForestScene";
import { ProfileWelcome } from "@/components/ProfileForm";
import SoundControl from "@/components/SoundControl";
import MusicScreen from "@/components/MusicScreen";
import { forestTitle, greeting, PROFILE_KEY, readProfile, saveProfile, type ChildProfile } from "@/lib/profile";
import dynamic from "next/dynamic";

const CameraScreen = dynamic(() => import("@/components/CameraScreen"), { ssr: false, loading: () => <div className="screen"><p className="subtitle">변신 사진관을 열고 있어요…</p></div> });

type View = "lang" | "english" | "englishLearn" | "englishListen" | "englishCategory" | "englishWordLearn" |
  "math" | "category" | "activity" | "learn" | "listen" | "connect" | "write" | "stroke" | "daily" | "parent" | "camera" | "music";

export default function Home() {
  const [view, setView] = useState<View>("lang");
  const [category, setCategory] = useState<Category | null>(null);
  const [englishIntent, setEnglishIntent] = useState<"learn" | "listen">("learn");
  const [stars, setStars] = useState(0);
  const [dailyDone, setDailyDone] = useState(false);
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [profileNotice, setProfileNotice] = useState(false);
  const pool = useMemo(() => category ? wordsByCategory(category) : [], [category]);
  useEffect(() => {
    const sync = () => { setProfile(readProfile()); setProfileReady(true); };
    const storage = (event: StorageEvent) => { if (!event.key || event.key === PROFILE_KEY) sync(); };
    sync();
    window.addEventListener("storage", storage);
    window.addEventListener("kidslearn-profile", sync);
    return () => { window.removeEventListener("storage", storage); window.removeEventListener("kidslearn-profile", sync); };
  }, []);
  useEffect(() => { document.title = `${forestTitle(profile?.name ?? "")} · 한글·영어·수학`; }, [profile?.name]);
  const updateProfile = (next: ChildProfile) => {
    if (!profile) unlockSpeech();
    const saved = saveProfile(next);
    setProfileNotice(!saved);
    return saved;
  };
  useEffect(() => {
    const sync = () => {
      setStars(readStars());
      setDailyDone(readProgress().dailyDates.includes(localDay()));
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("kidslearn-progress", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("kidslearn-progress", sync);
    };
  }, []);
  const addStar = useCallback(() => setStars(awardStar()), []);
  useEffect(() => () => cancelSpeech(), []);
  const go = (next: View) => {
    cancelSpeech();
    setView(next);
    window.scrollTo({ top: 0 });
  };
  const pickCategory = (c: Category) => { setCategory(c); go("activity"); };
  const back = () => {
    if (["englishWordLearn", "englishListen"].includes(view)) go("englishCategory");
    else if (["englishLearn", "englishCategory"].includes(view)) go("english");
    else if (view === "activity") go("category");
    else if (["learn", "listen", "connect", "write", "stroke"].includes(view)) go("activity");
    else go("lang");
  };
  if (!profileReady) return <main><div className="screen"><p className="subtitle">배움 숲을 열고 있어요…</p></div></main>;
  if (!profile) return <main><ProfileWelcome onSave={updateProfile} /></main>;
  return <main>
    <TopBar name={profile.name} onHome={() => go("lang")} onBack={view === "lang" ? undefined : back} stars={stars} onParent={() => go("parent")} />
    {view !== "camera" && view !== "music" && <SoundControl />}
    {profileNotice && <p className="storage-notice profile-storage" role="status">이름을 적용했어요. 기기 저장이 차단되어 이번 실행 중에만 유지돼요.</p>}
    {view === "lang" && <HomeMenu name={profile.name} dailyDone={dailyDone} go={go} onCategory={pickCategory} />}
    {view === "daily" && <DailyScreen onStar={addStar} onDone={() => go("lang")} />}
    {view === "parent" && <ParentScreen profile={profile} onProfileSave={updateProfile} />}
    {view === "camera" && <CameraScreen name={profile.name} />}
    {view === "music" && <MusicScreen />}
    {view === "english" && <div className="screen hub-screen">
      <div className="page-heading"><span className="eyebrow">HELLO, LITTLE EXPLORER</span><h1 className="title">영어랑 친구가 되어 볼까?</h1><p className="subtitle">영국식 영어로 듣고, 즐겁게 따라 말해요.</p></div>
      <div className="mode-row">
        <button className="mode-card learn" onClick={() => { setEnglishIntent("learn"); go("englishCategory"); }}><span className="big">📖</span><strong>낱말 그림책</strong><small>그림으로 만나는 영어</small><span className="card-arrow">↗</span></button>
        <button className="mode-card game" onClick={() => { setEnglishIntent("listen"); go("englishCategory"); }}><span className="big">👂</span><strong>듣고 찾기</strong><small>소리에 귀 기울여 봐</small><span className="card-arrow">↗</span></button>
        <button className="mode-card write" onClick={() => go("englishLearn")}><span className="big">👋</span><strong>생활 영어</strong><small>인사하고 마음을 말해 봐</small><span className="card-arrow">↗</span></button>
      </div>
    </div>}
    {view === "englishCategory" && <CategoryScreen language="en" onPick={(c) => { setCategory(c); go(englishIntent === "learn" ? "englishWordLearn" : "englishListen"); }} />}
    {view === "englishLearn" && <EnglishScreen profile={profile} />}
    {view === "englishWordLearn" && category && <LearnBook category={category} language="en" />}
    {view === "englishListen" && category && <ListeningActivity pool={pool} language="en" onStar={addStar} onDone={() => go("englishCategory")} />}
    {view === "math" && <MathScreen onStar={addStar} onDone={() => go("lang")} />}
    {view === "category" && <CategoryScreen onPick={pickCategory} />}
    {view === "activity" && category && <ActivityScreen category={category} go={go} />}
    {view === "learn" && category && <LearnBook category={category} />}
    {view === "listen" && category && <ListeningActivity pool={pool} language="ko" onStar={addStar} onDone={() => go("activity")} />}
    {view === "connect" && category && <ConnectScreen category={category} onStar={addStar} onDone={() => go("activity")} />}
    {view === "write" && category && <WriteScreen category={category} />}
    {view === "stroke" && <StrokeScreen />}
  </main>;
}

function TopBar({ name, onHome, onBack, stars, onParent }: { name: string; onHome: () => void; onBack?: () => void; stars: number; onParent: () => void }) {
  return <header className="topbar">
    <div className="topbar-inner">
      <div className="brand-area">
        {onBack && <button className="back-btn" onClick={onBack} aria-label="뒤로">←</button>}
        <button className="brand" onClick={onHome} aria-label={`${forestTitle(name)} 홈`}>
          <span className="brand-mark"><SproutMark /></span>
          <span className="brand-text"><span className="brand-title">{forestTitle(name)}</span><small>작은 호기심이 자라는 곳</small></span>
        </button>
      </div>
      <div className="topbar-actions">
        <div className="star-count" aria-label={`모은 별 ${stars}개`}><span aria-hidden="true">✦</span><span className="star-label">모은 별</span><strong>{stars}</strong></div>
        <button className="parent-link" onClick={onParent} aria-label="부모님 학습 기록">부모님 <span aria-hidden="true">↗</span></button>
      </div>
    </div>
  </header>;
}

function HomeMenu({ name, dailyDone, go, onCategory }: { name: string; dailyDone: boolean; go: (view: View) => void; onCategory: (c: Category) => void }) {
  const featured = ["animal", "footballers", "fruit", "bugs", "colors", "instruments"];
  return <div className="screen home-screen">
    <section className="daily-hero">
      <div className="hero-copy">
        <span className="hero-kicker"><span /> 매일 조금씩, 즐겁게</span>
        <h1>{greeting(name)}, 오늘은<br /><em>뭐 하고 놀까?</em></h1>
        <p>듣고, 발견하고, 그려 보는<br className="mobile-break" /> 우리만의 작은 모험.</p>
        <button className="hero-start" onClick={() => go("daily")}>{dailyDone ? "오늘의 놀이 다시 하기" : "오늘의 놀이 시작"}<span>→</span></button>
        <div className="hero-steps"><span>👀 듣고</span><i /> <span>👂 찾고</span><i /> <span>✏️ 써 보고</span></div>
      </div>
      <div className="hero-art"><ForestScene /><span className="art-note">오늘도 쑥쑥!<svg viewBox="0 0 95 14" aria-hidden="true"><path d="M2 10Q43 0 92 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></span></div>
    </section>
    <section className="home-subjects">
      <div className="section-heading"><div><span className="eyebrow">골라서 시작해요</span><h2>어디부터 가 볼까?</h2></div><span className="section-aside">작은 시작도 멋진 발견이야.</span></div>
      <div className="subject-grid">
        <button className="subject-card korean" onClick={() => go("category")} aria-label="한글 놀이"><span className="subject-symbol">가<span>나</span></span><div><span className="subject-tag">우리말이 쑥쑥</span><h3>한글 놀이</h3><p>그림으로 만나고, 한 글자씩 써요</p></div><span className="subject-arrow">↗</span></button>
        <button className="subject-card english" onClick={() => go("english")} aria-label="영어 놀이"><span className="subject-symbol">A<span>b</span></span><div><span className="subject-tag">새로운 소리와 친구</span><h3>영어 놀이</h3><p>귀로 듣고, 즐겁게 따라 말해요</p></div><span className="subject-arrow">↗</span></button>
        <button className="subject-card numbers" onClick={() => go("math")} aria-label="수학 놀이"><span className="subject-symbol">1<span>2</span></span><div><span className="subject-tag">덧셈 · 뺄셈 · 곱셈</span><h3>수학 놀이</h3><p>더하고, 빼고, 곱하며 생각해요</p></div><span className="subject-arrow">↗</span></button>
      </div>
    </section>
    <button className="camera-home-link" onClick={() => go("camera")} aria-label="변신 사진관 열기">
      <span className="camera-home-art" aria-hidden="true"><span>👑</span><span>📷</span><span>🐰</span></span>
      <span className="camera-home-copy"><span className="eyebrow">상상 놀이 · NEW</span><strong>찰칵! 오늘은 내가 주인공</strong><small>공룡·로봇·공주까지! 움직이는 나만의 변신 사진관</small></span><span className="camera-home-arrow">↗</span>
    </button>
    <button className="music-home-link" onClick={()=>go("music")} aria-label="다양한 악기로 음악 듣기">
      <span className="music-home-art" aria-hidden="true"><span>♫</span><span>🎹</span><span>♪</span></span>
      <span className="music-home-copy"><span className="eyebrow">우리 집 작은 음악회 · NEW</span><strong>다양한 악기로 음악 듣기</strong><small>동요를 고르고, 여러 악기로 함께 연주해요.</small></span><span className="music-home-arrow" aria-hidden="true">↗</span>
    </button>
    <section className="home-topics">
      <div className="section-heading"><div><span className="eyebrow">호기심 가득한 단어 정원</span><h2>좋아하는 걸 만나러 가자</h2></div><button className="text-link" onClick={() => go("category")}>주제 {CATEGORIES.length}개 모두 보기 <span>→</span></button></div>
      <div className="topic-preview">{featured.map((id) => {
        const c = CATEGORIES.find((c) => c.id === id)!;
        return <button key={c.id} className={`topic-tile tone-${c.color}`} onClick={() => onCategory(c.id)}><span className="topic-emoji">{c.emoji}</span><strong>{c.ko}</strong><small>{wordsByCategory(c.id).length}개 낱말</small></button>;
      })}</div>
    </section>
    <footer className="home-footer"><SproutMark /><span>{CATEGORIES.length}개의 작은 세상 · {WORDS.length}개의 새로운 발견</span><span>{name ? `${name}의` : "우리만의"} 속도로, 즐겁게 자라요.</span></footer>
  </div>;
}

function CategoryScreen({ onPick, language = "ko" }: { onPick: (c: Category) => void; language?: "ko" | "en" }) {
  const [group, setGroup] = useState<CategoryGroup | "all">("all");
  const topics = CATEGORIES.filter((c) => (language === "ko" || !(["soccer", "footballers"].includes(c.id))) && (group === "all" || c.group === group));
  const groups: { id: CategoryGroup | "all"; label: string }[] = [
    { id: "all", label: "모두" }, { id: "nature", label: "🌿 자연 친구" }, { id: "food", label: "🍓 맛있는 세상" }, { id: "life", label: "🏡 우리 생활" }, { id: "play", label: "🎨 신나는 놀이" },
  ];
  useEffect(() => { saySentenceKo("어떤 세상으로 떠나볼까? 좋아하는 그림을 골라봐."); return cancelSpeech; }, []);
  return <div className="screen category-screen">
    <div className="page-heading"><span className="eyebrow">{language === "en" ? "영어" : "한글"} 단어 정원</span><h1 className="title">어떤 세상으로 떠나볼까?</h1><p className="subtitle">좋아하는 그림을 톡 눌러, 새로운 낱말을 만나 봐.</p></div>
    <div className="category-filters" aria-label="주제 분류">{groups.map((g) => <button key={g.id} onClick={() => setGroup(g.id)} aria-pressed={group === g.id} className={group === g.id ? "active" : ""}>{g.label}</button>)}</div>
    <div className="menu-grid">{topics.map((c) => <button key={c.id} className={`menu-card tone-${c.color}`} onClick={() => onPick(c.id)}>
      <span className="menu-emoji">{c.emoji}</span><span className="menu-count">{wordsByCategory(c.id).length}개 낱말</span><strong className="menu-label">{c.ko}</strong><small>{c.description}</small><span className="menu-arrow" aria-hidden="true">↗</span>
    </button>)}</div>
  </div>;
}

function ActivityScreen({ category, go }: { category: Category; go: (view: View) => void }) {
  const cat = CATEGORIES.find((c) => c.id === category)!;
  useEffect(() => { saySentenceKo("듣고, 찾고, 써 보자. 하고 싶은 놀이를 골라봐."); return cancelSpeech; }, []);
  const modes: { view: View; icon: string; label: string; detail: string; color: string }[] = [
    { view: "learn", icon: "📖", label: category === "footballers" ? "선수 도감" : category === "instruments" ? "악기 도감" : "낱말 그림책", detail: category === "instruments" ? "이름과 악기 소리를 함께" : "한 장씩 만나 봐요", color: "learn" },
    { view: "listen", icon: "👂", label: "듣고 찾기", detail: "소리를 듣고 그림 찾기", color: "game" },
    { view: "connect", icon: "🔗", label: "짝꿍 잇기", detail: "그림과 글자를 이어 봐요", color: "connect" },
    { view: "write", icon: "✏️", label: "따라쓰기", detail: "한 글자씩 천천히", color: "write" },
    { view: "stroke", icon: "🌱", label: "획순쓰기", detail: "글자의 시작을 배워요", color: "stroke" },
  ];
  return <div className="screen hub-screen">
    <div className="page-heading"><span className={`topic-bubble tone-${cat.color}`}>{cat.emoji}</span><span className="eyebrow">{wordsByCategory(category).length}개 낱말이 기다려요</span><h1 className="title">{cat.ko}랑 어떻게 놀까?</h1><p className="subtitle">처음이라면 그림책부터 펼쳐 봐.</p></div>
    <div className="mode-row">{modes.map((m) => <button key={m.view} className={`mode-card ${m.color}`} onClick={() => go(m.view)}><span className="big">{m.icon}</span><strong>{m.label}</strong><small>{m.detail}</small><span className="card-arrow">↗</span></button>)}</div>
  </div>;
}

function ListeningActivity({ pool, language, onStar, onDone }: { pool: Word[]; language: "ko" | "en"; onStar: () => void; onDone: () => void }) {
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);
  const awarded = useRef(false);
  if (done) return <div className="screen reward-screen"><div className="celebrate">🎉</div><h1 className="title">모두 찾았어!</h1><p className="subtitle">또 하나의 멋진 발견이야.</p><div className="reward-stars">⭐</div><div className="inline-actions"><button className="big-pill" onClick={onDone}>쉬러 가기</button><button className="soft-btn" onClick={() => { awarded.current = false; setDone(false); setRound(round + 1); }}>한 번 더!</button></div></div>;
  return <ListenScreen key={round} pool={pool} language={language} onExit={onDone} onComplete={() => { if (!awarded.current) { awarded.current = true; onStar(); } setDone(true); }} />;
}
