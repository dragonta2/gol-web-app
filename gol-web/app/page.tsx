import { redirect } from 'next/navigation';

export default function Home() {
  // トップページにアクセスしたらログイン画面にリダイレクト
  redirect('/login');
}
