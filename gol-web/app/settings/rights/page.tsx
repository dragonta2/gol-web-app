'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Save, Plus, Trash2, ArrowUpAZ, ArrowDownZA } from 'lucide-react';

const MAX_RIGHTS = 24;

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** 権利記号は大文字アルファベットのみ（自由記述・入力時に正規化） */
function normalizeRightCode(value: string): string {
  return value.replace(/[^A-Za-z]/g, '').toUpperCase();
}

interface RightItem {
  code: string;
  name: string;
  points: number;
  unit: string;
}

const DEFAULT_RIGHTS: RightItem[] = [
  { code: 'A', name: 'TVゲーム2時間', points: 5, unit: '2時間' },
  { code: 'B', name: 'お酒4杯まで', points: 4, unit: '4杯まで' },
  { code: 'C', name: '食事時動画1時間毎', points: 1, unit: '1時間毎' },
  { code: 'D', name: '睡眠導入剤', points: 0, unit: '1回' },
  { code: 'E', name: '朝食 or 昼食を食べる', points: 3, unit: '1回' },
  { code: 'F', name: 'EMKF', points: 10, unit: '1回' },
  { code: 'O', name: 'ON (PLN以外)', points: 5, unit: '1回' },
  { code: 'U', name: '宇都宮ダンス', points: 1, unit: '1回' },
  { code: 'X', name: 'PLN動画 & ON 1時間', points: 10, unit: '1時間' },
];

