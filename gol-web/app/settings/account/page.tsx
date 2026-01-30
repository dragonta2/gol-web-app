'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Key, Bot, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  // ニックネーム
  const [username, setUsername] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);

  // パスワード変更
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // AIの性格・物語の世界観（ローカル保存・将来DB連携用）
  const [aiPersonality, setAiPersonality] = useState('');
  const [storyWorld, setStoryWorld] = useState('');
  const [aiStorySaving, setAiStorySaving] = useState(false);

  const STORAGE_AI_PERSONALITY = 'gol-ai-personality';
  const STORAGE_STORY_WORLD = 'gol-story-world';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          setUsername(data.username ?? '');
        }
      } catch {
        toast.error('プロファイルの読み込みに失敗しました');
      }
      if (typeof window !== 'undefined') {
        setAiPersonality(localStorage.getItem(STORAGE_AI_PERSONALITY) ?? '');
        setStoryWorld(localStorage.getItem(STORAGE_STORY_WORLD) ?? '');
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '保存に失敗しました');
      toast.success('ニックネームを保存しました');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setUsernameSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('新しいパスワードが一致しません');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('パスワードは6文字以上で入力してください');
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('パスワードを変更しました');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'パスワードの変更に失敗しました');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveAiStory = (e: React.FormEvent) => {
    e.preventDefault();
    setAiStorySaving(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_AI_PERSONALITY, aiPersonality);
        localStorage.setItem(STORAGE_STORY_WORLD, storyWorld);
      }
      toast.success('AIの性格・物語の世界観を保存しました');
    } catch {
      toast.error('保存に失敗しました');
    } finally {
      setAiStorySaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-zinc-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>設定に戻る</span>
        </Link>
        <h1 className="text-2xl font-bold text-cyan-400 mb-6">アカウント・AI設定</h1>

        {/* ニックネーム */}
        <section id="nickname" className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6 scroll-mt-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-zinc-100">ニックネーム</h2>
          </div>
          <form onSubmit={handleSaveUsername} className="space-y-3">
            <label htmlFor="username" className="block text-sm font-medium text-zinc-300">
              表示名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ニックネームを入力"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <Button
              type="submit"
              disabled={usernameSaving}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {usernameSaving ? '保存中...' : '保存'}
            </Button>
          </form>
        </section>

        {/* パスワード変更 */}
        <section id="password" className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6 scroll-mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-zinc-100">パスワード変更</h2>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <label htmlFor="new-password" className="block text-sm font-medium text-zinc-300">
              新しいパスワード
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6文字以上"
              autoComplete="new-password"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <label htmlFor="confirm-password" className="block text-sm font-medium text-zinc-300">
              新しいパスワード（確認）
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力"
              autoComplete="new-password"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <Button
              type="submit"
              disabled={passwordSaving || !newPassword || !confirmPassword}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {passwordSaving ? '変更中...' : 'パスワードを変更'}
            </Button>
          </form>
        </section>

        {/* AIの性格・物語の世界観 */}
        <section id="ai-personality" className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6 scroll-mt-4">
          <form onSubmit={handleSaveAiStory} className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-zinc-100">AIの性格</h2>
              </div>
              <p className="text-sm text-zinc-400 mb-3">
                AIの話し方・性格を自由に記述できます。日誌のAIアドバイスなどに反映されます。
              </p>
              <textarea
                value={aiPersonality}
                onChange={(e) => setAiPersonality(e.target.value)}
                placeholder="例: 優しく励ましてくれる。少しユーモアを交える。"
                rows={4}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y"
              />
            </div>

            <div id="story-world">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-zinc-100">物語の世界観</h2>
              </div>
              <p className="text-sm text-zinc-400 mb-3">
                日誌のAIが生成する物語の世界観・設定を記述できます。
              </p>
              <textarea
                value={storyWorld}
                onChange={(e) => setStoryWorld(e.target.value)}
                placeholder="例: ファンタジーRPG風。主人公は見習い冒険者。"
                rows={4}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y"
              />
            </div>

            <Button
              type="submit"
              disabled={aiStorySaving}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {aiStorySaving ? '保存中...' : 'AIの性格・物語の世界観を保存'}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
