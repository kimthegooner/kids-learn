"use client";

// 획순 따라쓰기: 자음·모음 글자를 골라, 획이 그려지는 순서를 번호와 함께 보여주고(애니메이션),
// 그 위에 손가락으로 따라 쓴다. 정확도 채점은 없음(5세용) — 순서·방향을 눈으로 익히는 데 집중.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import strokesData from "@/data/strokes.json";
import { saySentenceKo, cancelSpeech } from "@/lib/speech";

type Glyph = {
  char: string;
  sound: string;
  type: "consonant" | "vowel";
  strokes: string[];
};

const GLYPHS = strokesData as Glyph[];
const CONSONANTS = GLYPHS.filter((g) => g.type === "consonant");
const VOWELS = GLYPHS.filter((g) => g.type === "vowel");

// path "d" 의 첫 M 좌표(획 시작점)를 뽑아 번호 배지를 찍는다.
function startPoint(d: string): { x: number; y: number } {
  const m = d.match(/M\s*([\d.]+)[ ,]+([\d.]+)/);
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 50, y: 50 };
}

export default function StrokeScreen() {
  const [tab, setTab] = useState<"consonant" | "vowel">("consonant");
  const list = tab === "consonant" ? CONSONANTS : VOWELS;
  const [idx, setIdx] = useState(0);
  const glyph = list[idx];

  // 획순 애니메이션을 다시 재생하기 위한 키
  const [animKey, setAnimKey] = useState(0);
  const replay = useCallback(() => setAnimKey((k) => k + 1), []);

  // 탭/글자가 바뀌면 애니메이션 재생 + 소리
  useEffect(() => {
    replay();
    saySentenceKo(glyph.sound);
    return () => cancelSpeech();
  }, [glyph, replay]);

  const pickTab = (t: "consonant" | "vowel") => {
    setTab(t);
    setIdx(0);
  };

  return (
    <div className="screen">
      <div className="stroke-tabs">
        <button
          className={`stroke-tab ${tab === "consonant" ? "on" : ""}`}
          onClick={() => pickTab("consonant")}
        >
          자음
        </button>
        <button
          className={`stroke-tab ${tab === "vowel" ? "on" : ""}`}
          onClick={() => pickTab("vowel")}
        >
          모음
        </button>
      </div>

      <div className="stroke-main">
        <StrokeStage key={`${glyph.char}-${animKey}`} glyph={glyph} />
        <div className="stroke-strip">
          {list.map((g, i) => (
            <button
              key={g.char}
              className={`strip-item ${i === idx ? "on" : ""}`}
              onClick={() => setIdx(i)}
            >
              {g.char}
            </button>
          ))}
        </div>
      </div>

      <div className="nav-row">
        <button className="round-btn" onClick={replay} aria-label="획순 다시보기">
          🔁
        </button>
        <button
          className="round-btn"
          onClick={() => saySentenceKo(glyph.sound)}
          aria-label="소리 듣기"
        >
          🔊
        </button>
      </div>
    </div>
  );
}

function StrokeStage({ glyph }: { glyph: Glyph }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const setupCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(rect.width * dpr);
    c.height = Math.round(rect.height * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 18;
    ctx.strokeStyle = "#ff8a3d";
  }, []);

  const clearCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
  }, []);

  useEffect(() => {
    setupCanvas();
    const onResize = () => setupCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setupCanvas]);

  const getPos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    drawing.current = true;
    last.current = getPos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !last.current) return;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const onUp = () => {
    drawing.current = false;
    last.current = null;
  };

  return (
    <div className="stroke-stage">
      {/* 획순 가이드 (SVG) — 굵은 검은 획 + 흰 점선 방향 화살표 + 번호 */}
      <svg className="stroke-svg" viewBox="0 0 100 100" aria-hidden>
        <defs>
          <marker
            id="arrowhead"
            markerUnits="userSpaceOnUse"
            markerWidth="9"
            markerHeight="9"
            refX="7.5"
            refY="4.5"
            orient="auto"
          >
            <path d="M0 0 L9 4.5 L0 9 Z" fill="#ffffff" />
          </marker>
        </defs>

        {/* 1) 굵은 검은 획 (순서대로 그려짐) */}
        {glyph.strokes.map((d, i) => (
          <path
            key={`base-${i}`}
            className="stroke-base"
            d={d}
            pathLength={100}
            style={{ animationDelay: `${i * 0.9}s` }}
          />
        ))}

        {/* 2) 흰 점선 + 방향 화살표 (획이 그려진 뒤 나타남) */}
        {glyph.strokes.map((d, i) => (
          <path
            key={`arrow-${i}`}
            className="stroke-arrow"
            d={d}
            markerEnd="url(#arrowhead)"
            style={{ animationDelay: `${i * 0.9 + 0.55}s` }}
          />
        ))}

        {/* 3) 시작점 번호 ①②③ */}
        {glyph.strokes.map((d, i) => {
          const p = startPoint(d);
          return (
            <g
              key={`num-${i}`}
              className="stroke-num"
              style={{ animationDelay: `${i * 0.9}s` }}
            >
              <circle cx={p.x} cy={p.y} r={8} />
              <text x={p.x} y={p.y} dy="3.4">
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      {/* 손가락 트레이싱 캔버스 */}
      <canvas
        ref={canvasRef}
        className="write-canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />
      <button
        className="stroke-clear"
        onClick={clearCanvas}
        aria-label="지우기"
      >
        🧽
      </button>
    </div>
  );
}
