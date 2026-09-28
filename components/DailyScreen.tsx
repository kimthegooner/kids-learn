"use client";

import { useEffect, useRef, useState } from "react";
import { WORDS, type Word } from "@/lib/words";
import { dailyWords } from "@/lib/practice";
import { completeDaily, localDay, readProgress, recordEvent } from "@/lib/progress";
import { cancelSpeech, sayKo, saySentenceKo } from "@/lib/speech";
import { Picture } from "@/lib/ui";
import ListenScreen from "./ListenScreen";
import { WritingPractice } from "./WriteScreen";

const DAILY_POOL = WORDS.filter((w) => !(["soccer", "footballers"].includes(w.category)) && [...w.ko].length <= 3);
export default function DailyScreen({ onStar, onDone }: { onStar: () => void; onDone: () => void }) {
  const [words, setWords] = useState<Word[]>([]);
  const [step, setStep] = useState<"learn" | "listen" | "write" | "done">("learn");
  const [index, setIndex] = useState(0);
  const [earned, setEarned] = useState(false);
  const date = useRef(localDay());
  const completed = useRef(false);
  const nextLocked = useRef(false);
  const word = words[index];
  useEffect(() => { setWords(dailyWords(readProgress().events, date.current)); }, []);
  useEffect(() => {
    nextLocked.current = false;
    if (step === "learn" && word) sayKo(word);
    return cancelSpeech;
  }, [step, word]);
  useEffect(() => {
    if (step === "done") saySentenceKo("오늘의 놀이 끝! 끝까지 함께했어!");
    return cancelSpeech;
  }, [step]);
  if (!words.length) return <div className="screen">오늘의 놀이를 준비해요…</div>;
  const stepIndex = { learn: 0, listen: 1, write: 2, done: 3 }[step];
  return <div className="daily-container">
    <ol className="daily-steps" aria-label="오늘의 놀이 순서">
      {["👀 듣기", "👂 찾기", "✏️ 쓰기", "⭐ 완성"].map((label, i) => <li key={label} className={i === stepIndex ? "current" : i < stepIndex ? "finished" : ""} aria-current={i === stepIndex ? "step" : undefined}>{label}</li>)}
    </ol>
    {step === "learn" && <div className="screen daily-learn">
      <div className="progress-caption">새 친구를 만나자 · {index + 1} / {words.length}</div>
      <button className="flash" onClick={() => sayKo(word)} aria-label={`${word.ko} 다시 듣기`}><Picture word={word} className="flash-emoji" /></button>
      <div className="word-ko">{word.ko}</div>
      <button className="big-pill" onClick={() => {
        if (nextLocked.current) return;
        nextLocked.current = true;
        recordEvent({ activity: "learn", itemId: word.id, label: word.ko, language: "ko" });
        if (index + 1 < words.length) setIndex(index + 1); else setStep("listen");
      }}>{index + 1 < words.length ? "다음 친구 →" : "이제 찾아보자! →"}</button>
    </div>}
    {step === "listen" && <ListenScreen pool={DAILY_POOL} targets={words} language="ko" onComplete={() => setStep("write")} />}
    {step === "write" && <div className="screen writing-screen">
      <h1 className="section-title">마지막으로 한 글자 써 보자</h1>
      <WritingPractice word={words[0]} singleSyllable onComplete={() => {
        if (completed.current) return;
        completed.current = true;
        const reward = completeDaily(date.current);
        if (reward) onStar();
        setEarned(reward);
        setStep("done");
      }} />
    </div>}
    {step === "done" && <div className="screen">
      <div className="celebrate">🎉</div>
      <h1 className="title">오늘의 놀이 끝!</h1>
      <p className="subtitle">듣고, 찾고, 끝까지 써 봤어.</p>
      <div className="reward-stars">⭐</div>
      <p>{earned ? "오늘의 별을 하나 받았어!" : "오늘의 별은 이미 받았어. 한 번 더 해냈네!"}</p>
      <button className="big-pill" onClick={onDone}>이제 쉬러 가기</button>
    </div>}
  </div>;
}
