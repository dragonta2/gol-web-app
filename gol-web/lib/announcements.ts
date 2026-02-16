/**
 * お知らせの追加・設定をできるアカウント（管理・テスト用）
 * このメールアドレスまたは isAdmin のユーザーのみ「お知らせを追加」フォームが表示される
 */
export const ANNOUNCEMENT_MANAGER_EMAILS = [
  'dragon5555555@gmail.com',
  'dragon.web.1105@gmail.com',
].map((e) => e.toLowerCase());

export function canManageAnnouncements(
  email: string | undefined,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (!email) return false;
  return ANNOUNCEMENT_MANAGER_EMAILS.includes(email.toLowerCase());
}
