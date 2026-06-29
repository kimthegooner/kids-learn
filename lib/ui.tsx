"use client";

// 화면 여러 곳에서 함께 쓰는 작은 헬퍼들.
import { useEffect, useState } from "react";
import type { Word } from "./words";

// 그림(있으면) 또는 이모지 폴백.
// image 파일이 아직 없으면(404) onError 로 이모지로 자동 전환 →
// AI 이미지를 public/images 에 채워 넣으면 그때부터 그림이 보인다.
export function Picture({ word, className }: { word: Word; className?: string }) {
  const [failed, setFailed] = useState(false);

  // 단어가 바뀌면 에러 상태 초기화 (재사용되는 컴포넌트 대비)
  useEffect(() => setFailed(false), [word.image]);

  if (word.image && !failed) {
    return (
      <img
        key={word.image} // src마다 새 <img> 로 마운트 → 로딩 중 교체 시 잘못된 onError 방지
        className={className}
        src={word.image}
        alt={word.ko}
        onError={() => setFailed(true)}
      />
    );
  }
  return <span className={className}>{word.emoji}</span>;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
