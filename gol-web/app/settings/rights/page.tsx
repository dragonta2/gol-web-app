'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Save, RotateCcw } from 'lucide-react';

interface RightConfig {
  points: number;
  name: string;
  maxCount?: number;
}

interface RightsConfig {
  A: RightConfig;
  B: RightConfig;
  C: RightConfig;
  D: RightConfig;
  E: RightConfig;
  F: RightConfig;
  O: RightConfig;
  U: RightConfig;
  X: RightConfig;
}

// デフォルト設定
const DEFAULT_RIGHTS_CONFIG: RightsConfig = {
  A: { points: 5, name: 'TVゲーム2時間' },
  B: { points: 4, name: 'お酒4杯まで' },
  C: { points: 1, name: '食事時動画1時間毎', maxCount: 10 },
  D: { points: 0, name: '睡眠導入剤' },
  E: { points: 3, name: '朝食 or 昼食を食べる', maxCount: 3 },
  F: { points: 10, name: 'EMKF' },
  O: { points: 5, name: 'ON (PLN以外)' },
  U: { points: 1, name: '宇都宮ダンス' },
  X: { points: 10, name: 'PLN動画 & ON 1時間' },
};

export default function RightsSettingsPage() {
  const router = useRouter();
  const [rightsConfig, setRightsConfig] = useState<RightsConfig>(DEFAULT_RIGHTS_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 権利設定を取得
  const fetchRightsConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/rights');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '設定の取得に失敗しました');
      }

      setRightsConfig(result.rightsConfig || DEFAULT_RIGHTS_CONFIG);
      setHasChanges(false);
    } catch (error) {
      console.error('権利設定取得エラー:', error);
      toast.error(error instanceof Error ? error.message : '設定の取得に失敗しました');
      // エラー時はデフォルト値を使用
      setRightsConfig(DEFAULT_RIGHTS_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRightsConfig();
  }, []);

  // 権利設定を更新
  const handleUpdateRight = (rightCode: keyof RightsConfig, field: 'points' | 'maxCount', value: number) => {
    setRightsConfig((prev) => ({
      ...prev,
      [rightCode]: {
        ...prev[rightCode],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  // 設定を保存
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/settings/rights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rightsConfig }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '設定の保存に失敗しました');
      }

      toast.success('権利設定を保存しました');
      setHasChanges(false);
    } catch (error) {
      console.error('権利設定保存エラー:', error);
      toast.error(error instanceof Error ? error.message : '設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 設定をリセット（デフォルト値に戻す）
  const handleReset = () => {
    if (confirm('設定をデフォルト値にリセットしますか？')) {
      setRightsConfig(DEFAULT_RIGHTS_CONFIG);
      setHasChanges(true);
    }
  };

  // 権利カードコンポーネント
  const RightCard = ({ rightCode, config }: { rightCode: keyof RightsConfig; config: RightConfig }) => (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="text-lg font-medium text-zinc-100 mb-1">
            権利{rightCode}: {config.name}
          </h3>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <Label htmlFor={`${rightCode}-points`} className="text-zinc-300">
            ポイント消費量
          </Label>
          <Input
            id={`${rightCode}-points`}
            type="number"
            value={config.points}
            onChange={(e) => handleUpdateRight(rightCode, 'points', parseInt(e.target.value) || 0)}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1"
            min="0"
          />
          <p className="text-xs text-zinc-500 mt-1">
            1回使用するごとに消費されるポイント数
          </p>
        </div>
        {config.maxCount !== undefined && (
          <div>
            <Label htmlFor={`${rightCode}-maxCount`} className="text-zinc-300">
              最大使用回数
            </Label>
            <Input
              id={`${rightCode}-maxCount`}
              type="number"
              value={config.maxCount}
              onChange={(e) => handleUpdateRight(rightCode, 'maxCount', parseInt(e.target.value) || 0)}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1"
              min="1"
            />
            <p className="text-xs text-zinc-500 mt-1">
              1日あたりの最大使用回数
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>設定に戻る</span>
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-cyan-400">権利設定</h1>
            <div className="flex gap-2">
              <Button
                onClick={handleReset}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                リセット
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
          </div>
          <p className="text-zinc-400 mt-2">
            各権利のポイント消費量を設定します。変更は保存ボタンをクリックすると反映されます。
          </p>
        </div>

        {/* 権利設定一覧 */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400">読み込み中...</div>
        ) : (
          <div className="space-y-4">
            {(Object.keys(rightsConfig) as Array<keyof RightsConfig>).map((rightCode) => (
              <RightCard key={rightCode} rightCode={rightCode} config={rightsConfig[rightCode]} />
            ))}
          </div>
        )}

        {/* 保存ボタン（下部にも配置） */}
        {!loading && (
          <div className="mt-8 flex justify-end gap-2">
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              リセット
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
        )}
      </div>
    </div>
  );
}
