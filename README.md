# GOL Web版（gol-web-app）

習慣・ToDo・日誌を扱うWebアプリ。Next.js + Supabase + OpenAI を利用しています。

**md-app（マークダウンファイル版）と web-app（Webアプリ版）は、それぞれ独立したリポジトリで管理しています。** 本リポジトリは web-app 用（gol-web-app）、md-app 用は gol-md-app です。

## 構成

| 場所 | 内容 |
|------|------|
| `gol-web/` | Next.js アプリ本体。起動・ビルド・環境変数は [gol-web/README.md](./gol-web/README.md) を参照 |
| `docs/` | 設計・進捗・DBスキーマ・運用メモなど |
| `PROJECT_STRUCTURE.md` | ディレクトリ構造の説明 |

## クイックスタート

```bash
cd gol-web
cp .env.example .env.local   # 未作成なら。中身は gol-web/README 参照
npm install
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## 必要環境

- Node.js 18+
- Supabase プロジェクト（URL・anon key を `.env.local` に設定）
- OpenAI API キー（AI機能を使う場合、`.env.local` に設定）

詳細は `gol-web/README.md` の「環境変数設定」を参照してください。

## 自動コミットシステム

このリポジトリには、PC起動時に自動的にGitコミット・プッシュを実行するシステムが設定されています。

### 機能

- ✅ **PC起動時に自動実行**: macOSのlaunchdを使用
- ✅ **1日1回のみ実行**: 同じ日には重複実行しない
- ✅ **変更がある場合のみコミット**: 変更がない場合はスキップ
- ✅ **自動プッシュ**: コミット後、自動的にGitHubにプッシュ

### 仕組み

1. PC起動時に`general/git-auto-commit.sh`が自動実行されます
2. スクリプトは「今日すでにコミットしたか」を確認します（`.last-commit-date.md`を参照）
3. 変更がある場合、`gol-web/`と`docs/`ディレクトリをコミット・プッシュします
4. 実行結果はログファイルに記録されます：
   - `/Users/ta2/Library/Logs/com.gol.web-app.git-auto-commit.log`
   - `/Users/ta2/Library/Logs/com.gol.web-app.git-auto-commit.error.log`

### 手動実行

必要に応じて、手動でスクリプトを実行することもできます：

```bash
cd /Users/ta2/ALL-DTA2/Develop/dta2/gol/web-app
./general/git-auto-commit.sh
```

### 設定ファイル

自動実行の設定は以下のファイルで管理されています：

- **launchd設定**: `~/Library/LaunchAgents/com.gol.web-app.git-auto-commit.plist`
- **スクリプト**: `general/git-auto-commit.sh`
- **日付記録**: `general/.last-commit-date.md`

### 無効化・再有効化

自動実行を一時的に無効化する場合：

```bash
launchctl bootout gui/$(id -u)/com.gol.web-app.git-auto-commit
```

再有効化する場合：

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.gol.web-app.git-auto-commit.plist
```

### 初回セットアップ（新しいMacでのセットアップ）

**方法1: セットアップスクリプトを使用（推奨）**

1. リポジトリをクローンまたはpull：

```bash
cd /path/to/gol-web-app  # リポジトリのパスに置き換え
```

2. セットアップスクリプトを実行：

```bash
./general/setup-auto-commit.sh
```

これで自動的に以下が実行されます：
- スクリプトの実行権限設定
- launchd設定ファイルの作成・配置
- launchdへのロード

**方法2: 手動セットアップ**

1. 自動コミットスクリプトの実行権限を設定：

```bash
chmod +x general/git-auto-commit.sh
```

2. テンプレートからlaunchd設定ファイルを作成：

```bash
# リポジトリのパスとユーザー名を取得
REPO_PATH=$(pwd)
USERNAME=$(whoami)

# テンプレートからplistファイルを生成
sed -e "s|REPO_PATH_PLACEHOLDER|${REPO_PATH}|g" \
    -e "s|USERNAME_PLACEHOLDER|${USERNAME}|g" \
    general/git-auto-commit.plist.template > ~/Library/LaunchAgents/com.gol.web-app.git-auto-commit.plist
```

3. launchd設定をロード：

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.gol.web-app.git-auto-commit.plist
```

### 動作確認

セットアップ後、手動でスクリプトを実行して動作確認できます：

```bash
./general/git-auto-commit.sh
```

ログを確認する場合：

```bash
tail -f ~/Library/Logs/com.gol.web-app.git-auto-commit.log
```

## ブランチ運用

このプロジェクトは**個人プロジェクト**のため、シンプルな運用を採用しています。

- **mainブランチへの直接push**: PR（プルリクエスト）は不要で、mainブランチに直接pushします
- **ブランチ分けは不要**: 実験的な機能や複数人での開発がないため、ブランチを分ける必要はありません
- **シンプルさを優先**: 個人運用では複雑なブランチ戦略よりも、シンプルな運用が効率的です
