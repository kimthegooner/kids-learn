"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { wordsByCategory, type Category, type Word } from "@/lib/words";
import { sayKo, saySentenceKo, cancelSpeech } from "@/lib/speech";
import { recordEvent } from "@/lib/progress";
import { composeWord } from "@/lib/hangul";
import { Picture } from "@/lib/ui";
import TraceCanvas from "./TraceCanvas";

export function WritingPractice({ word, singleSyllable = false, onComplete }: {
  word: Word; singleSyllable?: boolean; onComplete: () => void;
}) {
  const chars = [...word.ko].filter((ch) => /[가-힣]/.test(ch));
  const letters = singleSyllable ? chars.slice(0, 1) : chars;
  const [index, setIndex] = useState(0);
  const [hasInk, setHasInk] = useState(false);
  const [feedback, setFeedback] = useState("초록 점에서 시작해 봐");
  const completed = useRef(false);
  const praised = useRef(false);
  const char = letters[index];
  const guide = useMemo(() => composeWord(char ?? ""), [char]);
  const first = guide.strokes[0]?.d.match(/M\s*([\d.]+)[ ,]+([\d.]+)/);

  useEffect(() => {
    saySentenceKo(`${char}. 초록 점에서 시작해서 써 보자.`);
    return cancelSpeech;
  }, [char]);

  if (!char) return <p>이 낱말에는 따라 쓸 한글이 없어요.</p>;
  return <>
    <div className="syllable-strip" aria-label="따라 쓸 글자">
      {letters.map((letter, i) => <span key={i} className={i === index ? "current" : i < index ? "finished" : ""} aria-current={i === index ? "step" : undefined}>
        {letter}{i < index && <small>✓</small>}
      </span>)}
    </div>
    <div className="write-row">
      <button className="picture-sound" onClick={() => sayKo(word)} aria-label={`${word.ko} 다시 듣기`}><Picture word={word} className="write-thumb" /></button>
      <div className="syllable-stage">
        <svg className="stroke-svg" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M50 4 V96 M4 50 H96" stroke="#ece4da" strokeDasharray="2 3" />
          {guide.strokes.map((stroke, i) => <path key={i} d={stroke.d} fill="none" stroke="#c9c1b9" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />)}
          {first && <circle cx={Number(first[1])} cy={Number(first[2])} r="4" fill="#328348" stroke="white" strokeWidth="1.5" />}
        </svg>
        <TraceCanvas key={index} label={`${char} 따라쓰기`} onInkChange={setHasInk} onStrokeComplete={() => {
          setFeedback("한 획 그었네! 다 쓰면 아래 버튼을 눌러줘.");
          if (!praised.current) { praised.current = true; saySentenceKo("한 획 그었네!"); }
        }} />
      </div>
    </div>
    <p className="practice-feedback" role="status">{feedback}</p>
    <div className="inline-actions">
      <button className="soft-btn" onClick={() => saySentenceKo(char)}>🔊 글자 듣기</button>
      <button className="big-pill" disabled={!hasInk} onClick={() => {
        if (!hasInk || completed.current) return;
        if (index + 1 < letters.length) {
          setIndex(index + 1);
          setHasInk(false);
          praised.current = false;
          setFeedback("다음 글자도 초록 점에서 시작해 봐");
        } else {
          completed.current = true;
          recordEvent({ activity: "write", itemId: singleSyllable ? `${word.id}:${char}` : word.id, label: singleSyllable ? `${char} (${word.ko})` : word.ko, language: "ko" });
          saySentenceKo("끝까지 써 봤어! 잘했어!");
          onComplete();
        }
      }}>{index + 1 < letters.length ? "다 썼어! 다음 글자 →" : "다 썼어! ✓"}</button>
    </div>
  </>;
}

export default function WriteScreen({ category }: { category: Category }) {
  const words = useMemo(() => wordsByCategory(category), [category]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const word = words[index];
  function move(delta: number) { cancelSpeech(); setIndex((i) => (i + delta + words.length) % words.length); setDone(false); setAttempt((n) => n + 1); }
  useEffect(() => cancelSpeech, []);
  return <div className="screen writing-screen">
    <h1 className="section-title">✏️ 한 글자씩 써 보자</h1>
    {done ? <>
      <div className="reward-stars">🌟</div>
      <h2 className="title">{word.ko}, 끝까지 써 봤어!</h2>
      <button className="big-pill" onClick={() => move(1)}>다음 낱말 →</button>
      <button className="soft-btn" onClick={() => { setDone(false); setAttempt((n) => n + 1); }}>한 번 더 쓰기</button>
    </> : <WritingPractice key={`${word.id}-${attempt}`} word={word} onComplete={() => setDone(true)} />}
    <div className="inline-actions">
      <button className="soft-btn" onClick={() => move(-1)}>◀ 이전 낱말</button>
      <span>{index + 1} / {words.length}</span>
      <button className="soft-btn" onClick={() => move(1)}>다음 낱말 ▶</button>
    </div>
  </div>;
}
