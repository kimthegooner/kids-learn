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

// 넘버블록스 스타일 힌트: 숫자를 색깔 큐브 캐릭터로 (5개씩 줄맞춤 → 십 단위 감각).
// 더하기: a 캐릭터 ➕ b 캐릭터. 빼기: a 큐브 중 뒤 b개를 ✕로 사라지게.

// 숫자별 색 (넘버블록스 느낌: 1빨강 2주황 3노랑 4초록 5파랑 6남 7보라 8분홍 9회색)
const NB_COLORS = [
  "#ec4d3d", "#f59331", "#f7d046", "#57c047", "#36bfe6",
  "#6a7bd6", "#b15fd1", "#ef6cab", "#8a96a3",
];
const colorFor = (n: number) => NB_COLORS[(n - 1) % NB_COLORS.length] ?? "#888";

// 숫자별 정식 넘버블록스 형태(열 수): 소수(2,3,5,7)는 1열 탑, 합성수는 사각형.
// 4=2×2, 6=2×3, 8=2×4, 9=3×3.
const COLS: Record<number, number> = {
  1: 1, 2: 1, 3: 1, 4: 2, 5: 1, 6: 2, 7: 1, 8: 2, 9: 3,
};

// 숫자 value 를 그 형태의 큐브 캐릭터로. faded개는 뒤에서부터 ✕(빼기).
function Blocks({ value, faded = 0 }: { value: number; faded?: number }) {
  const cols = COLS[value] ?? Math.min(5, value);
  const color = colorFor(value);
  return (
    <div className="nb-char" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: value }).map((_, i) => {
        const gone = faded > 0 && i >= value - faded;
        return (
          <div
            key={i}
            className={`cube ${gone ? "gone" : ""}`}
            style={gone ? undefined : { background: color }}
          />
        );
      })}
      <span className="nb-face" />
    </div>
  );
}

function HintBlocks({ a, b, op }: { a: number; b: number; op: "+" | "−" }) {
  if (op === "+") {
    return (
      <div className="mp-hint">
        <Blocks value={a} />
        <span className="nb-op">➕</span>
        <Blocks value={b} />
      </div>
    );
  }
  return (
    <div className="mp-hint">
      <Blocks value={a} faded={b} />
    </div>
  );
}

export default function MathScreen({ onStar }: { onStar: () => void }) {
  const [prob, setProb] = useState<Problem | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // 다음 문제 (마운트 시점에 생성 → SSR 하이드레이션 불일치 방지)
  const next = useCallback(() => {
    const p = makeProblem();
    setProb(p);
    setOptions(makeOptions(p.answer));
    setWrong([]);
    setSolved(false);
    setShowHint(false);
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
      setShowHint(true); // 틀리면 힌트 자동으로 보여주기
      saySentenceKo("다시! 세어볼까?");
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

      <button className="mp-hint-btn" onClick={() => setShowHint((h) => !h)}>
        💡 힌트
      </button>
      {showHint && <HintBlocks a={prob.a} b={prob.b} op={prob.op} />}

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
