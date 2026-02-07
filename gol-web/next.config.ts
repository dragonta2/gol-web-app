import path from "path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    // ローカル public 配下の画像を最適化（WebP/AVIF 等）
    formats: ["image/avif", "image/webp"],
  },
  // 複数 lockfile 検出時のルート警告を防ぐ（このパッケージ＝gol-web をルートに指定）
  turbopack: {
    root: path.resolve(process.cwd()),
  },
}

export default nextConfig
