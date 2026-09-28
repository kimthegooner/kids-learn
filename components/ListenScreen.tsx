"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Word } from "@/lib/words";
import { Picture, shuffle } from "@/lib/ui";
import { sayEn, sayKo, saySentenceKo, cancelSpeech } from "@/lib/speech";
import { listeningChoiceCount, readProgress, recordEvent } from "@/lib/progress";
import { distinctChoices, practiceWords } from "@/lib/practice";

type Props = { pool: Word[]; language: "ko" | "en"; targets?: Word[]; onComplete: () => void; onExit?: () => void };
type Question = { target: Word; options: Word[] };

export default function ListenScreen({ pool, language, targets, onComplete, onExit }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [finished, setFinished] = useState(false);
  const [hint, setHint] = useState(false);
  const [feedback, setFeedback] = useState("소리를 듣고 그림을 골라줘");
  const locked = useRef(false);
  const answered = useRef(new Set<string>());
  const hints = useRef(0);
  const question = questions[index];

  useEffect(() => {
    const events = readProgress().events;
    const count = listeningChoiceCount(events, language);
    const selected = targets ?? practiceWords(pool, events, Math.min(5, pool.length), String(Date.now()), language);
    setQuestions(selected.map((target) => ({ target, options: shuffle(distinctChoices(target, shuffle(pool), count)) })));
    setIndex(0);
    setWrong([]);
    setSolved(false);
    setFinished(false);
    setHint(false);
    answered.current.clear();
    locked.current = false;
    hints.current = 0;
  }, [pool, language, targets]);

  const play = useCallback(() => {
    if (!question) return;
    if (language === "en") sayEn(question.target);
    else sayKo(question.target);
  }, [question, language]);
  useEffect(() => { if (!finished) play(); return cancelSpeech; }, [play, finished]);

  if (!question) return <div className="screen"><p>그림을 준비하고 있어요…</p></div>;
  return <div className="screen listening-screen">
    <div className="progress-caption">{language === "ko" ? "한글" : "영어"} 그림 찾기 · {index + 1} / {questions.length}</div>
    <h1 className="section-title">👂 듣고 찾아봐!</h1>
    <button className="listen-prompt" onClick={play} aria-label="문제 다시 듣기">🔊 <span>다시 듣기</span></button>
    <div className="choices listening-choices" style={{ gridTemplateColumns: `repeat(${Math.min(question.options.length, 2)}, minmax(0, 1fr))` }}>
      {question.options.map((word) => <button key={word.id} className={`choice ${solved && word.id === question.target.id ? "correct" : ""} ${wrong.includes(word.id) ? "wrong" : ""}`}
        aria-label={language === "ko" ? word.ko : word.en} disabled={solved || wrong.includes(word.id)} onClick={() => {
          if (locked.current || answered.current.has(word.id)) return;
          answered.current.add(word.id);
          if (word.id === question.target.id) {
            locked.current = true;
            setSolved(true);
            setFeedback("찾았다! 정말 잘 들었어! 🎉");
            recordEvent({ activity: "listen", itemId: question.target.id, label: question.target.ko, language, correct: answered.current.size === 1, hints: hints.current });
            saySentenceKo("찾았다! 정말 잘 들었어!");
          } else {
            setWrong((items) => [...items, word.id]);
            setFeedback("괜찮아. 다시 듣고 골라볼까?");
            saySentenceKo("괜찮아. 소리 버튼을 누르고 다시 찾아보자.");
          }
        }}><Picture word={word} />{solved && word.id === question.target.id && <span className="choice-check">✓</span>}</button>)}
    </div>
    {hint && !solved && <div className="listening-hint"><span>이 그림을 찾아봐</span><Picture word={question.target} /></div>}
    <p className="practice-feedback" role="status">{feedback}</p>
    <div className="inline-actions">
      {!solved && <button className="soft-btn" onClick={() => { if (!hint) hints.current += 1; setHint(true); play(); }}>💡 도와줘</button>}
      {solved && <button className="big-pill" onClick={() => {
        if (finished) return;
        if (index + 1 === questions.length) { setFinished(true); onComplete(); }
        else {
          setIndex(index + 1); setWrong([]); setSolved(false); setHint(false);
          setFeedback("소리를 듣고 그림을 골라줘");
          locked.current = false; answered.current.clear(); hints.current = 0;
        }
      }}>{index + 1 === questions.length ? "다 찾았어! ✓" : "다음 그림 →"}</button>}
      {onExit && <button className="soft-btn" onClick={onExit}>쉬러 가기</button>}
    </div>
  </div>;
}
