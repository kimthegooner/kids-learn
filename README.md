# 아이랑 한글·영어 🍎🐶

다섯 살(아직 글자를 못 읽는) 아이를 위한 **소리 중심** 한글·영어 놀이 웹앱.
태블릿(아이패드) 가로 전체화면에 맞춰 큰 그림·큰 버튼으로 구성.

## 설계 원칙
- **소리 우선, 글자는 보조** — 모든 화면은 큰 그림 + 자동 음성. 지시문은 음성으로.
- **한·영 병행** — 같은 그림에 "사과 / apple"을 연속으로 들려줌.
- **터치 한 번 = 소리 한 번** — 아이가 혼자 눌러도 작동.
- **세션 5~7분** — 짧게 끝나고 별 보상.

## 실행
```bash
npm install
npm run dev
# http://localhost:3000  (태블릿에선 같은 와이파이로 PC IP:3000)
```

## 화면 흐름
**언어 선택(한글 / 영어)** → 한글 → **카테고리 8종(동물·바다·과일·음식·탈것·자연·몸·물건)** → **활동 4종**
- **배우기** : 그림 1장 + 자동 음성, 탭하면 다시, ◀▶로 이동
- **잇기(연결)** : 왼쪽 그림 ↔ 오른쪽 한글 단어를 짝지어 연결. 그림을 누르면 소리, 맞는 단어를 누르면 ✓ 연결. 3쌍 완성 → 별
- **따라쓰기** : 낱말을 **음절 합성한 획순**으로 보여줌(글자가 합쳐진 모양 그대로). 굵은 검은 획이 순서대로 그려지는 애니메이션 + 흰 점선 방향 화살표 + 음절별 번호, 그 위에 손가락으로 따라 쓰기. 합성 엔진 `lib/hangul.ts`(초/중/종성 분해 → 자모 획을 음절 칸에 배치)
- **획순쓰기** : 자음·모음 한 글자의 획순을 같은 방식으로(낱자 단위) 익히기. `components/StrokeScreen.tsx`

> 단어는 100개(`data/words.json`). 영어는 현재 "곧 만나요"(준비중) — 한글이 자리잡은 뒤 별도 트랙으로 확장.

## 콘텐츠 추가/교체

### 단어
`lib/words.ts` 의 `WORDS` 배열에 객체를 추가하면 끝. 한 단어 = 한 객체.

### 그림(AI 생성 이미지) — 한 번에 100장 생성
모든 단어는 이미 `/images/<id>.png` 를 바라보도록 배선돼 있다.
파일이 **없으면 이모지로 자동 폴백**, 채워 넣으면 그때부터 그림이 보인다(코드 수정 불필요).

```bash
OPENAI_API_KEY=sk-... npm run gen-images
```
- `data/words.json` 의 100개 단어를 **고정 스타일 프롬프트**(아래)로 일괄 생성해
  `public/images/<id>.png` 로 저장. 이미 있는 파일은 건너뜀(이어받기 가능).
- 기본은 OpenAI Images(gpt-image-1). 다른 API는 `scripts/gen-images.mjs` 의 `callImageApi()` 만 교체.
- ⚠️ 비용 주의: 100장 생성은 수~십수 달러가 청구될 수 있음.

고정 스타일:
```
A single {english word}, cute flat illustration for a children's app,
soft rounded shapes, bright pastel colors, thick outlines,
centered on a plain off-white background, no text, no shadow.
```

### 축구선수 사진 (실제 인물)
`scripts/fetch-photos.mjs` 가 위키피디아/위키미디어 공용에서 사진을 받아 `public/images/<id>.png` 로 저장:
```bash
node scripts/fetch-photos.mjs
```
- 선수(사카·홀란드·야말): 위키피디아 인포박스 사진(대개 CC 라이선스). 받은 뒤 `sips -Z 800 *.png` 로 다운스케일 권장.
- 구단(아스날·리버풀): 엠블럼은 **상표/비자유** — 개인용으로만. 배포 시 제외 필요.
- ⚠️ 나무위키 사진은 대부분 저작권 있는 보도사진이라 사용하지 않음.

### 아빠 목소리 녹음 끼워넣기 (나중에)
1. 단어를 또박또박 녹음해 `public/audio/ko/<id>.mp3`, `public/audio/en/<id>.mp3` 로 저장.
2. 해당 단어에 `audioKo: "/audio/ko/apple.mp3"`, `audioEn: "/audio/en/apple.mp3"` 추가.
   → 녹음이 있으면 TTS 대신 자동으로 녹음이 재생된다. (없으면 브라우저 TTS 폴백)

## 음성에 대해
현재는 브라우저 내장 **Web Speech API(TTS)** 사용 — 무료·키 불필요.
한국어 TTS 음성 품질은 기기/브라우저(특히 iOS Safari, macOS)에 따라 다르다.
아이가 잘 붙으면 위 방식으로 **아빠 목소리 녹음**으로 업그레이드 권장.

## 단어별 AI 이미지 프롬프트 (복사용)
`scripts/image-prompts.txt` 에 16개 단어 전체 프롬프트가 들어있다.
