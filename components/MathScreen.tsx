"use client";

import { useEffect, useRef, useState } from "react";
import { saySentenceKo, cancelSpeech } from "@/lib/speech";
import { readProgress, recordEvent, saveProgress } from "@/lib/progress";
import { DEFAULT_MATH, MATH_OPERATIONS, MATH_RANGES, makeProblem, makeOptions, mathHint, problemLabel, recommendedMathRange, type MathSettings, type Problem } from "@/lib/math";

export default function MathScreen({ onStar, onDone }: { onStar: () => void; onDone: () => void }) {
  const [settings, setSettings] = useState<MathSettings>(DEFAULT_MATH);
  const [stage, setStage] = useState<"setup" | "play" | "done">("setup");
  const [prob, setProb] = useState<Problem | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState("차근차근 계산하고 답을 알려줘.");
  const [cleanAnswers, setCleanAnswers] = useState(0);
  const attempts = useRef(new Set<number>());
  const hints = useRef(0);
  const locked = useRef(false);
  const rewarded = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { setSettings(readProgress().mathSettings); return cancelSpeech; }, []);
  function speakProblem(p: Problem) { saySentenceKo(`${p.a} ${p.op === "+" ? "더하기" : p.op === "−" ? "빼기" : "곱하기"} ${p.b}는 얼마일까?`); }
  function next(index: number, config = settings) {
    const p = makeProblem(config, Math.random, index);
    setProb(p);
    setOptions(makeOptions(p.answer, p.op === "×" ? 81 : config.range));
    setAnswer(""); setWrong([]); setSolved(false); setShowHint(false);
    setFeedback("차근차근 계산하고 답을 알려줘.");
    attempts.current.clear(); hints.current = 0; locked.current = false;
    setRound(index);
    speakProblem(p);
  }
  function start() {
    saveProgress({ ...readProgress(), mathSettings: settings });
    setStage("play"); setCleanAnswers(0); rewarded.current = false;
    next(0);
  }
  function choose(n: number) {
    if (!prob || locked.current || !Number.isInteger(n) || n < 0) return;
    if (attempts.current.has(n)) { setFeedback("다른 답도 생각해 볼까?"); return; }
    attempts.current.add(n);
    if (n === prob.answer) {
      locked.current = true; setSolved(true); setAnswer(String(n));
      const clean = attempts.current.size === 1 && hints.current === 0;
      if (clean) setCleanAnswers((value) => value + 1);
      recordEvent({ activity: "math", itemId: problemLabel(prob), label: problemLabel(prob), correct: attempts.current.size === 1, hints: hints.current, mathOperation: prob.op, mathRange: prob.range });
      const progress = readProgress();
      const range = progress.mathMode === "auto" ? recommendedMathRange(progress.events, settings.range) : settings.range;
      if (range !== settings.range) {
        const config = { ...settings, range };
        setSettings(config); saveProgress({ ...progress, mathSettings: config });
        setFeedback(`정답! 다음 덧셈·뺄셈은 ${range} 이내에 도전해 보자.`);
      } else setFeedback("정답! 멋지게 계산했어. ✦");
      saySentenceKo("정답! 멋지게 계산했어!");
    } else {
      setWrong((items) => [...items, n]);
      setFeedback("조금만 더 생각해 보자. 필요하면 풀이 힌트를 눌러봐.");
      setAnswer(""); saySentenceKo("조금만 더 생각해 보자.");
    }
  }
  if (stage === "setup") return <div className="screen math-screen">
    <div className="page-heading"><span className="eyebrow">생각하는 힘이 쑥쑥</span><h1 className="title">오늘은 어떤 계산에 도전할까?</h1><p className="subtitle">덧셈, 뺄셈, 곱셈. 내 실력에 맞게 골라 봐.</p></div>
    <div className="math-setup">
      <div className="math-operations" aria-label="연산 선택">{MATH_OPERATIONS.map((o) => <button key={o.id} className={`math-operation ${settings.operation === o.id ? "active" : ""}`} aria-pressed={settings.operation === o.id} onClick={() => setSettings({ ...settings, operation: o.id })}><span>{o.symbol}</span><strong>{o.label}</strong></button>)}</div>
      {settings.operation !== "multiply" && <div className="math-setting"><h2>어디까지 계산해 볼까?</h2><div className="math-chips">{MATH_RANGES.map((range) => <button key={range} className={settings.range === range ? "active" : ""} aria-pressed={settings.range === range} onClick={() => setSettings({ ...settings, range })}>{range} 이내</button>)}</div></div>}
      {(settings.operation === "multiply" || settings.operation === "mixed") && <div className="math-setting"><h2>연습할 구구단 · 여러 개 골라도 좋아</h2><div className="math-chips">{Array.from({ length: 8 }, (_, i) => i + 2).map((n) => <button key={n} className={settings.tables.includes(n) ? "active" : ""} aria-pressed={settings.tables.includes(n)} onClick={() => {
        const tables = settings.tables.includes(n) ? settings.tables.filter((value) => value !== n) : [...settings.tables, n].sort((a,b) => a-b);
        if (tables.length) setSettings({ ...settings, tables });
      }}>{n}단</button>)}</div></div>}
      <div className="math-setting"><h2>어떻게 답할까?</h2><div className="math-chips"><button className={settings.answerMode === "input" ? "active" : ""} aria-pressed={settings.answerMode === "input"} onClick={() => setSettings({ ...settings, answerMode: "input" })}>직접 입력하기</button><button className={settings.answerMode === "choices" ? "active" : ""} aria-pressed={settings.answerMode === "choices"} onClick={() => setSettings({ ...settings, answerMode: "choices" })}>보기에서 고르기</button></div></div>
      <div className="math-setting"><h2>몇 문제 풀까?</h2><div className="math-chips">{([5,10] as const).map((n) => <button key={n} className={settings.questions === n ? "active" : ""} aria-pressed={settings.questions === n} onClick={() => setSettings({ ...settings, questions: n })}>{n}문제</button>)}</div></div>
      <div className="math-start-row"><p className="math-description">필요할 땐 풀이 힌트와 함께.<br />내 힘으로 끝까지 풀어 보자.</p><button className="big-pill" onClick={start}>계산 시작 →</button></div>
    </div>
  </div>;
  if (stage === "done") return <div className="screen reward-screen"><div className="celebrate">🏅</div><h1 className="title">{settings.questions}문제, 끝까지 해냈어!</h1><p className="subtitle">도움 없이 한 번에 맞힌 문제는 {cleanAnswers}개야.</p><div className="reward-stars">⭐</div><div className="inline-actions"><button className="big-pill" onClick={() => setStage("setup")}>다른 계산에 도전하기</button><button className="soft-btn" onClick={onDone}>쉬러 가기</button></div></div>;
  if (!prob) return null;
  return <div className="screen math-screen">
    <div className="progress-caption">{prob.op === "×" ? `${prob.a}단 곱셈` : `${prob.range} 이내 ${prob.op === "+" ? "덧셈" : "뺄셈"}`} · {round + 1} / {settings.questions}</div>
    <h1 className="section-title">얼마일까?</h1>
    <div className="math-paper"><div className="mp-problem"><span>{prob.a}</span><span className="mp-op">{prob.op}</span><span>{prob.b}</span><span className="mp-op">=</span><span className={`mp-q ${solved ? "solved" : ""}`}>{solved ? prob.answer : "?"}</span></div></div>
    <div className="inline-actions"><button className="soft-btn" onClick={() => speakProblem(prob)}>🔊 다시 듣기</button>{!solved && <button className="soft-btn" onClick={() => { hints.current = 1; setShowHint(true); saySentenceKo(mathHint(prob)); }}>💡 풀이 힌트</button>}</div>
    {showHint && !solved && <div className="math-hint">{prob.op === "×" && <div className="multiplication-groups" aria-label={`${prob.a}개씩 ${prob.b}묶음`}>{Array.from({ length: prob.b }, (_, i) => <span className="dot-group" key={i}>{Array.from({ length: prob.a }, (_, j) => <i key={j} />)}</span>)}</div>}<p>{mathHint(prob)}</p></div>}
    {!solved && (settings.answerMode === "choices" ? <div className="mp-choices">{options.map((n) => <button key={n} className={`mp-choice ${wrong.includes(n) ? "wrong" : ""}`} disabled={wrong.includes(n)} onClick={() => choose(n)}>{n}</button>)}</div> : <form className="math-answer-form" onSubmit={(e) => { e.preventDefault(); if (answer !== "") choose(Number(answer)); }}><input ref={input} className="math-answer-input" aria-label="계산한 답" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={answer} placeholder="정답" onChange={(e) => { if (/^\d{0,3}$/.test(e.target.value)) setAnswer(e.target.value); }} /><button className="big-pill" type="submit" disabled={answer === ""}>확인 ✓</button></form>)}
    <p className="practice-feedback" role="status">{feedback}</p>
    {solved && <button className="big-pill" onClick={() => {
      if (round + 1 === settings.questions) {
        if (!rewarded.current) { rewarded.current = true; onStar(); }
        setStage("done"); saySentenceKo("끝까지 해냈어! 별을 하나 받았어!");
      } else next(round + 1);
    }}>{round + 1 === settings.questions ? "다 풀었어! ⭐" : "다음 문제 →"}</button>}
    <button className="text-link" onClick={() => { cancelSpeech(); setStage("setup"); }}>연산 다시 고르기</button>
  </div>;
}
