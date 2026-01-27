'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        const errorMessage = error.message || 'メール送信に失敗しました';
        setError(errorMessage);
        toast.error('メール送信に失敗しました', {
          description: errorMessage,
        });
        return;
      }

      // 成功（メール送信成功）
      setSuccess(true);
      toast.success('パスワードリセットメールを送信しました', {
        description: 'メール内のリンクをクリックして、新しいパスワードを設定してください',
      });
    } catch (err) {
      setError('予期しないエラーが発生しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ヘッダー */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-cyan-400 mb-2">
            ⚔️ GOL ⚔️
          </h1>
          <p className="text-xl text-zinc-300 mb-1">パスワードリセット</p>
        </header>

        {/* メインカード */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 shadow-xl">
          {success ? (
            <div className="space-y-6">
              <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                <p className="text-green-400 text-sm flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  <span>パスワードリセット用のメールを送信しました。</span>
                </p>
                <p className="text-green-400 text-sm mt-2">
                  メール内のリンクをクリックして、新しいパスワードを設定してください。
                </p>
              </div>
              <Link
                href="/login"
                className="block w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 rounded-lg transition-colors text-center"
              >
                ログイン画面に戻る
              </Link>
            </div>
          ) : (
            <>
              {/* エラーメッセージ */}
              {error && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <p className="text-zinc-300 text-sm mb-6">
                登録済みのメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
              </p>

              <form onSubmit={handleResetPassword} className="space-y-6">
                {/* Email入力 */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-1.5">
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* ボタン */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {loading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    )}
                    {loading ? '送信中...' : 'リセットメールを送信'}
                  </button>
                  <Link
                    href="/login"
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-3 rounded-lg transition-colors text-center flex items-center justify-center"
                  >
                    キャンセル
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

