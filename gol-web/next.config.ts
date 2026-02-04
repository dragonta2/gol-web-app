import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    // ローカル public 配下の画像を最適化（WebP/AVIF 等）
    formats: ["image/avif", "image/webp"],
  },
}

export default nextConfig
