'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OAuth コールバック失敗で戻ってきたときの URL ?error=... / ?from=... を表示
  useEffect(() => {
    const err = searchParams.get('error');
    const from = searchParams.get('from');
    if (err) setError(decodeURIComponent(err));
    else if (from === 'dashboard')
      setError('ダッシュボードから戻されました（セッションがありません）。OAuth 後のクッキーが届いていない可能性があります。');
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        // ログイン成功 dashboard画面にリダイレクト
        router.push('/dashboard');
      }
    } catch (err) {
      setError('予期しないエラーが発生しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account', // 毎回 Google のアカウント選択画面を表示する
          },
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // code_verifier がクッキーに書き込まれてからリダイレクトする（別アカウント選択時も PKCE が通るように）
      if (data?.url) {
        await new Promise((r) => setTimeout(r, 300));
        window.location.href = data.url;
      }
    } catch (err) {
      setError('予期しないエラーが発生しました');
      setLoading(false);
      console.error(err);
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
          <p className="text-xl text-zinc-300 mb-1">Gamification of Life</p>
          <p className="text-sm text-zinc-500">〜人生をゲームに、日記を冒険に〜</p>
        </header>

        {/* メインカード */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 shadow-xl">
          {/* エラーメッセージ */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
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

            {/* Password入力 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-300 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  <span>Password</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                >
                  パスワードを忘れた場合
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-800 rounded p-1"
                  aria-label={showPassword ? 'パスワードを非表示' : 'パスワードを表示'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
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
                {loading ? 'ログイン中...' : 'ログイン'}
              </button>
              <Link
                href="/signup"
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-3 rounded-lg transition-colors text-center flex items-center justify-center"
              >
                サインアップ
              </Link>
            </div>
          </form>

          {/* 区切り線 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700"></div>
            </div>

            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-zinc-900 text-zinc-500">or</span>
            </div>
          </div>

          {/* OAuthボタン */}
          <div className="space-y-3">
            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 text-zinc-300 font-medium py-3 rounded-lg transition-colors"
            >
              Googleでログイン
            </button>
            <button
              onClick={() => handleOAuthLogin('apple')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 text-zinc-300 font-medium py-3 rounded-lg transition-colors"
            >
              Appleでログイン
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

