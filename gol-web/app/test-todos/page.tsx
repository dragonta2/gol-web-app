'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function TestTodosPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const insertTestTodos = async () => {
    setStatus('loading');
    setMessage('テストデータを挿入中...');
    console.log('🚀 テストデータ挿入開始');

    try {
      const supabase = createClient();
      console.log('✅ Supabaseクライアント作成完了');

      // 現在のユーザーを取得
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('👤 ユーザー取得:', { user: user?.id, email: user?.email, authError });

      if (authError || !user) {
        setStatus('error');
        setMessage('ログインが必要です。ログイン画面に移動します。');
        console.error('❌ 認証エラー:', authError);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
        return;
      }

      // profilesテーブルにレコードが存在するか確認
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      console.log('📋 プロファイル確認:', { existingProfile, profileError });

      // profilesが存在しない場合は作成
      if (!existingProfile && (!profileError || profileError.code === 'PGRST116')) {
        setMessage('プロファイルを作成中...');
        const username = user.email?.split('@')[0] || 'ユーザー';
        console.log('➕ プロファイル作成開始:', { id: user.id, username });
        const { error: insertProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: username,
            class_name: '無名の凡人',
            level: 1,
            points: 10,
            exp_body: 0,
            exp_mind: 0,
            exp_spirit: 0,
          });

        if (insertProfileError) {
          setStatus('error');
          setMessage(`プロファイル作成エラー: ${insertProfileError.message}`);
          console.error('❌ profiles作成エラー:', insertProfileError);
          return;
        }
        console.log('✅ プロファイル作成完了');
      } else {
        console.log('✅ プロファイル既に存在');
      }

      // テストデータを挿入
      setMessage('ToDoテストデータを挿入中...');
      console.log('📝 テストデータ準備中...');
      // 注意: difficultyフィールドはデータベースのデフォルト値（'medium'）に依存
      // スキーマキャッシュの問題を回避するため、明示的に指定しない
      const testTodos = [
        {
          user_id: user.id,
          task_name: '沖縄旅行',
          sp_points: 6,
          sp_exp_body: 2,
          sp_exp_mind: 2,
          sp_exp_spirit: 0,
          status: 'active' as const,
          due_date: new Date('2024-11-01').toISOString().split('T')[0], // 期限超過
          display_order: 1,
        },
        {
          user_id: user.id,
          task_name: '確定申告',
          sp_points: 4,
          sp_exp_body: 1,
          sp_exp_mind: 2,
          sp_exp_spirit: 0,
          status: 'active' as const,
          due_date: new Date('2024-11-15').toISOString().split('T')[0],
          display_order: 2,
        },
        {
          user_id: user.id,
          task_name: '健康診断',
          sp_points: 0,
          sp_exp_body: 1,
          sp_exp_mind: 0,
          sp_exp_spirit: 0,
          status: 'active' as const,
          due_date: new Date('2024-11-20').toISOString().split('T')[0],
          display_order: 3,
        },
        {
          user_id: user.id,
          task_name: 'パスポート受領',
          sp_points: 4,
          sp_exp_body: 0,
          sp_exp_mind: 0,
          sp_exp_spirit: 0,
          status: 'in_progress' as const,
          due_date: new Date('2024-11-05').toISOString().split('T')[0],
          display_order: 4,
        },
        {
          user_id: user.id,
          task_name: 'スキルシート',
          sp_points: 0,
          sp_exp_body: 0,
          sp_exp_mind: 2,
          sp_exp_spirit: 0,
          status: 'completed' as const,
          due_date: null,
          completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3日前
          display_order: 5,
        },
        {
          user_id: user.id,
          task_name: 'ブログ記事',
          sp_points: 0,
          sp_exp_body: 0,
          sp_exp_mind: 3,
          sp_exp_spirit: 0,
          status: 'completed' as const,
          due_date: null,
          completed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4日前
          display_order: 6,
        },
      ];

      console.log('💾 テストデータ挿入実行:', { 
        count: testTodos.length, 
        user_id: user.id,
        testTodos: testTodos.map(t => ({ task_name: t.task_name, status: t.status }))
      });

      const { data, error } = await supabase
        .from('todos')
        .insert(testTodos)
        .select();

      console.log('📊 挿入結果:', { data, error, dataLength: data?.length });

      if (error) {
        setStatus('error');
        const errorDetails = {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        };
        setMessage(`エラー: ${error.message}${error.code ? ` (コード: ${error.code})` : ''}${error.hint ? `\nヒント: ${error.hint}` : ''}`);
        console.error('todos挿入エラー:', errorDetails);
        console.error('エラー詳細:', error);
      } else {
        if (data && data.length > 0) {
          setStatus('success');
          setMessage(`${data.length}件のテストデータを挿入しました！`);
          console.log('挿入されたデータ:', data);
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('データが挿入されませんでした。エラーログを確認してください。');
          console.error('データが返されませんでした。data:', data);
        }
      }
    } catch (err) {
      setStatus('error');
      setMessage(`予期しないエラー: ${err instanceof Error ? err.message : String(err)}`);
      console.error('❌ 予期しないエラー:', err);
      console.error('エラー詳細:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">
          🧪 テストToDoデータ挿入
        </h1>

        <div className="mb-6">
          <p className="text-zinc-300 mb-4">
            このページでは、開発・テスト用のサンプルToDoタスクをデータベースに挿入できます。
          </p>
          <div className="bg-zinc-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-zinc-400 mb-2">挿入されるテストデータ:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
              <li>アクティブ: 沖縄旅行（期限超過）、確定申告、健康診断</li>
              <li>進行中: パスポート受領</li>
              <li>完了済み: スキルシート、ブログ記事</li>
            </ul>
          </div>
        </div>

        {status === 'idle' && (
          <button
            onClick={insertTestTodos}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            テストデータを挿入
          </button>
        )}

        {status === 'loading' && (
          <div className="flex items-center justify-center gap-3 text-zinc-400 py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-500 border-t-transparent"></div>
            <p>{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
            <p className="text-green-400 text-lg font-semibold mb-2">✅ 成功！</p>
            <p className="text-zinc-300 mb-2">{message}</p>
            <p className="text-sm text-zinc-400">ダッシュボードにリダイレクトします...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <p className="text-red-400 text-lg font-semibold mb-2">❌ エラー</p>
            <p className="text-zinc-300 whitespace-pre-wrap">{message}</p>
            <p className="text-xs text-zinc-500 mt-2">
              💡 ブラウザの開発者ツール（F12）のコンソールタブで詳細なエラーログを確認できます。
            </p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-zinc-800">
          <a
            href="/dashboard"
            className="inline-block bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            ダッシュボードに戻る
          </a>
        </div>
      </div>
    </div>
  );
}

