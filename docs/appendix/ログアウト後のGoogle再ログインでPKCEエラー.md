# ログアウト後の Google 再ログインで「PKCE code verifier not found」が出る件

## 現象

Google でログイン → ログアウト → もう一度「Googleでログイン」を押すと、戻ってきた画面で次のエラーになる。

- `PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared.`

## 原因

`@supabase/ssr` / `@supabase/auth-js` 側の既知の挙動で、**ログアウト（`signOut()`）のあと、次の OAuth 開始時に code_verifier を入れたクッキーが書かれない／読めない**ことがある。

- GitHub: [supabase/ssr#55](https://github.com/supabase/ssr/issues/55)（Next.js で signInWithOAuth の PKCE 用 verifier クッキーがログアウト後に一貫してセットされない）

## アプリ側の対処（実装済み）

**根本対策: Google OAuth の開始をサーバー側に移した**

- **GET /api/auth/google** を新設。このルートで `signInWithOAuth` を実行し、code_verifier を**サーバー側のクッキー**に保存してから Google へリダイレクトする。
- ログイン・サインアップ画面の「Googleでログイン」「Googleで登録」は、**クライアントの signInWithOAuth ではなく、この API へのリンク（`<a href="/api/auth/google">`）に変更**済み。
- これにより、ログアウト後の再ログインでも code_verifier がコールバック時に確実に渡る。

そのほか:

- **PKCE エラー時のメッセージ**  
  万が一コールバックで失敗した場合、エラー文に「PKCE」「code verifier」が含まれていれば、  
  「認証の準備ができていませんでした。もう一度「Googleでログイン」ボタンを押してください。」に差し替えて表示。

## 関連ファイル

- `app/api/auth/google/route.ts` … Google OAuth 開始（サーバー）
- `app/login/page.tsx` … 「Googleでログイン」を `/api/auth/google` へのリンクに変更
- `app/signup/page.tsx` … 「Googleで登録」を `/api/auth/google` へのリンクに変更
