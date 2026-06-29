// 배포 서브경로 대응.
// - 로컬 개발: 루트(/)에서 서빙 → BASE = ""
// - GitHub Pages: /kids-learn/ 에서 서빙 → 빌드 시 NEXT_PUBLIC_BASE_PATH=/kids-learn
// 이미지 등 정적 자원 경로 앞에 BASE 를 붙여 쓴다.
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
