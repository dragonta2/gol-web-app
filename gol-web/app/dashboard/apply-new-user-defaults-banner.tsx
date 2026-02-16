'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';

/**
 * 本番で set-new-user-defaults.sql 未実行のままサインアップしたユーザー向け。
 * 初期セットアップ（50G・権利A・デフォルトToDo）を後から適用するバナーを表示する。
 */
export default function ApplyNewUserDefaultsBanner() {
  const router = useRouter();
  const [canApply, setCanApply] = useState<boolean | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/apply-new-user-defaults')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.canApply === true) setCanApply(true);
        else setCanApply(false);
      })
      .catch(() => {
        if (!cancelled) setCanApply(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await fetch('/api/user/apply-new-user-defaults', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.reason || data.error || '適用に失敗しました');
        setApplying(false);
        return;
      }
      toast.success(data.message || '初期セットアップを適用しました');
      setCanApply(false);
      router.refresh();
    } catch {
      toast.error('適用に失敗しました');
    } finally {
      setApplying(false);
    }
  };

  if (canApply !== true) return null;

  return (
    <div className="mb-4 rounded-lg border border-cyan-600/50 bg-cyan-950/30 p-4 text-cyan-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-400 shrink-0" />
          <span className="text-sm font-medium">
            初期設定（50G・権利A・習慣・ToDo）の一部が未反映です。こちらで一括適用できます。
          </span>
        </div>
        <Button
          onClick={handleApply}
          disabled={applying}
          size="sm"
          className="bg-cyan-600 hover:bg-cyan-700 text-white shrink-0"
        >
          {applying ? '適用中...' : '初期セットアップを適用'}
        </Button>
      </div>
    </div>
  );
}
