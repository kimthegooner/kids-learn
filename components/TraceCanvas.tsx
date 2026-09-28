"use client";

import { useCallback, useEffect, useRef } from "react";

type Point = { x: number; y: number };
type Props = { onInkChange?: (hasInk: boolean) => void; onStrokeComplete?: () => void; label?: string };

// Store normalized strokes, so resizing/orientation changes preserve the drawing.
export default function TraceCanvas({ onInkChange, onStrokeComplete, label = "손가락으로 따라 쓰는 칸" }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const pointer = useRef<number | null>(null);
  const callbacks = useRef({ onInkChange, onStrokeComplete });
  callbacks.current = { onInkChange, onStrokeComplete };

  const paint = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const { width, height } = c.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(width * dpr);
    c.height = Math.round(height * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = Math.max(8, Math.min(width, height) * 0.045);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#e97822";
    ctx.fillStyle = "#e97822";
    for (const points of strokes.current) {
      if (!points.length) continue;
      ctx.beginPath();
      ctx.moveTo(points[0].x * width, points[0].y * height);
      for (const p of points.slice(1)) ctx.lineTo(p.x * width, p.y * height);
      if (points.length === 1) {
        ctx.arc(points[0].x * width, points[0].y * height, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.stroke();
    }
  }, []);

  useEffect(() => {
    paint();
    const observer = new ResizeObserver(paint);
    if (canvas.current) observer.observe(canvas.current);
    return () => observer.disconnect();
  }, [paint]);

  function position(e: React.PointerEvent): Point {
    const r = canvas.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
  }
  function finish(e: React.PointerEvent, cancelled = false) {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    if (canvas.current?.hasPointerCapture(e.pointerId)) canvas.current.releasePointerCapture(e.pointerId);
    const points = strokes.current[strokes.current.length - 1];
    if (!cancelled && points) { points.push(position(e)); paint(); }
    const ink = strokes.current.length > 0;
    callbacks.current.onInkChange?.(ink);
    if (!cancelled && ink) callbacks.current.onStrokeComplete?.();
  }

  return <>
    <canvas ref={canvas} className="write-canvas" aria-label={label}
      onPointerDown={(e) => {
        if (pointer.current !== null || e.button !== 0) return;
        e.preventDefault();
        pointer.current = e.pointerId;
        canvas.current?.setPointerCapture(e.pointerId);
        strokes.current.push([position(e)]);
        paint();
      }}
      onPointerMove={(e) => {
        if (pointer.current !== e.pointerId) return;
        e.preventDefault();
        strokes.current[strokes.current.length - 1].push(position(e));
        paint();
      }}
      onPointerUp={(e) => finish(e)}
      onPointerCancel={(e) => finish(e, true)}
      onLostPointerCapture={(e) => finish(e, true)}
    />
    <button className="stroke-clear" aria-label="지우기" onClick={() => {
      pointer.current = null;
      strokes.current = [];
      paint();
      callbacks.current.onInkChange?.(false);
    }}>🧽</button>
  </>;
}
