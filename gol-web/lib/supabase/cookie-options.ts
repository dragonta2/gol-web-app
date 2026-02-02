/**
 * Supabase の code_verifier などをクッキーで共有するための共通オプション。
 * ブラウザ・サーバーで同じ設定を使うことで PKCE フローが動作する。
 */
export const supabaseCookieOptions = {
  name: 'sb-auth-token',
  path: '/',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 400, // 400 days
};
