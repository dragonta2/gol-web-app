#!/usr/bin/env bash
# ghost アイコン画像を yoN-i → i-yoN にリネーム（オリジナルPNG用）
DIR="/Users/ta2/Downloads/_Tmp/GOL用/avatars/ghost/オリジナルPNG"
if [ ! -d "$DIR" ]; then
  echo "ディレクトリがありません: $DIR"
  exit 1
fi
cd "$DIR" || exit 1
for f in yo*-i.*; do
  [ -f "$f" ] || continue
  n=$(echo "$f" | sed -E 's/yo([0-9]+)-i\.(.*)/i-yo\1.\2/')
  mv "$f" "$n" && echo "$f -> $n"
done
echo "--- 完了 ---"
ls -la "$DIR"
