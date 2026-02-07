/**
 * 管理者権限チェック用ユーティリティ
 * 
 * 管理者のみがAI使用量を確認できるようにするための関数
 */

import { createClient } from '@/lib/supabase/server';

/**
 * 現在のユーザーが管理者かどうかをチェック
 * @returns {Promise<boolean>} 管理者の場合true、それ以外はfalse
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();

  try {
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return false;
    }

    // profilesテーブルからis_adminフラグを取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profileError && profile?.is_admin === true) {
      return true;
    }

    // 環境変数で指定したメールも管理者扱い（テスト・管理アカウント用）
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS
      ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
      : [];
    const email = (user.email ?? '').toLowerCase();
    if (email && adminEmails.includes(email)) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('管理者チェックエラー:', error);
    return false;
  }
}

/**
 * 指定されたユーザーIDが管理者かどうかをチェック（サーバーサイド用）
 * @param userId チェックするユーザーID
 * @returns {Promise<boolean>} 管理者の場合true、それ以外はfalse
 */
export async function isAdminById(userId: string): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return false;
    }

    return profile.is_admin === true;
  } catch (error) {
    console.error('管理者チェックエラー:', error);
    return false;
  }
}
