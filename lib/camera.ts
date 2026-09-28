export type FilterId = "hanbok" | "football" | "crown" | "bunny" | "glasses" | "dinosaur" | "robot" | "princess";
export type TrackingMode = "body" | "face" | "costume";
export type Landmark = { x: number; y: number; z?: number; visibility?: number };
export type TrackingFrame = { face: Landmark[]; pose: Landmark[] };
export type Point = { x: number; y: number };

export const CAMERA_FILTERS: { id: FilterId; emoji: string; name: string; description: string; mode: TrackingMode }[] = [
  { id: "dinosaur", emoji: "🦖", name: "꼬마 공룡", description: "크앙! 공룡 친구로 변신", mode: "face" },
  { id: "robot", emoji: "🤖", name: "우주 로봇", description: "삐빅! 우주 탐험 출발", mode: "face" },
  { id: "princess", emoji: "👸", name: "별빛 공주", description: "드레스와 왕관을 함께", mode: "costume" },
  { id: "hanbok", emoji: "🎎", name: "고운 한복", description: "팔을 벌려 인사해 봐", mode: "body" },
  { id: "football", emoji: "⚽", name: "축구 스타", description: "나만의 골 세리머니!", mode: "body" },
  { id: "crown", emoji: "👑", name: "반짝 왕관", description: "고개를 기울여 봐", mode: "face" },
  { id: "bunny", emoji: "🐰", name: "토끼 친구", description: "쫑긋쫑긋, 귀여운 귀", mode: "face" },
  { id: "glasses", emoji: "🕶️", name: "멋쟁이 안경", description: "오늘의 주인공은 나!", mode: "face" },
];

export function filterMode(id: FilterId): TrackingMode {
  if (id === "princess") return "costume";
  return id === "hanbok" || id === "football" ? "body" : "face";
}

export function trackingHint(id: FilterId, tracked: boolean): string {
  if (!tracked) return filterMode(id) === "face" ? "얼굴을 카메라 쪽으로 보여 줘." : "한 걸음 뒤로! 얼굴과 어깨, 두 팔이 보이게 서 봐.";
  if(id === "dinosaur") return "🦖 크앙! 작은 앞발을 들고 공룡 포즈!";
  if(id === "robot") return "🤖 삐빅! 로봇처럼 고개를 천천히 움직여 봐.";
  if(id === "princess") return "✨ 왕관과 드레스가 반짝! 우아하게 인사해 봐.";
  return "✦ 잘 따라가고 있어! 멋진 포즈를 지어 봐.";
}

function hasCoordinates(p: Landmark | undefined): p is Landmark {
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
}

export function visible(p: Landmark | undefined, threshold = .5): p is Landmark {
  return hasCoordinates(p) && (p.visibility ?? 1) >= threshold;
}

export function point(p: Landmark, width: number, height: number, mirror = true): Point {
  return { x: (mirror ? 1 - p.x : p.x) * width, y: p.y * height };
}

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function faceAnchor(face: Landmark[], width: number, height: number, mirror = true) {
  // FaceLandmarker returns visibility: 0 for unset scores. Presence is established
  // by the detected face array; only PoseLandmarker supplies per-point visibility.
  if (![33, 263, 10, 152].every((i) => hasCoordinates(face[i]))) return null;
  const eyes = [point(face[33], width, height, mirror), point(face[263], width, height, mirror)].sort((a, b) => a.x - b.x);
  const size = distance(eyes[0], eyes[1]);
  if (size < 8 || size > width * .8) return null;
  const center = midpoint(eyes[0], eyes[1]);
  const angle = Math.atan2(eyes[1].y - eyes[0].y, eyes[1].x - eyes[0].x);
  const nose = hasCoordinates(face[1]) ? point(face[1], width, height, mirror) : center;
  const offset = (nose.x-center.x)*Math.cos(angle)+(nose.y-center.y)*Math.sin(angle);
  const yaw = Math.max(-.65,Math.min(.65,offset/size*1.8));
  return { eyes: center, top: point(face[10], width, height, mirror), chin: point(face[152], width, height, mirror), nose, width: size * 1.8, angle, yaw };
}

