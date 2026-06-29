"use client";

// 따라쓰기: 낱말을 폰트로 옅게 보여주고, 그 위에 손가락으로 따라 쓰기.
// (획순 화살표는 없음 — 그건 '획순쓰기'(낱자) 활동에서.)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { wordsByCategory, type Category } from "@/lib/words";
import { sayKo, cancelSpeech } from "@/lib/speech";
import { Picture } from "@/lib/ui";

export default function WriteScreen({ category }: { category: Category }) {
  const words = useMemo(() => wordsByCategory(category), [category]);
  const [i, setI] = useState(0);
  const word = words[i];

  useEffect(() => {
    sayKo(word);
    return () => cancelSpeech();
  }, [word]);

  const prev = () => setI((n) => (n - 1 + words.length) % words.length);
  const next = () => setI((n) => (n + 1) % words.length);

  return (
    <div className="screen">
      <div className="write-row">
        <div className="write-side">
          <Picture word={word} className="write-thumb" />
        </div>
        {/* key={word.id} → 단어가 바뀌면 캔버스가 새로 비워짐 */}
        <WordStage key={word.id} text={word.ko} />
      </div>
      <div className="word-line">
        <span className="word-ko">{word.ko}</span>
      </div>
      <div className="nav-row">
        <button className="round-btn" onClick={prev} aria-label="이전">
          ◀
        </button>
        <button className="round-btn" onClick={() => sayKo(word)} aria-label="다시 듣기">
          🔊
        </button>
        <button className="round-btn" onClick={next} aria-label="다음">
          ▶
        </button>
      </div>
    </div>
  );
}

function WordStage({ text }: { text: string }) {
  const chars = useMemo(() => [...text], [text]);
  const cells = chars.length;
  const W = cells * 100;

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
    ctx.lineWidth = 14;
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
    <div
      className="word-stage"
      style={{ width: `min(92vw, ${cells * 210}px)`, aspectRatio: `${cells} / 1` }}
    >
      {/* 옅은 글자 가이드 (폰트) */}
      <svg className="stroke-svg word" viewBox={`0 0 ${W} 100`} aria-hidden>
        {chars.map((ch, i) => (
          <text key={i} className="word-glyph" x={i * 100 + 50} y={52}>
            {ch}
          </text>
        ))}
      </svg>
      <canvas
        ref={canvasRef}
        className="write-canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />
      <button className="stroke-clear" onClick={clearCanvas} aria-label="지우기">
        🧽
      </button>
    </div>
  );
}