export default function RightsSettingsPage() {
  const [rights, setRights] = useState<RightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  /** 権利記号入力にフォーカスしているカードの index（利用可能記号を表示するため） */
  const [focusedCodeIndex, setFocusedCodeIndex] = useState<number | null>(null);
  /** 並び替えの選択状態（セグメントUIのハイライト用） */
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  const fetchRights = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/rights');
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '取得に失敗しました');
      setRights(Array.isArray(result.rights) && result.rights.length > 0 ? result.rights : DEFAULT_RIGHTS);
      setHasChanges(false);
      setSortOrder(null);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : '設定の取得に失敗しました');
      setRights(DEFAULT_RIGHTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRights();
  }, []);

  const canAddMore = rights.length < MAX_RIGHTS;

  const updateRight = (index: number, field: keyof RightItem, value: string | number) => {
    const normalized = field === 'code' && typeof value === 'string' ? normalizeRightCode(value) : value;
    setRights((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: normalized } : r))
    );
    setHasChanges(true);
  };

  const addRight = () => {
    if (!canAddMore) {
      toast.error('これ以上権利を追加できません（最大24件）');
      return;
    }
    setRights((prev) => [{ code: '', name: '', points: 0, unit: '' }, ...prev]);
    setHasChanges(true);
  };

  const removeRight = (index: number) => {
    setRights((prev) => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleRemoveRight = (index: number) => {
    const right = rights[index];
    const label = right?.code ? `権利${right.code}` : `${index + 1}件目`;
    if (!window.confirm(`${label}を削除してもよろしいですか？`)) return;
    removeRight(index);
  };

  const sortRights = (order: 'asc' | 'desc') => {
    setSortOrder(order);
    setRights((prev) =>
      [...prev].sort((a, b) => {
        const ca = (a.code || '').toUpperCase();
        const cb = (b.code || '').toUpperCase();
        return order === 'asc' ? ca.localeCompare(cb) : cb.localeCompare(ca);
      })
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    const emptyCode = rights.find((r) => !r.code.trim());
    if (emptyCode) {
      toast.error('権利記号を入力してください');
      return;
    }
    const invalidName = rights.find((r) => !r.name.trim());
    if (invalidName) {
      toast.error('すべての権利に名前を入力してください');
      return;
    }
    const zeroPoints = rights.find((r) => r.points < 1);
    if (zeroPoints) {
      toast.error('消費量は1以上で設定してください。');
      return;
    }
    const codesUpper = rights.map((r) => r.code.trim().toUpperCase()).filter(Boolean);
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const c of codesUpper) {
      if (seen.has(c)) {
        if (!duplicates.includes(c)) duplicates.push(c);
      } else {
        seen.add(c);
      }
    }
    if (duplicates.length > 0) {
      toast.error(`権利${duplicates.join('・')}が重複しています`);
      return;
    }
    try {
      setSaving(true);
      const sorted = [...rights].sort((a, b) =>
        (a.code || '').toUpperCase().localeCompare((b.code || '').toUpperCase())
      );
      const res = await fetch('/api/settings/rights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rights: sorted }),
      });
      const result = await res.json();
      if (!res.ok) {
        const msg = result.details ? `${result.error}\n${result.details}` : (result.error || '保存に失敗しました');
        throw new Error(msg);
      }
      toast.success('権利設定を保存しました');
      setHasChanges(false);
      await fetchRights();
      setSortOrder('asc');
    } catch (e) {
      const message = e instanceof Error ? e.message : '保存に失敗しました';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link
            href="/mypage"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ダッシュボードに戻る</span>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-cyan-400">権利設定</h1>
            <p className="text-zinc-400 mt-2">
              権利の追加・編集・削除ができます。権利記号はアルファベットのみ。
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 mt-4">
            <Button
              onClick={addRight}
              disabled={!canAddMore}
              variant="outline"
              className="px-4 bg-[#35353b] border-[#35353b] text-white hover:bg-zinc-800 hover:text-white hover:border-zinc-800"
            >
              <Plus className="w-4 h-4 mr-1.5 shrink-0" />
              権利を追加
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-zinc-200">現在の設定数 {rights.length}/{MAX_RIGHTS}</p>
            <div
              className="inline-flex rounded overflow-hidden border border-zinc-700 bg-zinc-800/80"
              role="group"
              aria-label="並び替え"
            >
              <button
                type="button"
                onClick={() => sortRights('asc')}
                disabled={loading || rights.length === 0}
                title="権利記号の昇順（A→Z）で並び替え"
                className={`inline-flex items-center gap-0.5 px-1.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  sortOrder === 'asc'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-transparent text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
                }`}
              >
                <ArrowUpAZ className="w-3 h-3" />
                昇順
              </button>
              <button
                type="button"
                onClick={() => sortRights('desc')}
                disabled={loading || rights.length === 0}
                title="権利記号の降順（Z→A）で並び替え"
                className={`inline-flex items-center gap-0.5 px-1.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-l border-zinc-600 ${
                  sortOrder === 'desc'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-transparent text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
                }`}
              >
                <ArrowDownZA className="w-3 h-3" />
                降順
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-400">読み込み中...</div>
        ) : (
          <div className="space-y-4">
            {rights.map((right, index) => (
              <div
                key={`right-${index}`}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-l-4 border-blue-500 pl-2 py-0.5">
                    <span className="text-lg font-semibold text-blue-400">権利</span>
                    <input
                      type="text"
                      id={`right-${index}-code`}
                      value={right.code}
                      onChange={(e) => updateRight(index, 'code', e.target.value)}
                      onFocus={() => setFocusedCodeIndex(index)}
                      onBlur={() => setFocusedCodeIndex(null)}
                      placeholder="A"
                      maxLength={10}
                      autoCapitalize="characters"
                      className="w-12 min-w-0 text-lg font-semibold text-blue-400 bg-transparent border-none outline-none placeholder:text-blue-400/50 focus:ring-0 p-0 uppercase"
                    />
                    {focusedCodeIndex === index && (
                      <span className="text-base font-medium text-white">
                        利用可能記号：{LETTERS.filter((c) => !rights.some((r, i) => i !== index && r.code.toUpperCase() === c)).join('・')}
                      </span>
                    )}
                  </div>
                  <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRight(index)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-950"
                      aria-label="この権利を削除"
                    >
                    <Trash2 className="w-4 h-4 mr-1" />
                    削除
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label htmlFor={`right-${index}-name`} className="text-zinc-300">
                      名前
                    </Label>
                    <Input
                      id={`right-${index}-name`}
                      value={right.name}
                      onChange={(e) => updateRight(index, 'name', e.target.value)}
                      placeholder="例: TVゲーム2時間"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`right-${index}-points`} className="text-zinc-300">
                      ゴルド消費量
                    </Label>
                    <Input
                      id={`right-${index}-points`}
                      type="number"
                      min={0}
                      value={right.points}
                      onChange={(e) => updateRight(index, 'points', parseInt(e.target.value) || 0)}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Label htmlFor={`right-${index}-unit`} className="text-zinc-300">
                    使用単位・条件｜自由記述
                  </Label>
                  <Input
                    id={`right-${index}-unit`}
                    value={right.unit}
                    onChange={(e) => updateRight(index, 'unit', e.target.value)}
                    placeholder="例: 2時間、4杯まで、1回"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    1回使用あたりの単位を自由に記述します（日誌の入力時の目安）
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
