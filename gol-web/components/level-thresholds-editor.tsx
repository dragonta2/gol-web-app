'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LEVEL_THRESHOLDS } from '@/lib/rank-utils';
import { isSubmitShortcut } from '@/lib/utils';

type LevelThresholds = Record<number, number>;

const LEVEL_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const DEFAULT_VALUES_TEXT = LEVEL_KEYS.map((lv) => `Lv.${lv}=${LEVEL_THRESHOLDS[lv] ?? 0}`).join('、');

/** forceShowForAdmin: 設定画面で管理者表示時、APIの canEdit が false でもフォームを表示する */
export function LevelThresholdsEditor({ forceShowForAdmin = false }: { forceShowForAdmin?: boolean } = {}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [thresholds, setThresholds] = useState<LevelThresholds>({});
  const [dirty, setDirty] = useState(false);

  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFetchError(null);
    (async () => {
      try {
        const res = await fetch('/api/settings/level-thresholds');
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setFetchError(data.error ?? '設定の取得に失敗しました');
          setLoading(false);
          return;
        }
        setCanEdit(data.canEdit === true);
        const raw = data.thresholds ?? {};
        const next: LevelThresholds = {};
        for (const lv of LEVEL_KEYS) {
          next[lv] = typeof raw[lv] === 'number' ? raw[lv] : 0;
        }
        setThresholds(next);
      } catch (e) {
        if (!cancelled) setFetchError('設定の取得に失敗しました');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (level: number, value: string) => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n < 0) return;
    setThresholds((prev) => ({ ...prev, [level]: n }));
    setDirty(true);
  };

  const handleSave = async () => {
    if ((!canEdit && !forceShowForAdmin) || !dirty) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/level-thresholds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thresholds),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? '保存に失敗しました');
        return;
      }
      setDirty(false);
      if (data.thresholds) setThresholds(data.thresholds);
    } catch (e) {
      console.error(e);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('本当に初期値に戻しますか？')) return;
    const defaults: LevelThresholds = {
      1: 50, 2: 100, 3: 200, 4: 400, 5: 600,
      6: 900, 7: 1200, 8: 1600, 9: 2000, 10: 2500,
    };
    setThresholds(defaults);
    setDirty(true);
  };

  if (loading) {
    return (
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>読み込み中...</span>
        </div>
      </section>
    );
  }

  const showForm = canEdit || (forceShowForAdmin && Object.keys(thresholds).length > 0);
  if (!showForm && !fetchError) return null;

  if (fetchError) {
    return (
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
        <h2 className="text-base font-semibold text-zinc-300 mb-2 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          レベルアップ必要EXPの設定
        </h2>
        <p className="text-sm text-amber-400">{fetchError}</p>
        <p className="text-xs text-zinc-500 mt-2">
          NEXT_PUBLIC_ADMIN_EMAILS に含むメールでログインしていますか？ app_config テーブルを作成しましたか？（docs/sql-snippet/add-app-config-level-thresholds.sql）
        </p>
      </section>
    );
  }

  return (
    <section
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6"
      onKeyDown={(e) => {
        if (!isSubmitShortcut(e)) return
        e.preventDefault()
        handleSave()
      }}
    >
      <h2 className="text-base font-semibold text-zinc-300 mb-2 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-cyan-400" />
        レベルアップ必要EXPの設定（管理者・テスト用）
      </h2>
      <p className="text-sm text-zinc-400 mb-2">
        身体・頭脳・精神のそれぞれが、各レベルの閾値EXPを超えるとレベルアップします。ヨウテイモード・ドラクエモードどちらも同じ閾値です。変更は全アカウントに共通で反映されます。
      </p>
      <p className="text-xs text-zinc-400 mb-4">
        初期値: {DEFAULT_VALUES_TEXT}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {LEVEL_KEYS.map((lv) => (
          <div key={lv} className="space-y-1">
            <Label htmlFor={`threshold-${lv}`} className="text-zinc-400 text-xs">
              Lv.{lv}
            </Label>
            <Input
              id={`threshold-${lv}`}
              type="number"
              min={0}
              value={thresholds[lv] ?? 0}
              onChange={(e) => handleChange(lv, e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 h-9"
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          保存
        </Button>
        <Button
          type="button"
          onClick={handleReset}
          className="bg-zinc-600 hover:bg-zinc-500 text-zinc-100 border-0 ml-auto"
        >
          初期値に戻す
        </Button>
      </div>
    </section>
  );
}
