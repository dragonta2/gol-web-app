'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface TableInfo {
  tableName: string;
  rowCount: number;
  status: 'success' | 'error';
  error?: string;
}

export default function TestDatabasePage() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkDatabase() {
      const supabase = createClient();

      try {
        // 1. 接続確認
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setConnectionStatus('error');
          setConnectionMessage(`認証エラー: ${sessionError.message}`);
        } else {
          setConnectionStatus('success');
          setConnectionMessage('Supabaseに正常に接続できました！');
        }

        // 2. 各テーブルのデータ件数を確認
        const tableNames = [
          'profiles',
          'daily_logs',
          'habits',
          'habit_logs',
          'todos',
          'todo_logs',
          'todo_subtasks',
        ];

        const tableInfos: TableInfo[] = [];

        for (const tableName of tableNames) {
          try {
            const { count, error } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true });

            if (error) {
              tableInfos.push({
                tableName,
                rowCount: 0,
                status: 'error',
                error: error.message,
              });
            } else {
              tableInfos.push({
                tableName,
                rowCount: count || 0,
                status: 'success',
              });
            }
          } catch (err) {
            tableInfos.push({
              tableName,
              rowCount: 0,
              status: 'error',
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        setTables(tableInfos);
      } catch (err) {
        setConnectionStatus('error');
        setConnectionMessage(`予期しないエラー: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    }

    checkDatabase();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">
          🗄️ データベース状態確認
        </h1>

        {/* 接続状態 */}
        <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-zinc-300">接続状態</h2>
          {loading ? (
            <div className="flex items-center gap-3 text-zinc-400">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent"></div>
              <p>確認中...</p>
            </div>
          ) : connectionStatus === 'success' ? (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
              <p className="text-green-400 font-semibold">✅ {connectionMessage}</p>
            </div>
          ) : (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
              <p className="text-red-400 font-semibold">❌ {connectionMessage}</p>
            </div>
          )}
        </div>

        {/* テーブル一覧 */}
        <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-zinc-300">テーブル一覧</h2>
          {loading ? (
            <div className="flex items-center gap-3 text-zinc-400">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent"></div>
              <p>データ取得中...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left p-3 text-zinc-300">テーブル名</th>
                    <th className="text-right p-3 text-zinc-300">データ件数</th>
                    <th className="text-center p-3 text-zinc-300">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((table) => (
                    <tr key={table.tableName} className="border-b border-zinc-800">
                      <td className="p-3 font-mono text-zinc-200">{table.tableName}</td>
                      <td className="p-3 text-right text-zinc-300">{table.rowCount.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        {table.status === 'success' ? (
                          <span className="text-green-400">✓</span>
                        ) : (
                          <span className="text-red-400" title={table.error}>
                            ✗
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 環境変数確認 */}
        <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-zinc-300">環境変数</h2>
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

        {/* アクション */}
        <div className="flex gap-4">
          <a
            href="/dashboard"
            className="inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            ダッシュボードへ
          </a>
          <a
            href="/test-supabase"
            className="inline-block bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            接続テストページへ
          </a>
        </div>
      </div>
    </div>
  );
}
