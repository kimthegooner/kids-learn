/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export", // 정적 사이트로 내보내기 (GitHub Pages 등)
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