export function bodyAnchor(pose: Landmark[], width: number, height: number, mirror = true) {
  if (![11, 12].every((i) => visible(pose[i]))) return null;
  const shoulders = [point(pose[11], width, height, mirror), point(pose[12], width, height, mirror)].sort((a, b) => a.x - b.x);
  const span = distance(shoulders[0], shoulders[1]);
  if (span < 25 || span > width * 1.2) return null;
  const center = midpoint(shoulders[0], shoulders[1]);
  const hips = [23, 24].every((i) => visible(pose[i])) ? midpoint(point(pose[23], width, height, mirror), point(pose[24], width, height, mirror)) : null;
  const length = hips ? Math.min(span * 1.65, Math.max(span * .85, distance(center, hips))) : span * 1.15;
  return { center, width: span, height: length, angle: Math.atan2(shoulders[1].y - shoulders[0].y, shoulders[1].x - shoulders[0].x) };
}

// Smoothing resets on loss, so a returning person never inherits a stale pose.
export function smoothLandmarks(previous: Landmark[], next: Landmark[], amount = .65, respectVisibility = true): Landmark[] {
  const valid = respectVisibility ? visible : hasCoordinates;
  return next.map((p, i) => {
    const old = previous[i];
    if (!valid(p) || !valid(old) || distance(old, p) > .25) return { ...p };
    return { ...p, x: old.x + (p.x - old.x) * amount, y: old.y + (p.y - old.y) * amount };
  });
}

/** Frame-rate independent, speed-adaptive smoothing. Slow jitter is damped;
 * deliberate fast movements catch up quickly. The render loop runs between inferences. */
export function followLandmarks(previous: Landmark[], next: Landmark[], elapsedMs: number, respectVisibility = true): Landmark[] {
  const seconds = Math.min(.1,Math.max(.001,elapsedMs/1000));
  const valid = respectVisibility ? visible : hasCoordinates;
  return next.map((p,i) => {
    const old = previous[i];
    if (!valid(p) || !valid(old)) return { ...p };
    const gap = distance(old,p);
    if (gap > .22) return { ...p };
    const rate = 10 + Math.min(35,gap*250);
    const alpha = 1-Math.exp(-rate*seconds);
    return { ...p, x: old.x+(p.x-old.x)*alpha, y: old.y+(p.y-old.y)*alpha };
  });
}

export function cameraError(error: unknown): string {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "카메라 권한이 꺼져 있어요. 주소창의 카메라 권한을 허용한 뒤 다시 눌러 주세요.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "연결된 카메라를 찾지 못했어요. 카메라를 연결하거나 카메라가 있는 기기에서 열어 주세요.";
  if (name === "NotReadableError" || name === "AbortError") return "다른 앱에서 카메라를 쓰고 있을 수 있어요. 카메라를 사용하는 앱을 닫고 다시 눌러 주세요.";
  return "카메라를 시작하지 못했어요. 다시 시도하거나 Chrome·Safari에서 열어 주세요.";
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

/** Animated illustration coordinates, exclusively used in the labelled demo. */
export function demoFrame(time: number): TrackingFrame {
  const sway = Math.sin(time / 1500) * .035;
  const nod = Math.sin(time / 2100) * .012;
  const p = (x: number, y: number): Landmark => ({ x: x + sway, y: y + nod, visibility: 1 });
  const face = Array.from({ length: 468 }, () => p(.5, .29));
  face[33] = p(.448, .27); face[263] = p(.552, .276);
  face[10] = p(.5, .16); face[152] = p(.5, .375); face[1] = p(.5, .3);
  const pose = Array.from({ length: 33 }, () => p(.5, .5));
  pose[11] = p(.365, .43); pose[12] = p(.635, .43);
  pose[13] = p(.27, .55 + Math.sin(time / 900) * .065); pose[14] = p(.73, .55);
  pose[15] = p(.20, .40 + Math.sin(time / 900) * .12); pose[16] = p(.79, .41);
  pose[23] = p(.4, .77); pose[24] = p(.6, .77);
  return { face, pose };
}
