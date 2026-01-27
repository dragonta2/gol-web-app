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
