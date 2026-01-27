#!/bin/bash
# すべて add して commit まで（メッセージは -）
set -e
cd "$(dirname "$0")"
git add -A
git status -s
git commit -m "-"
echo "完了。"
