#!/bin/bash

# GOL Web版 自動コミットシステムのセットアップスクリプト
# このスクリプトを実行すると、launchd設定ファイルが自動的に作成・配置されます

set -e

# スクリプトのディレクトリから相対的にリポジトリのパスを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_PATH="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_FILE="${SCRIPT_DIR}/git-auto-commit.plist.template"
PLIST_FILE="${HOME}/Library/LaunchAgents/com.gol.web-app.git-auto-commit.plist"
USERNAME=$(whoami)

echo "=========================================="
echo "GOL Web版 自動コミットシステム セットアップ"
echo "=========================================="
echo ""

# リポジトリのパスを確認
if [ ! -d "${REPO_PATH}/.git" ]; then
    echo "エラー: ${REPO_PATH} はGitリポジトリではありません。"
    exit 1
fi

echo "リポジトリパス: ${REPO_PATH}"
echo "ユーザー名: ${USERNAME}"
echo ""

# テンプレートファイルの存在確認
if [ ! -f "${TEMPLATE_FILE}" ]; then
    echo "エラー: テンプレートファイルが見つかりません: ${TEMPLATE_FILE}"
    exit 1
fi

# スクリプトの実行権限を確認・設定
if [ ! -x "${REPO_PATH}/general/git-auto-commit.sh" ]; then
    echo "スクリプトに実行権限を設定しています..."
    chmod +x "${REPO_PATH}/general/git-auto-commit.sh"
fi

# LaunchAgentsディレクトリの存在確認
if [ ! -d "${HOME}/Library/LaunchAgents" ]; then
    echo "LaunchAgentsディレクトリを作成しています..."
    mkdir -p "${HOME}/Library/LaunchAgents"
fi

# 既存のplistファイルがある場合、一度アンロード
if [ -f "${PLIST_FILE}" ]; then
    echo "既存の設定をアンロードしています..."
    launchctl bootout "gui/$(id -u)/com.gol.web-app.git-auto-commit" 2>/dev/null || true
fi

# テンプレートからplistファイルを生成
echo "launchd設定ファイルを作成しています..."
sed -e "s|REPO_PATH_PLACEHOLDER|${REPO_PATH}|g" \
    -e "s|USERNAME_PLACEHOLDER|${USERNAME}|g" \
    "${TEMPLATE_FILE}" > "${PLIST_FILE}"

echo "設定ファイルを配置しました: ${PLIST_FILE}"
echo ""

# launchdにロード
echo "launchdに設定をロードしています..."
if launchctl bootstrap "gui/$(id -u)" "${PLIST_FILE}" 2>/dev/null; then
    echo "✅ セットアップが完了しました！"
    echo ""
    echo "PC起動時に自動的にGitコミット・プッシュが実行されます。"
    echo ""
    echo "動作確認:"
    echo "  ./general/git-auto-commit.sh"
    echo ""
    echo "ログ確認:"
    echo "  tail -f ~/Library/Logs/com.gol.web-app.git-auto-commit.log"
    echo ""
else
    echo "⚠️  ロードに失敗しましたが、設定ファイルは作成されました。"
    echo "手動でロードする場合:"
    echo "  launchctl bootstrap gui/\$(id -u) ${PLIST_FILE}"
    echo ""
fi
