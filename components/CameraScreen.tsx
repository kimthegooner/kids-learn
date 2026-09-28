"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CAMERA_FILTERS, cameraError, demoFrame, filterMode, followLandmarks, stopStream, trackingHint, type FilterId, type TrackingFrame } from "@/lib/camera";
import { drawDemo, drawFilter } from "@/lib/camera-draw";
import { artworkUrl, loadCameraArtwork, type CameraArtwork } from "@/lib/camera-artwork";
import { photoFilename, photoTitle } from "@/lib/profile";

type Phase = "demo" | "loading" | "live" | "error";
const EMPTY: TrackingFrame = { face: [], pose: [] };
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function CameraScreen({ name }: { name: string }) {
  const [filter, setFilter] = useState<FilterId>("dinosaur");
  const [phase, setPhase] = useState<Phase>("demo");
  const [message, setMessage] = useState("");
  const [tracked, setTracked] = useState(false);
  const [pink, setPink] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [flash, setFlash] = useState(false);
  const [artwork, setArtwork] = useState<CameraArtwork>({});
  const [fit, setFit] = useState(100);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const worker = useRef<Worker | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResult = useRef(0);
  const frame = useRef<TrackingFrame>(EMPTY);
  const renderedFrame = useRef<TrackingFrame>(EMPTY);
  const currentMode = useRef(filterMode(filter));
  const selected = CAMERA_FILTERS.find((f) => f.id === filter)!;

  const release = useCallback(() => {
    generation.current++;
    if (watchdog.current) clearTimeout(watchdog.current);
    watchdog.current = null;
    worker.current?.terminate(); worker.current = null;
    stopStream(stream.current); stream.current = null;
    if (video.current) { video.current.pause(); video.current.srcObject = null; }
    frame.current = EMPTY; renderedFrame.current = EMPTY; busy.current = false;
  }, []);

  const stop = useCallback(() => {
    release(); setPhase("demo"); setTracked(false); setMessage("");
  }, [release]);

  const fail = useCallback((text: string) => {
    release(); setPhase("error"); setTracked(false); setMessage(text);
  }, [release]);

  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", stop);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", stop);
      release();
    };
  }, [release, stop]);

  useEffect(() => {
    let active = true;
    loadCameraArtwork(BASE).then((assets) => { if(active) setArtwork(assets); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!photo) return;
    return () => URL.revokeObjectURL(photo);
  }, [photo]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(false), 180);
    return () => clearTimeout(timer);
  }, [flash]);

  const start = async () => {
    release(); setPhoto(null); setTracked(false);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      fail("카메라는 localhost 또는 HTTPS 주소에서 사용할 수 있어요. 카메라를 지원하는 브라우저에서 열어 주세요."); return;
    }
    if (!window.Worker || !window.OffscreenCanvas || !window.createImageBitmap) {
      fail("이 브라우저는 실시간 변신을 지원하지 않아요. 최신 Chrome 또는 Safari에서 열어 주세요."); return;
    }
    setPhase("loading"); setMessage("카메라 사용을 허용해 주세요.");
    const id = generation.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 }, frameRate: { ideal: 30, max: 30 } } });
      if (id !== generation.current) { stopStream(media); return; }
      stream.current = media;
      media.getVideoTracks().forEach((track) => track.addEventListener("ended", () => {
        if (id === generation.current) fail("카메라 연결이 끊겼어요. 연결을 확인하고 다시 시작해 주세요.");
      }, { once: true }));
      video.current!.srcObject = media;
      await video.current!.play();
      if (id !== generation.current) return;
      setMessage("변신 도구를 준비하고 있어요. 처음에는 잠깐 걸려요.");
      const tracker = new Worker(`${BASE}/camera/tracker.js`);
      worker.current = tracker;
      const armTimeout = (ms: number) => {
        if (watchdog.current) clearTimeout(watchdog.current);
        watchdog.current = setTimeout(() => {
          if (id === generation.current) fail("변신 도구가 응답하지 않아요. 다시 시작해 주세요.");
        }, ms);
      };
      armTimeout(60000);
      tracker.onerror = () => { if (id === generation.current) fail("변신 도구를 불러오지 못했어요. 새로고침하거나 Chrome·Safari에서 다시 열어 주세요."); };
      tracker.onmessage = ({ data }) => {
        if (id !== generation.current) return;
        if (data.type === "ready") {
          armTimeout(15000); setPhase("live"); setMessage("");
        } else if (data.type === "result") {
          armTimeout(15000); busy.current = false;
          if (data.mode !== currentMode.current) return;
          frame.current = { face: data.face, pose: data.pose };
          lastResult.current = performance.now();
        } else if (data.type === "error") {
          fail("얼굴·몸 인식을 시작하지 못했어요. 다시 시도하거나 Chrome·Safari에서 열어 주세요.");
        }
      };
      tracker.postMessage({ type: "init" });
    } catch (error) { if (id === generation.current) fail(cameraError(error)); }
  };

  useEffect(() => {
    let raf = 0;
    let lastSent = 0;
    let lastVideo = -1;
    let lastPaint = 0;
    let foundBefore: boolean | null = null;
    let active = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paint = (time: number) => {
      if (!active) return;
      const surface = canvas.current;
      const ctx = surface?.getContext("2d");
      if (!surface || !ctx) return;
      const camera = video.current;
      const live = phase === "live" && !!camera?.videoWidth;
      const width = live ? camera!.videoWidth : 720;
      const height = live ? camera!.videoHeight : 600;
      if (surface.width !== width || surface.height !== height) { surface.width = width; surface.height = height; }
      ctx.clearRect(0,0,width,height);
      const elapsed = lastPaint ? time-lastPaint : 16;
      lastPaint = time;
      if (live) {
        ctx.save();
        if (mirror) { ctx.translate(width,0); ctx.scale(-1,1); }
        ctx.drawImage(camera!,0,0,width,height);ctx.restore();
        // Expire old coordinates when the video or tracker stalls.
        const fresh = time-lastResult.current < 700 ? frame.current : EMPTY;
        renderedFrame.current = {
          face: followLandmarks(renderedFrame.current.face,fresh.face,elapsed,false),
          pose: followLandmarks(renderedFrame.current.pose,fresh.pose,elapsed),
        };
        const found = drawFilter(ctx,renderedFrame.current,filter,width,height,mirror,pink,time,{artwork,fit:fit/100});
        if (found !== foundBefore) { foundBefore = found; setTracked(found); }
        if (!busy.current && worker.current && time-lastSent > (currentMode.current === "face" ? 40 : 55) && camera!.currentTime !== lastVideo) {
          busy.current = true; lastSent = time; lastVideo = camera!.currentTime;
          const id = generation.current;
          const target = worker.current;
          createImageBitmap(camera!, { resizeWidth: 640, resizeHeight: Math.round(height/width*640) }).then((bitmap) => {
            if (id !== generation.current || target !== worker.current) { bitmap.close(); return; }
            // A render effect may restart when a filter or colour changes. It must not leave the worker busy.
            target.postMessage({ type: "frame", bitmap, time, mode: currentMode.current }, [bitmap]);
          }).catch(() => { if (id === generation.current) fail("카메라 화면을 읽지 못했어요. 카메라를 다시 켜 주세요."); });
        }
      } else {
        const sample = demoFrame(reduced ? 0 : time);
        drawDemo(ctx,sample,width,height);
        drawFilter(ctx,sample,filter,width,height,true,pink,reduced ? 0 : time,{artwork,fit:fit/100});
      }
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => { active = false; cancelAnimationFrame(raf); };
  }, [phase, filter, pink, mirror, fail, artwork, fit]);

  const pick = (id: FilterId) => {
    if(id === filter) return;
    setFilter(id); setFit(100); currentMode.current = filterMode(id); frame.current = EMPTY; renderedFrame.current = EMPTY; setTracked(false);
  };

  const capture = () => {
    if (phase !== "live" || !tracked || !canvas.current) return;
    const snapshot = document.createElement("canvas");
    snapshot.width = canvas.current.width; snapshot.height = canvas.current.height + 64;
    const ctx = snapshot.getContext("2d")!;
    ctx.drawImage(canvas.current,0,0);ctx.fillStyle="#faf9f5";ctx.fillRect(0,canvas.current.height,snapshot.width,64);
    ctx.fillStyle="#54775a";ctx.textAlign="center";ctx.font="600 20px system-ui";ctx.fillText(`${photoTitle(name)} · ${selected.name}`,snapshot.width/2,snapshot.height-24,snapshot.width-32);
    const id = generation.current;
    snapshot.toBlob((blob) => { if (blob && id === generation.current) { setPhoto(URL.createObjectURL(blob)); setFilename(photoFilename(name, filter)); setFlash(true); } }, "image/png");
  };

  return <div className="screen camera-screen">
    <div className="page-heading"><span className="eyebrow">작은 상상이 진짜 놀이로</span><h1 className="title">찰칵! 변신 사진관</h1><p className="subtitle">공룡, 로봇, 공주까지. 오늘은 어떤 모습으로 놀까?</p></div>
    <div className="camera-layout">
      <section className="camera-booth" aria-label="변신 거울">
        <div className={`camera-stage${flash ? " camera-flash" : ""}`}>
          <video ref={video} className="camera-source" muted playsInline aria-hidden="true" />
          <canvas ref={canvas} width={720} height={600} role="img" aria-label={phase === "live" ? `${selected.name} 카메라 화면` : `${selected.name} 그림 친구 미리보기`} />
          <span className={`camera-badge ${phase === "live" ? "is-live" : ""}`}><i />{phase === "live" ? "지금 변신 중" : "그림 친구 미리보기"}</span>
          <span className="camera-stage-label">{selected.emoji} {selected.name}</span>
          {phase === "loading" && <div className="camera-loading" role="status"><span className="camera-spinner" />{message}<button className="soft-btn" onClick={stop}>취소</button></div>}
        </div>
        <div className="camera-under">
          <p className="camera-tracking" role="status">{phase === "live" ? trackingHint(filter,tracked) : "카메라를 켜면 그림 친구 대신 내 모습으로 변신해요."}</p>
          {phase === "error" && <p className="camera-error" role="alert">{message}</p>}
          <div className="camera-controls">
            {phase === "live" ? <><button className="soft-btn" onClick={stop}>카메라 끄기</button><button className="camera-shutter" onClick={capture} disabled={!tracked} aria-label="변신 사진 찍기"><span /></button><button className="soft-btn" onClick={() => setMirror(!mirror)} aria-pressed={mirror}>거울 {mirror ? "켜짐" : "꺼짐"}</button></> : <button className="hero-start" onClick={start} disabled={phase === "loading"}>📷 {phase === "error" ? "카메라 다시 켜기" : "카메라 켜고 변신"}<span>→</span></button>}
          </div>
        </div>
      </section>
      <aside className="camera-wardrobe" aria-label="변신 소품 선택">
        <span className="eyebrow">오늘의 드레스룸 · {CAMERA_FILTERS.length}가지 변신</span><h2>어떤 모습이 좋아?</h2>
        <div className="camera-filters">{CAMERA_FILTERS.map((f) => <button key={f.id} className={`camera-filter ${filter === f.id ? "selected" : ""}`} onClick={() => pick(f.id)} aria-pressed={filter === f.id}><span className="camera-filter-icon">{artwork[f.id] ? <img src={artworkUrl(f.id,BASE)} alt="" /> : f.emoji}</span><span><strong>{f.name}</strong><small>{f.description}</small></span><span className="camera-filter-check" aria-hidden="true">{filter === f.id ? "✓" : "+"}</span></button>)}</div>
        <label className="camera-fit"><span>{selected.mode !== "face" ? "옷 너비 맞추기" : "소품 크기 맞추기"}<output>{fit}%</output></span><input aria-label={selected.mode !== "face" ? "옷 너비 맞추기" : "소품 크기 맞추기"} type="range" min="85" max="120" step="1" value={fit} onChange={(event) => setFit(Number(event.target.value))} /></label>
        {filter === "hanbok" && <div className="camera-colors" aria-label="한복 색"><span>마음에 드는 색</span><button onClick={() => setPink(false)} aria-pressed={!pink} aria-label="하늘빛 한복" style={{ background: "#619dab" }} /><button onClick={() => setPink(true)} aria-pressed={pink} aria-label="꽃분홍 한복" style={{ background: "#d57590" }} /></div>}
        <div className="camera-tip"><span>✦ 놀이 팁</span><p>{selected.mode === "costume" ? "얼굴과 어깨가 함께 보이게 서 봐. 왕관은 고개를, 드레스는 몸을 따라 움직여!" : selected.mode === "body" ? "어깨와 두 팔이 보이게 서서 천천히 움직여 봐. 소매도 팔을 따라 움직여!" : "얼굴을 밝게 비추고 천천히 고개를 움직여 봐. 소품도 같이 움직일 거야."}</p></div>
      </aside>
    </div>
    {photo && <section className="camera-photo" aria-label="찍은 사진"><img src={photo} alt="방금 찍은 변신 사진" /><div><span className="eyebrow">오늘의 멋진 순간</span><h2>이 모습, 간직할까?</h2><p>저장 버튼을 누르면 내 기기에 담겨요.</p><div className="inline-actions"><a className="soft-btn" href={photo} download={filename}>사진 저장 ↓</a><button className="soft-btn" onClick={() => setPhoto(null)}>사진 지우기</button></div></div></section>}
    <p className="camera-privacy">영상은 이 기기 안에서만 처리해요. 마이크는 사용하지 않고, 화면을 나가면 카메라도 꺼져요.</p>
  </div>;
}
