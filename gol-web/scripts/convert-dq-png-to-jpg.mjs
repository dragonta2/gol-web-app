#!/usr/bin/env node
/**
 * dq オリジナルPNG を同じサイズで圧縮した JPG に変換し compressed に出力
 * 実行: node scripts/convert-dq-png-to-jpg.mjs (gol-web から)
 */
import sharp from "sharp"
import fs from "fs"
import path from "path"

const SRC = "/Users/ta2/Downloads/_Tmp/GOL用/avatars/dq/オリジナルPNG"
const DST = "/Users/ta2/Downloads/_Tmp/GOL用/avatars/dq/compressed"
const QUALITY = 82

if (!fs.existsSync(SRC)) {
  console.error("ソースがありません:", SRC)
  process.exit(1)
}
fs.mkdirSync(DST, { recursive: true })

const files = fs.readdirSync(SRC).filter((f) => /\.png$/i.test(f))
for (const f of files) {
  const base = path.basename(f, path.extname(f))
  const srcPath = path.join(SRC, f)
  const dstPath = path.join(DST, base + ".jpg")
  await sharp(srcPath)
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(dstPath)
  console.log(srcPath, "->", dstPath)
}
console.log("--- 完了 ---")
