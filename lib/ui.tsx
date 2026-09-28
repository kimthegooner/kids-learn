"use client";

// 화면 여러 곳에서 함께 쓰는 작은 헬퍼들.
import { useEffect, useState } from "react";
import type { Word } from "./words";

// 그림(있으면) 또는 이모지 폴백.
// 이미지 로딩 중에는 이모지를 보여주고, 로딩 성공 후 그림으로 바꾼다.
export function Picture({ word, className }: { word: Word; className?: string }) {
  const [loaded, setLoaded] = useState<string | null>(null);

  // Show the emoji immediately, including while a missing image is still loading.
  useEffect(() => {
    if (!word.image) return;
    const im = new Image();
    im.onload = () => setLoaded(word.image!);
    im.src = word.image;
    return () => { im.onload = null; };
  }, [word.image]);

  if (word.image && loaded === word.image) {
    return <img className={className} src={word.image} alt={word.ko} onError={() => setLoaded(null)} />;
  }
  return <span className={className} role="img" aria-label={word.ko}>{word.emoji}</span>;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
