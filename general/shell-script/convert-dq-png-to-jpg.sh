#!/usr/bin/env bash
# dq オリジナルPNG を同じサイズで圧縮した JPG に変換し compressed に出力
# 必要: ImageMagick (brew install imagemagick)
SRC="/Users/ta2/Downloads/_Tmp/GOL用/avatars/dq/オリジナルPNG"
DST="/Users/ta2/Downloads/_Tmp/GOL用/avatars/dq/compressed"

if [ ! -d "$SRC" ]; then
  echo "ソースがありません: $SRC"
  exit 1
fi
mkdir -p "$DST"

if ! command -v magick &>/dev/null; then
  echo "ImageMagick が必要です: brew install imagemagick"
  exit 1
fi

count=0
for f in "$SRC"/*.png "$SRC"/*.PNG; do
  [ -f "$f" ] || continue
  base=$(basename "$f" .png)
  base=$(basename "$base" .PNG)
  out="$DST/${base}.jpg"
  magick "$f" -strip -quality 82 -interlace Plane "$out" && echo "$f -> $out" && count=$((count+1))
done
echo "--- 完了 ($count 件) ---"
ls -la "$DST"
