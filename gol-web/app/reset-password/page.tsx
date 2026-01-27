'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // パスワードリセットトークンが有効か確認
    const checkSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setIsValidSession(false);
        toast.error('パスワードリセットリンクが無効です', {
          description: '新しいリセットメールを送信してください',
        });
        setTimeout(() => {
          router.push('/forgot-password');
        }, 2000);
      } else {
        setIsValidSession(true);
      }
    };
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // バリデーション
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        const errorMessage = error.message || 'パスワードの更新に失敗しました';
        setError(errorMessage);
        toast.error('パスワードの更新に失敗しました', {
          description: errorMessage,
        });
        return;
      }

      // 成功
      setSuccess(true);
      toast.success('パスワードを更新しました', {
        description: 'ログイン画面にリダイレクトします',
      });
      
      // 3秒後にログイン画面にリダイレクト
      setTimeout(() => {
        router.push('/login');
      }, 3000);
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
          <p className="text-xl text-zinc-300 mb-1">新しいパスワードを設定</p>
        </header>

        {/* メインカード */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 shadow-xl">
          {isValidSession === false ? (
            <div className="space-y-6">
              <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-red-400 text-sm">
                  ⚠️ パスワードリセットリンクが無効です。
                </p>
                <p className="text-red-400 text-sm mt-2">
                  新しいリセットメールを送信してください。
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="block w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 rounded-lg transition-colors text-center"
              >
                パスワードリセットページへ
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-6">
              <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                <p className="text-green-400 text-sm">
                  ✅ パスワードを更新しました。
                </p>
                <p className="text-green-400 text-sm mt-2">
                  ログイン画面にリダイレクトします...
                </p>
              </div>
              <Link
                href="/login"
                className="block w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 rounded-lg transition-colors text-center"
              >
                ログイン画面へ
              </Link>
            </div>
          ) : isValidSession === true ? (
            <>
              {/* エラーメッセージ */}
              {error && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-6">
                {/* 新しいパスワード入力 */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    <span>新しいパスワード</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    required
                    minLength={6}
                  />
                  <p className="mt-1 text-xs text-zinc-500">6文字以上で入力してください</p>
                </div>

                {/* パスワード確認入力 */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    <span>パスワード確認</span>
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    required
                    minLength={6}
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
                    {loading ? '更新中...' : 'パスワードを更新'}
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
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

