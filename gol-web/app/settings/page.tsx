'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, ArrowLeft, Sparkles, ClipboardList, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDeleteData = async () => {
    if (confirmText !== '削除') {
      alert('「削除」と入力してください');
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/user/delete-data', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'データの削除に失敗しました');
      }

      const result = await response.json();
      alert('データの削除が完了しました。ログアウトします。');
      
      // ログアウトしてログイン画面にリダイレクト
      router.push('/login');
    } catch (error) {
      console.error('データ削除エラー:', error);
      alert(error instanceof Error ? error.message : 'データの削除に失敗しました');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
      setConfirmText('');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ダッシュボードに戻る</span>
          </Link>
          <h1 className="text-3xl font-bold text-cyan-400">設定</h1>
        </div>

        {/* 設定メニュー */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/settings/habits">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-cyan-600 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-semibold text-zinc-100">習慣管理</h2>
              </div>
              <p className="text-sm text-zinc-400">
                良習慣・悪習慣・ボーナス習慣の追加・編集・削除
              </p>
            </div>
          </Link>

          <Link href="/settings/todos">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-cyan-600 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <ClipboardList className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-semibold text-zinc-100">ToDo管理</h2>
              </div>
              <p className="text-sm text-zinc-400">
                ToDoタスクの追加・編集・削除・SP設定
              </p>
            </div>
          </Link>

          <Link href="/settings/rights">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-cyan-600 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <SettingsIcon className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-semibold text-zinc-100">権利設定</h2>
              </div>
              <p className="text-sm text-zinc-400">
                権利のポイント消費量の設定
              </p>
            </div>
          </Link>
        </div>

        {/* データ削除セクション */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <Trash2 className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-red-400 mb-2">
                データの削除
              </h2>
              <p className="text-zinc-400 mb-4">
                アカウントに関連するすべてのデータを削除します。この操作は取り消せません。
              </p>

              {!showConfirm ? (
                <Button
                  onClick={() => setShowConfirm(true)}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  データを削除する
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-950 border border-red-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-300 font-semibold mb-2">
                          警告: この操作は取り消せません
                        </p>
                        <ul className="text-sm text-red-200 space-y-1 list-disc list-inside">
                          <li>日誌データ（daily_logs）</li>
                          <li>習慣データ（habits, habit_logs）</li>
                          <li>ToDoデータ（todos, todo_logs）</li>
                          <li>AI使用量ログ（ai_usage_logs）</li>
                          <li>ユーザープロファイル（profiles）</li>
                        </ul>
                        <p className="text-sm text-red-200 mt-3">
                          上記のすべてのデータが永久に削除されます。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      確認のため、「<span className="text-red-400 font-bold">削除</span>」と入力してください
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="削除"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleDeleteData}
                      disabled={isDeleting || confirmText !== '削除'}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? '削除中...' : '削除を実行'}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowConfirm(false);
                        setConfirmText('');
                      }}
                      variant="outline"
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
