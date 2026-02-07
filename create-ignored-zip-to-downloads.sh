#!/bin/bash
# 別 Mac に渡したい gitignore ファイルだけを ZIP にし、Downloads に出力する
# （node_modules / .next は含めない → 相手先で npm install すればよい）
set -e
cd "$(dirname "$0")"
ZIP_NAME="gol-web-app-ignored-files.zip"
OUTPUT_DIR="${HOME}/Downloads"

# 渡したいファイルだけを指定（存在するものだけ ZIP に追加）
FILES=(
  docs/0-AI-prompt-memo.md
  docs/2-gol-design-doc.md
  gol-web/.env.local
)

existing=()
for f in "${FILES[@]}"; do
  if [[ -f "$f" ]]; then
    existing+=("$f")
    echo "  追加: $f"
  fi
done

if (( ${#existing[@]} == 0 )); then
  echo "対象ファイルが一つもありません。"
  exit 1
fi

echo "ZIP 作成中..."
zip -q -r "$ZIP_NAME" "${existing[@]}"

echo "Downloads にコピー中..."
cp "$ZIP_NAME" "$OUTPUT_DIR/"
rm -f "$ZIP_NAME"
echo "完了: $OUTPUT_DIR/$ZIP_NAME"
