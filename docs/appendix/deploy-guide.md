# GOL Web版｜デプロイ手順書

**このファイルの役割:** 本番デプロイに必要な環境変数・設定・手順・セキュリティ確認をまとめる。


**実行チェックリスト（上から順に実施）**

- [x] **1** 環境変数: `.env.example` を確認。ローカルなら `cp gol-web/.env.example gol-web/.env.local` して値を埋める

- [x] **2** 本番環境: Supabase でプロジェクト作成・API キー取得。OpenAI で API キー取得。Vercel にまだ環境変数を入れない（6 で入れる）

- [x] **3** ビルド: `cd gol-web && npm run build` が成功することを確認（未実施なら実行）

- [ ] **4** セキュリティ: 本番デプロイ後、未認証で API にアクセスして 401/0 件になること・他ユーザーデータが返らないことを確認

- [x] **5** パフォーマンス: ビルドログに致命的な警告がないこと（3 のビルドで確認済みなら OK）

- [ ] **6** デプロイ: Vercel にリポジトリ連携・Root Directory を `gol-web` に設定・環境変数設定・Supabase の Redirect URLs 追加・Deploy 実行


---

## 1. 環境変数の整理とドキュメント化

- **一覧**: `gol-web/.env.example` を参照。必要な変数と用途がコメントで記載されている

- **ローカル**: `cp gol-web/.env.example gol-web/.env.local` のあと、値を埋める

- **本番（Vercel）**: Vercel のプロジェクト設定 > Environment Variables に同じキーで値を登録する


**必須の環境変数**

- **NEXT_PUBLIC_SUPABASE_URL**: Supabase プロジェクトの URL（例: `https://xxxxx.supabase.co`）

- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Supabase の anon key（公開用。RLS で保護される）

- **OPENAI_API_KEY**: OpenAI API キー（**サーバー専用。NEXT_PUBLIC_ にしてはいけない**）


**任意**

- **NEXT_PUBLIC_ADMIN_EMAILS**: お知らせの追加・編集を許可する管理者メール（カンマ区切り）


---

## 2. 本番環境の設定（Supabase・OpenAI）

**あなたがやること（順番）**

1. Supabase: ダッシュボードで本番用プロジェクトを作成（または既存を使用）。Settings > API で Project URL と anon key をメモ

2. Supabase: SQL Editor で `docs/sql-snippet/supabase-setup.sql` を実行。必要なら `set-new-user-defaults.sql` と `create-announcements-table.sql` も実行

3. Supabase: Authentication > URL Configuration は、Vercel の本番 URL が決まってから設定（6 のあとでよい）

4. OpenAI: API キーを取得してメモ（6 で Vercel の環境変数に登録する）

5. ここまでで「本番用の Supabase URL・anon key・OpenAI API キー」が手元にある状態にしておく

### Supabase

- Supabase ダッシュボードで本番用プロジェクトを作成（または既存を使用）

- **Settings > API**: Project URL と anon public key をコピーし、Vercel の環境変数に設定

- **Authentication > URL Configuration**: Site URL に本番 URL（例: `https://your-app.vercel.app`）を設定。Redirect URLs に同じ URL と `https://your-app.vercel.app/auth/callback` を追加

- **SQL Editor**: テーブル・RLS・トリガーを `docs/appendix/DATABASE_SCHEMA.md` および `docs/sql-snippet/` の SQL で反映。初回は `supabase-setup.sql`、新規ユーザー初期値は `set-new-user-defaults.sql`、お知らせは `create-announcements-table.sql` を必要に応じて実行

- Google OAuth を使う場合は Supabase の Authentication > Providers > Google でクライアント ID / シークレットを設定

### OpenAI API

- OpenAI の API キーを取得し、Vercel の環境変数に **OPENAI_API_KEY** として設定（Secret 推奨）

- キーは API Route（`/api/ai/*`）でのみ使用され、クライアントには送らない


---

## 3. ビルドエラーの解消

- リポジトリルートで `cd gol-web && npm run build` を実行

- エラーが出た場合は TypeScript・ESLint の指摘を解消してから再ビルド

- 本番では Vercel が `main` ブランチへの push 時に自動で `npm run build` を実行する


---

## 4. セキュリティチェック（RLS・APIキー保護）

**API キー保護**

- **OPENAI_API_KEY** はサーバー側（API Route）のみで参照。`NEXT_PUBLIC_` を付けていないためクライアントにバンドルされない

