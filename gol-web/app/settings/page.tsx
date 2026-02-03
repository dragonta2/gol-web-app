import { redirect } from 'next/navigation';

/** /settings は /mypage に統合されたためリダイレクト */
export default function SettingsPage() {
  redirect('/mypage');
}
