"use client";

// 잇기(연결): 왼쪽 그림과 오른쪽 한글 단어를 짝지어 연결.
// 그림을 누르면 그 단어 소리가 나고, 맞는 한글 단어를 누르면 연결됨.
// 한 판 = 3쌍. 다 맞추면 별 + 축하.

import { useCallback, useEffect, useMemo, useState } from "react";
import { wordsByCategory, type Category, type Word } from "@/lib/words";
import { sayKo, saySentenceKo, cancelSpeech } from "@/lib/speech";
import { Picture, shuffle } from "@/lib/ui";

const PAIRS_PER_ROUND = 3;

export default function ConnectScreen({
  category,
  onStar,
  onDone,
}: {
  category: Category;
  onStar: () => void;
  onDone: () => void;
}) {
  const pool = useMemo(() => wordsByCategory(category), [category]);
  const [roundKey, setRoundKey] = useState(0);
  const [done, setDone] = useState(false);

  // 이번 판에 쓸 3쌍과, 오른쪽 단어들의 섞인 순서
  const [pairs, setPairs] = useState<Word[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());

  const newRound = useCallback(() => {
    const picked = shuffle(pool).slice(0, Math.min(PAIRS_PER_ROUND, pool.length));
    setPairs(picked);
    setWords(shuffle(picked));
    setSelected(null);
    setMatched(new Set());
    setDone(false);
  }, [pool]);

  useEffect(() => {
    newRound();
  }, [newRound, roundKey]);

  useEffect(() => () => cancelSpeech(), []);

  const onPickImage = (w: Word) => {
    if (matched.has(w.id)) return;
    setSelected(w.id);
    sayKo(w);
  };

  const onPickWord = (w: Word) => {
    if (matched.has(w.id)) return;
    if (selected && selected === w.id) {
      const next = new Set(matched);
      next.add(w.id);
      setMatched(next);
      setSelected(null);
      if (next.size >= pairs.length) {
        onStar();
        saySentenceKo("다 맞췄어요! 참 잘했어요!");
        setTimeout(() => setDone(true), 900);
      } else {
        saySentenceKo("딩동댕!");
      }
    } else {
      saySentenceKo("다시 한번 찾아볼까?");
      setSelected(null);
    }
  };

  if (done) {
    return (
      <div className="screen">
        <div className="celebrate">🎉</div>
        <h1 className="title">참 잘했어요!</h1>
        <div className="reward-stars">⭐</div>
        <button className="big-pill" onClick={() => setRoundKey((k) => k + 1)}>
          한 번 더!
        </button>
        <button className="big-pill" style={{ background: "var(--accent-2)" }} onClick={onDone}>
          그만하기
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <p className="subtitle">그림과 글자를 이어줘 🔗</p>
      <div className="connect-board">
        <div className="connect-col">
          {pairs.map((w) => {
            const isMatched = matched.has(w.id);
            const isSel = selected === w.id;
            return (
              <button
                key={w.id}
                className={`connect-item img ${isMatched ? "matched" : ""} ${isSel ? "selected" : ""}`}
                onClick={() => onPickImage(w)}
              >
                <Picture word={w} className="connect-emoji" />
                {isMatched && <span className="match-check">✓</span>}
              </button>
            );
          })}
        </div>
        <div className="connect-col">
          {words.map((w) => {
            const isMatched = matched.has(w.id);
            return (
              <button
                key={w.id}
                className={`connect-item word ${isMatched ? "matched" : ""}`}
                onClick={() => onPickWord(w)}
              >
                <span className="connect-word">{w.ko}</span>
                {isMatched && <span className="match-check">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
