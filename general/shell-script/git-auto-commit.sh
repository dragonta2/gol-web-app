#!/bin/bash

# GOL Web版（web-app）の自動コミット・プッシュスクリプト
# 1日1回のみ実行（今日すでにコミット済みならスキップ）

# スクリプトのディレクトリから相対的にリポジトリのパスを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_PATH="$(cd "$SCRIPT_DIR/.." && pwd)"
LAST_COMMIT_FILE="${REPO_PATH}/general/.last-commit-date.md"
TODAY=$(date '+%Y%m%d')

cd "$REPO_PATH" || exit 1

# 今日すでにコミット済みかチェック
if [ -f "$LAST_COMMIT_FILE" ]; then
    LAST_COMMIT_DATE=$(cat "$LAST_COMMIT_FILE")
    if [ "$LAST_COMMIT_DATE" = "$TODAY" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 今日はすでにコミット済みです。スキップします。"
        exit 0
    fi
fi

# Gitリポジトリかチェック
if [ ! -d ".git" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] エラー: Gitリポジトリではありません。"
    exit 1
fi

# 変更があるかチェック
if git diff --quiet && git diff --cached --quiet; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 変更がありません。スキップします。"
    # 変更がなくても、今日の日付を記録（1日1回制限のため）
    echo "$TODAY" > "$LAST_COMMIT_FILE"
    exit 0
fi

# コミット・プッシュ実行
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 自動コミットを開始します..."

# Web版の場合は、gol-web/ と docs/ をコミット対象にする
git add gol-web/ docs/ 2>&1

# コミットメッセージ（日付形式）
COMMIT_MESSAGE="Auto commit: $(date '+%Y%m%d')"

git commit -m "$COMMIT_MESSAGE" 2>&1

if [ $? -eq 0 ]; then
    # プッシュ（エラーは無視）
    git push origin main 2>&1
    
    # 今日の日付を記録
    echo "$TODAY" > "$LAST_COMMIT_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 自動コミットが完了しました。"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] コミットに失敗しました。"
    exit 1
fi