- **SUPABASE_SERVICE_ROLE_KEY** はスクリプト用。本番の Vercel には通常設定しない。設定する場合は Secret にし、クライアントから絶対に参照されないようにする


**RLS（Row Level Security）**

- 全テーブルで RLS を有効化し、`auth.uid()` と一致するユーザーのデータのみアクセス可能（設計は `docs/appendix/DATABASE_SCHEMA.md` の「Row Level Security」を参照）

- 本番 DB で RLS ポリシーが適用されているか、Supabase の Table Editor > 各テーブル > RLS で確認する


**本番で確認すること**

- 未認証で日誌・習慣・ToDo の API に直接アクセスすると 401 または 0 件になること

- 他ユーザーのデータが返らないこと（別アカウントでログインして確認）


---

## 5. パフォーマンステスト

- **ビルド**: `npm run build` が成功し、ビルドログに大きなエラーや警告が出ていないことを確認

- **バンドル**: Next.js のビルド出力でクライアントバンドルサイズを確認。必要に応じて動的 import や不要な依存の削減を検討

- 本番では Vercel の Functions ログでレスポンス時間・エラー率を必要に応じて確認する


---

## 6. デプロイ手順（Vercel）

**初回のみ**

1. Vercel に GitHub リポジトリを連携し、プロジェクトを作成

2. Root Directory を **gol-web** に設定（プロジェクトルートが `gol-web` の場合）

3. 環境変数を設定: `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`OPENAI_API_KEY`（必要なら `NEXT_PUBLIC_ADMIN_EMAILS`）

4. Supabase の Redirect URLs に Vercel の本番 URL と `https://<your-app>.vercel.app/auth/callback` を追加

5. Deploy を実行


**通常のデプロイ**

- **main** ブランチへ push すると Vercel が自動でビルド・デプロイする

- 手動でデプロイする場合は Vercel ダッシュボードの Deployments から「Redeploy」または CLI（`vercel --prod`）を使用


**障害時**

- Vercel の Deployments / Functions ログでビルド失敗・ランタイムエラーを確認

- Supabase の Logs で DB エラーを確認

- 認証不具合の場合は Supabase の Redirect URLs と環境変数を再確認

- DB まわり: RLS ポリシーやトリガーが本番で正しく入っているか確認。必要なら SQL を再実行または修正して反映


**定期・継続作業**

- **DB の変更**: スキーマ変更や新しい SQL スニペットがあるときだけ、Supabase SQL Editor で必要な SQL を実行。実行内容は `docs/sql-snippet/` に残す

- **監視**: 落ちていないか・エラーが増えていないかは、Vercel の Functions ログ・Supabase の Logs を必要に応じて確認


---

## 7. 運用イメージ・方針・料金（2 と重複分の要約）

**どこに何を置くか**

- フロント＋API（Next.js）: Vercel にデプロイ。ユーザーがアクセスする URL をここに張る

- 認証・DB（Supabase）: 本番用プロジェクト 1 本。URL / anon key を環境変数に設定

- AI（OpenAI）: API キーを環境変数に設定。API Route 経由で呼び出し（クライアントにキーを出さない）


**利用方針（少人数運用）**

- 開発者も普段は本番 URL で利用するのがおすすめ（本番でしか起きない不具合に気づきやすい。Google ログインも本番で試せる）

- 開発・デバッグ時だけ localhost を使い、試し終わったら push して本番で確認

- ホスティングは Vercel 推奨（Next.js と相性が良い。2 名程度なら Amplify とコスト差はほぼないが、設定の手軽さで Vercel が有利）。詳細は `1-spec-sheet.md` の「利用方針・ホスティング選定」を参照


**料金目安**

- Vercel: 個人 Hobby プランで小規模なら 0 円

- Supabase: 無料枠あり。超過・Pro は公式参照

- OpenAI: 従量課金。個人・少人数なら「Vercel 無料 + Supabase 無料 + OpenAI 従量」で月数百円〜数千円程度の想定


---

## 8. バックアップ・復旧

- Supabase はプロジェクト単位のバックアップ・PITR が有料プランで利用可能。無料枠では手動エクスポートなどで対応

- 重要な変更前には、スキーマやポリシーを SQL ファイルとして `docs/sql-snippet/` に残し、同じ手順で再実行できるようにしておく


---

■ 最終更新: 260216
