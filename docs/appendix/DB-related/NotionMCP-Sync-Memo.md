# Notion MCP 連携メモ

## Notionから取り込みで起きた不具合と解決（260218頃）

「Notionから取り込み」ボタンで発生した問題の原因と対応内容。

### 不具合1: Could not find database with ID（404）

- **症状**: ボタン押下で「Could not find database with ID: 22feac3f-... Make sure the relevant pages and databases are shared with your integration.」と表示される。DB ID と .env.local の設定は正しいように見える。
- **原因**: **シェル環境変数**に古い `NOTION_API_KEY`（別のインテグレーションのキー、末尾が `i3W0` など）が設定されており、Next.js がそれを読み込んでいた。Next.js はシステム環境変数を `.env.local` より優先するため、.env.local に正しいキー（末尾 `74Lj`、日誌 DB にアクセスできる方）を書いても**上書きされず無視されていた**。
- **解決**: API Route（`app/api/notion/import/route.ts`）で、`process.env.NOTION_API_KEY` だけでなく **.env.local を直接読み、値が異なればファイルの値を優先する** `resolveNotionApiKey()` を導入。本番（.env.local が無い環境）では従来どおり `process.env` を使用。
- **補足**: デバッグ時に Notion の search API で「この API Key がアクセスできる DB」を取得したところ、日誌 DB ではなく「MCPテスト DB」のみだったことから、使われているキーが別物だと判明した。

### 不具合2: 感想は取り込めるが日誌が空になる

- **症状**: Notionから取り込みは成功するが、**感想**だけ反映され、**日誌**のテキストが空のままになる。
- **原因**: コードで Notion のプロパティを **ID**（`nf=t`, `qKRW`）で参照していた。Notion API のレスポンスではプロパティが**名前**（`日誌`, `感想`）をキーとして返す。また「日誌」のプロパティ ID は API 上では URL エンコードされて `nf%3Dt` となり、`nf=t` での検索と一致しなかった。感想の ID（`qKRW`）はエンコード対象文字がなく、たまたま fallback で見つかっていた。
- **解決**: プロパティを **名前**（`日誌`, `感想`）で直接参照するように変更。fallback で ID を探す場合は `nf%3Dt` と `nf=t` の両方に対応。

### まとめ

- **API Key**: シェルに `NOTION_API_KEY` を export していると .env.local が効かない。.env.local を優先する読み込みを API Route に追加して対応。
- **日誌・感想の取得**: Notion のページ properties は**プロパティ名**をキーにしているので、`props['日誌']` / `props['感想']` で取得する。

---

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

## Notion MCP がつながらないとき

- **設定の場所**: Cursor の MCP はグローバル設定 `~/.cursor/mcp.json` または Cursor 設定画面の「MCP」で管理される。このリポジトリの `mcps/user-notionApi/` はツール定義の参照用で、**接続に使うトークンやコマンドは mcp.json 側**に書く。
- **確認すること**
  - `~/.cursor/mcp.json` で Notion 用の MCP エントリ（例: notionApi / user-notionApi）があるか
  - そのエントリで `OPENAPI_MCP_HEADERS` の `Authorization` が `Bearer ntn_xxxx...` の形で**正しいシークレット**になっているか（`${NOTION_API_KEY}` などの変数は使わず、実際のトークン文字列を書く）
  - Notion の「マイインテグレーション」で該当インテグレーションのシークレットを再コピーし、mcp.json の値と完全に一致させる
  - Cursor を**完全に終了してから再起動**し、MCP が読み直されるか確認する
- **GOL Web の「Notionから取り込み」**は MCP を使わず、`gol-web/.env.local` の `NOTION_API_KEY` と `NOTION_JOURNAL_DB_ID` で API Route が直接 Notion API を呼ぶ。MCP がつながらなくても、この機能は .env.local が正しければ動作する。
