'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TestSupabasePage() {

  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient();

        // Supabaseのヘルスチェック（簡単な接続確認）
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setStatus('error');
          setMessage(`エラー: ${error.message}`);
        } else {
          setStatus('success');
          setMessage('Supabaseに正常に接続できました！');
          console.log('接続成功:', data);
        }
      } catch (err) {
        setStatus('error');
        setMessage(`予期しないエラー: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">
          🧪 Supabase 接続テスト
        </h1>

        {status === 'checking' && (
          <div className="flex items-center gap-3 text-zinc-400">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-500 border-t-transparent"></div>
            <p>接続確認中...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
            <p className="text-green-400 text-lg font-semibold mb-2">✅ 成功！</p>
            <p className="text-zinc-300">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <p className="text-red-400 text-lg font-semibold mb-2">❌ エラー</p>
            <p className="text-zinc-300">{message}</p>
            <div className="mt-4 p-3 bg-zinc-800 rounded text-sm text-zinc-400">
              <p className="font-semibold mb-2">確認項目:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>.env.local ファイルが存在するか</li>
                <li>NEXT_PUBLIC_SUPABASE_URL が正しいか</li>
                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY が正しいか</li>
                <li>開発サーバーを再起動したか</li>
              </ul>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-zinc-800">
          <h2 className="text-lg font-semibold mb-3 text-zinc-300">環境変数の状態:</h2>
          <div className="bg-zinc-800 rounded p-4 text-sm font-mono space-y-2">
            <div>
              <span className="text-zinc-500">NEXT_PUBLIC_SUPABASE_URL:</span>
              <span className={`ml-2 ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'text-green-400' : 'text-red-400'}`}>
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ 設定済み' : '✗ 未設定'}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
              <span className={`ml-2 ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-green-400' : 'text-red-400'}`}>
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ 設定済み' : '✗ 未設定'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <a
            href="/login"
            className="inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            ログイン画面へ戻る
          </a>
        </div>
      </div>
    </div>
  );
}
