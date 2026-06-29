"use client";

// 수학: 한 자리 숫자 더하기·빼기를 계속 내는 연습.
// 다섯 살용 — 답은 숫자 보기 3개 중 터치. 맞히면 별 +1, 바로 다음 문제.

import { useCallback, useEffect, useState } from "react";
import { saySentenceKo, cancelSpeech } from "@/lib/speech";
import { shuffle } from "@/lib/ui";

type Problem = { a: number; op: "+" | "−"; b: number; answer: number };

function makeProblem(): Problem {
  const plus = Math.random() < 0.5;
  if (plus) {
    const a = 1 + Math.floor(Math.random() * 9); // 1~9
    const b = 1 + Math.floor(Math.random() * 9); // 1~9
    return { a, op: "+", b, answer: a + b };
  }
  // 빼기: 결과가 음수가 되지 않도록 a ≥ b
  const a = 2 + Math.floor(Math.random() * 8); // 2~9
  const b = 1 + Math.floor(Math.random() * (a - 1)); // 1~(a-1)
  return { a, op: "−", b, answer: a - b };
}

function makeOptions(answer: number): number[] {
  const set = new Set<number>([answer]);
  while (set.size < 3) {
    const d = answer + (Math.floor(Math.random() * 7) - 3); // ±3
    if (d >= 0) set.add(d);
  }
  return shuffle([...set]);
}

export default function MathScreen({ onStar }: { onStar: () => void }) {
  const [prob, setProb] = useState<Problem | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);

  // 다음 문제 (마운트 시점에 생성 → SSR 하이드레이션 불일치 방지)
  const next = useCallback(() => {
    const p = makeProblem();
    setProb(p);
    setOptions(makeOptions(p.answer));
    setWrong([]);
    setSolved(false);
    saySentenceKo(`${p.a} ${p.op === "+" ? "더하기" : "빼기"} ${p.b}는?`);
  }, []);

  useEffect(() => {
    next();
    return () => cancelSpeech();
  }, [next]);

  const onChoose = (n: number) => {
    if (!prob || solved) return;
    if (n === prob.answer) {
      setSolved(true);
      onStar();
      saySentenceKo("정답!");
      setTimeout(next, 1300);
    } else if (!wrong.includes(n)) {
      setWrong((w) => [...w, n]);
      saySentenceKo("다시!");
    }
  };

  if (!prob) return <div className="screen" />;

  return (
    <div className="screen">
      <p className="subtitle">몇 일까? 🤔</p>
      <div className="mp-problem">
        <span>{prob.a}</span>
        <span className="mp-op">{prob.op}</span>
        <span>{prob.b}</span>
        <span className="mp-op">=</span>
        <span className={`mp-q ${solved ? "solved" : ""}`}>
          {solved ? prob.answer : "?"}
        </span>
      </div>
      <div className="mp-choices">
        {options.map((n) => {
          const cls = solved && n === prob.answer ? "correct" : wrong.includes(n) ? "wrong" : "";
          return (
            <button key={n} className={`mp-choice ${cls}`} onClick={() => onChoose(n)}>
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
