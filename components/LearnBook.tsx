"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, wordsByCategory, type Category } from "@/lib/words";
import { sayBoth, sayEn, sayKo, sayWithSound, playSound, cancelSpeech } from "@/lib/speech";
import { recordEvent } from "@/lib/progress";
import { PlayerPhotoCredit } from "./PhotoCredits";
import { Picture } from "@/lib/ui";

export default function LearnBook({ category, language = "ko" }: { category: Category; language?: "ko" | "en" }) {
  const words = useMemo(() => wordsByCategory(category), [category]);
  const [index, setIndex] = useState(0);
  const session = useRef(`${Date.now()}-${Math.random()}`);
  const word = words[index];
  const isPlayer = category === "footballers";
  const topic = CATEGORIES.find((c) => c.id === category)!;
  useEffect(() => {
    let live = true;
    const playback = word.instrumentAudio ? sayWithSound(word,word.instrumentAudio,language) : language === "ko" ? sayBoth(word) : sayEn(word);
    playback.then((completed) => {
      if (live && completed) recordEvent({ activity: "learn", itemId: word.id, label: word.ko, language }, `${session.current}-learn-${word.id}-${language}`);
    });
    return () => { live = false; cancelSpeech(); };
  }, [word, language]);

  function choose(i: number) {
    if (i === index && word.instrumentAudio) sayWithSound(word,word.instrumentAudio,language);
    setIndex(i);
    document.querySelector(".book-layout")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return <div className={`screen book-screen tone-${topic.color}`}>
    <div className="page-heading">
      <span className="eyebrow">{topic.emoji} {topic.ko} · {language === "en" ? "영어" : "한글"} 그림책</span>
      <h1 className="section-title">{isPlayer ? "내가 좋아하는 축구선수" : "한 장씩, 새로운 발견"}</h1>
    </div>
    <div className="book-layout">
      <button className={`book-picture ${isPlayer ? "player-portrait" : ""}`} onClick={() => word.instrumentAudio ? sayWithSound(word,word.instrumentAudio,language) : language === "en" ? sayEn(word) : sayBoth(word)} aria-label={`${word.ko}${word.instrumentAudio ? " 이름과 악기 소리" : ""} 다시 듣기`}>
        <span className="book-sticker" aria-hidden="true">{isPlayer ? "PLAYER CARD" : "오늘의 발견"}</span>
        <Picture word={word} className="book-emoji" />
        <span className="picture-caption">{word.instrumentAudio ? "톡 누르면 이름과 악기 소리가 나요" : "톡 누르면 소리가 나요"}</span>
      </button>
      <div className="book-definition">
        <span className="book-page">{String(index + 1).padStart(2, "0")} <span>/ {words.length}</span></span>
        <h2 lang={language === "en" ? "en-GB" : "ko"} className={language === "en" ? "book-title english" : "book-title"}>{language === "en" ? word.en : word.ko}</h2>
        <p lang={language === "en" ? "ko" : "en-GB"} className="book-translation">{language === "en" ? word.ko : word.en}</p>
        <div className="book-sounds">
          <button className="soft-btn" onClick={() => sayKo(word)}>🔊 한글 듣기</button>
          <button className="soft-btn" onClick={() => sayEn(word)}>🔊 영국식 영어 듣기</button>
          {word.instrumentAudio && <button className="soft-btn instrument-listen" onClick={() => playSound(word.instrumentAudio!)}>🎵 악기 듣기</button>}
        </div>
        <div className="book-navigation">
          <button className="round-btn" onClick={() => setIndex((n) => (n - 1 + words.length) % words.length)} aria-label="이전">←</button>
          <progress value={index + 1} max={words.length} aria-label="그림책 진행" />
          <button className="round-btn next" onClick={() => setIndex((n) => (n + 1) % words.length)} aria-label="다음">→</button>
        </div>
      </div>
    </div>
    {isPlayer && <PlayerPhotoCredit id={word.id} />}
    {word.instrumentAudio && <p className="instrument-credit">악기 음색: <a href="https://github.com/gleitz/midi-js-soundfonts" target="_blank" rel="noreferrer">FluidR3 / MIDI.js Soundfonts</a> · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a> · 음을 짧게 이어 붙인 소리예요.</p>}
    <details className="word-library" open={isPlayer || undefined}>
      <summary><span>{isPlayer ? "⚽ 다른 선수도 만나볼까?" : "📖 다른 낱말도 만나볼까?"}</span><span>{words.length}개 모두 보기 ＋</span></summary>
      <div className="word-library-grid">{words.map((w, i) =>
        <button key={w.id} onClick={() => choose(i)} className={i === index ? "current" : ""} aria-pressed={i === index}>
          {isPlayer ? <Picture word={w} className="library-picture" /> : <span aria-hidden="true">{w.emoji}</span>}<strong lang={language === "en" ? "en-GB" : "ko"}>{language === "en" ? w.en : w.ko}</strong>
        </button>
      )}</div>
    </details>
  </div>;
}
