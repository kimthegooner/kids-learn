"use client";

// 잇기(연결): 왼쪽 그림과 오른쪽 한글 단어를 짝지어 연결.
// 그림을 누르면 그 단어 소리가 나고, 맞는 한글 단어를 누르면 연결됨.
// 한 판 = 3쌍. 다 맞추면 별 + 축하.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { wordsByCategory, type Category, type Word } from "@/lib/words";
import { sayKo, saySentenceKo, cancelSpeech } from "@/lib/speech";
import { distinctChoices } from "@/lib/practice";
import { recordEvent } from "@/lib/progress";
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
  const [celebrating, setCelebrating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const matchedNow = useRef(new Set<string>());
  const mistakes = useRef(new Set<string>());
  const completed = useRef(false);

  // 이번 판에 쓸 3쌍과, 오른쪽 단어들의 섞인 순서
  const [pairs, setPairs] = useState<Word[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());

  const newRound = useCallback(() => {
    clearTimeout(timer.current);
    matchedNow.current.clear(); mistakes.current.clear(); completed.current = false;
    setCelebrating(false);
    const shuffled = shuffle(pool);
    const picked = distinctChoices(shuffled[0], shuffled.slice(1), PAIRS_PER_ROUND);
    setPairs(picked);
    setWords(shuffle(picked));
    setSelected(null);
    setMatched(new Set());
    setDone(false);
  }, [pool]);

  useEffect(() => {
    newRound();
  }, [newRound, roundKey]);

  useEffect(() => { saySentenceKo("그림을 누르고 같은 글자를 찾아봐."); return () => { clearTimeout(timer.current); cancelSpeech(); }; }, []);

  const onPickImage = (w: Word) => {
    if (completed.current || matchedNow.current.has(w.id)) return;
    setSelected(w.id);
    sayKo(w);
  };

  const onPickWord = (w: Word) => {
    if (completed.current || matchedNow.current.has(w.id)) return;
    if (!selected) { saySentenceKo("먼저 그림을 눌러줘."); return; }
    if (selected === w.id) {
      const next = new Set(matchedNow.current);
      next.add(w.id);
      matchedNow.current = next;
      recordEvent({ activity: "connect", itemId: w.id, label: w.ko, language: "ko", correct: !mistakes.current.has(w.id), hints: 0 });
      setMatched(next);
      setSelected(null);
      if (next.size >= pairs.length) {
        completed.current = true;
        setCelebrating(true);
        onStar();
        saySentenceKo("다 맞췄어요! 참 잘했어요!");
        timer.current = setTimeout(() => setDone(true), 900);
      } else {
        saySentenceKo("딩동댕!");
      }
    } else {
      mistakes.current.add(selected);
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
                disabled={celebrating || isMatched}
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
                disabled={celebrating || isMatched}
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
