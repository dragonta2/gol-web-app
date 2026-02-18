# Notion MCP 連携メモ

## 実装結果（260218頃）

- ダッシュボードの日誌セクションに「Notionから取り込み」ボタンを追加（`journal-impression-sections.tsx`）
- 選択中の日付で `POST /api/notion/import` を呼び出し、Notion DB の「日誌」「感想」を取得
- 既存テキストがある場合は確認ダイアログでプレビュー表示し、「上書きする」で反映。空の場合はそのまま反映
- 環境変数: `NOTION_API_KEY` と `NOTION_JOURNAL_DB_ID`。項目は `.env.example` にあり、**実際にアプリが読むのは `.env.local`** に設定した値。API Route は `app/api/notion/import/route.ts`、`@notionhq/client` を使用
- エラー時は toast で「該当日の日誌が見つかりません」または API エラーメッセージを表示。ローディング中はボタンにスピナー表示

## これからやること

- 運用しながら不具合や要望があれば対話で調整する

## いままでやったこと

### トークン設定

- Notion で内部インテグレーション「GOL-WEB連携」を作成し、内部インテグレーションシークレット（`ntn_...`）を取得
- Cursor の MCP 設定はグローバル: `~/.cursor/mcp.json`
- 方法Aを採用: `OPENAPI_MCP_HEADERS` の `Authorization` にトークンを直接記載（`${NOTION_API_KEY}` ではなく `Bearer ntn_...` とし、`${` と `}` は使わない）
- Cursor 再起動後に MCP から Notion API 呼び出しで接続確認済み（ワークスペース: 辰彦's Notion）

### 参照するページ・DB

- 日誌トップページ（共有済み）:

```
https://www.notion.so/043d1fffc88848fd927108943575b172
```
- ページ内の「日誌｜1週間」「日誌｜すべて」はリンクされたビューであり、**元のデータベース**を別途共有する必要があった
- 元の DB を共有済み:

```
https://www.notion.so/22feac3fdfa4478caca2d75c1d5e35c5?v=91034d9fb8324ba783bff7a0dd886242
```
  - DB ID: `22feac3f-dfa4-478c-aca2-d75c1d5e35c5`
  - タイトル: 日誌

### DB スキーマ（取得済み）

- **日付** (date)
- **日誌** (rich_text) … 本文
- **感想** (rich_text) … 感想（プロパティID: qKRW）。名前変更しても API では同一プロパティとして参照可能
- その他: 体調・体調｜コメント、メンタル・メンタル｜コメント、天気、予定、今日やりたいこと、明日｜予定｜やりたい事、サマリー（計算）、パフォーマンス、パフォーマンスポイント など

### 補足

- 感想は日誌と同じ DB の「感想」列に存在する（別DBではない）
- MCP からは `API-retrieve-a-database` でスキーマ取得まで確認済み。DB クエリ（一覧取得）は利用している MCP ツール名・仕様が異なる可能性あり。GOL-Web の「取り込み」実装時は Notion API をアプリ側（例: API Route）から呼ぶ構成も検討する
