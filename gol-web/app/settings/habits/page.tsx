'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Edit, Trash2, GripVertical, Sparkles, AlertCircle, Trophy } from 'lucide-react';

interface Habit {
  id: string;
  user_id: string;
  habit_name: string;
  habit_type: 'good' | 'bad' | 'bonus';
  points: number;
  exp_body: number;
  exp_mind: number;
  exp_spirit: number;
  display_order: number;
  is_custom: boolean;
  input_type: 'checkbox' | 'number';
  exclude_weekends: boolean;
  exclude_from_complete: boolean;
  created_at: string;
  updated_at: string;
}

export default function HabitsSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // フォーム状態
  const [formData, setFormData] = useState({
    habit_name: '',
    habit_type: 'good' as 'good' | 'bad' | 'bonus',
    points: 1,
    exp_body: 0,
    exp_mind: 0,
    exp_spirit: 0,
    input_type: 'checkbox' as 'checkbox' | 'number',
    exclude_weekends: false,
    exclude_from_complete: false,
  });

  // 習慣一覧を取得
  const fetchHabits = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setHabits(data || []);
    } catch (error) {
      console.error('習慣取得エラー:', error);
      toast.error('習慣の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  // フォームをリセット
  const resetForm = () => {
    setFormData({
      habit_name: '',
      habit_type: 'good',
      points: 1,
      exp_body: 0,
      exp_mind: 0,
      exp_spirit: 0,
      input_type: 'checkbox',
      exclude_weekends: false,
      exclude_from_complete: false,
    });
    setEditingHabit(null);
  };

  // 習慣を追加
  const handleAddHabit = async () => {
    if (!formData.habit_name.trim()) {
      toast.error('習慣名を入力してください');
      return;
    }

    try {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '習慣の追加に失敗しました');
      }

      toast.success('習慣を追加しました');
      setIsDialogOpen(false);
      resetForm();
      fetchHabits();
    } catch (error) {
      console.error('習慣追加エラー:', error);
      toast.error(error instanceof Error ? error.message : '習慣の追加に失敗しました');
    }
  };

  // 習慣を更新
  const handleUpdateHabit = async () => {
    if (!editingHabit || !formData.habit_name.trim()) {
      toast.error('習慣名を入力してください');
      return;
    }

    try {
      const response = await fetch('/api/habits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitId: editingHabit.id,
          ...formData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '習慣の更新に失敗しました');
      }

      toast.success('習慣を更新しました');
      setIsDialogOpen(false);
      resetForm();
      fetchHabits();
    } catch (error) {
      console.error('習慣更新エラー:', error);
      toast.error(error instanceof Error ? error.message : '習慣の更新に失敗しました');
    }
  };

  // 習慣を削除
  const handleDeleteHabit = async (habit: Habit) => {
    if (!habit.is_custom) {
      toast.error('デフォルト習慣は削除できません');
      return;
    }

    if (!confirm(`「${habit.habit_name}」を削除しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/habits?id=${habit.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '習慣の削除に失敗しました');
      }

      toast.success('習慣を削除しました');
      fetchHabits();
    } catch (error) {
      console.error('習慣削除エラー:', error);
      toast.error(error instanceof Error ? error.message : '習慣の削除に失敗しました');
    }
  };

  // 編集ダイアログを開く
  const openEditDialog = (habit: Habit) => {
    setEditingHabit(habit);
    setFormData({
      habit_name: habit.habit_name,
      habit_type: habit.habit_type,
      points: habit.points,
      exp_body: habit.exp_body,
      exp_mind: habit.exp_mind,
      exp_spirit: habit.exp_spirit,
      input_type: 'checkbox',
      exclude_weekends: habit.exclude_weekends,
      exclude_from_complete: habit.exclude_from_complete,
    });
    setIsDialogOpen(true);
  };

  // 習慣を種類別に分類
  const goodHabits = habits.filter(h => h.habit_type === 'good');
  const badHabits = habits.filter(h => h.habit_type === 'bad');
  const bonusHabits = habits.filter(h => h.habit_type === 'bonus');

  // 習慣カードコンポーネント
  const HabitCard = ({ habit }: { habit: Habit }) => (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <GripVertical className="w-4 h-4 text-zinc-500" />
          <h3 className="text-lg font-medium text-zinc-100">{habit.habit_name}</h3>
          {!habit.is_custom && (
            <span className="text-xs px-2 py-0.5 bg-zinc-700 text-zinc-400 rounded">デフォルト</span>
          )}
        </div>
        <div className="text-sm text-zinc-400 space-y-1">
          <div>ゴルド: {habit.points > 0 ? '+' : ''}{habit.points}G</div>
          {habit.habit_type === 'good' && (
            <div>
              EXP: 身体+{habit.exp_body} / 頭脳+{habit.exp_mind} / 精神+{habit.exp_spirit}
            </div>
          )}
          {habit.exclude_weekends && <div>土日除外: 有効</div>}
          {habit.exclude_from_complete && <div>完了除外: 有効</div>}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => openEditDialog(habit)}
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-zinc-100"
        >
          <Edit className="w-4 h-4" />
        </Button>
        {habit.is_custom && (
          <Button
            onClick={() => handleDeleteHabit(habit)}
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href="/mypage"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>マイページに戻る</span>
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-cyan-400">習慣管理</h1>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="w-4 h-4 mr-2" />
                  習慣を追加
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-cyan-400">
                    {editingHabit ? '習慣を編集' : '新しい習慣を追加'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {/* 習慣名 */}
                  <div>
                    <Label htmlFor="habit_name" className="text-zinc-300">習慣名 *</Label>
                    <Input
                      id="habit_name"
                      value={formData.habit_name}
                      onChange={(e) => setFormData({ ...formData, habit_name: e.target.value })}
                      placeholder="例: 朝の散歩"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                    />
                  </div>

                  {/* 習慣タイプ */}
                  <div>
                    <Label className="text-zinc-300">習慣タイプ *</Label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="good"
                          checked={formData.habit_type === 'good'}
                          onChange={(e) => setFormData({ ...formData, habit_type: 'good' as const })}
                          className="w-4 h-4 text-cyan-600"
                        />
                        <span className="text-zinc-300">良習慣</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="bad"
                          checked={formData.habit_type === 'bad'}
                          onChange={(e) => setFormData({ ...formData, habit_type: 'bad' as const })}
                          className="w-4 h-4 text-cyan-600"
                        />
                        <span className="text-zinc-300">悪習慣</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="bonus"
                          checked={formData.habit_type === 'bonus'}
                          onChange={(e) => setFormData({ ...formData, habit_type: 'bonus' as const })}
                          className="w-4 h-4 text-cyan-600"
                        />
                        <span className="text-zinc-300">ボーナス</span>
                      </label>
                    </div>
                  </div>

                  {/* ゴルド */}
                  <div>
                    <Label htmlFor="points" className="text-zinc-300">ゴルド</Label>
                    <Input
                      id="points"
                      type="number"
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                    />
                  </div>

                  {/* EXP（良習慣のみ） */}
                  {formData.habit_type === 'good' && (
                    <>
                      <div>
                        <Label htmlFor="exp_body" className="text-zinc-300">身体EXP</Label>
                        <Input
                          id="exp_body"
                          type="number"
                          value={formData.exp_body}
                          onChange={(e) => setFormData({ ...formData, exp_body: parseInt(e.target.value) || 0 })}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="exp_mind" className="text-zinc-300">頭脳EXP</Label>
                        <Input
                          id="exp_mind"
                          type="number"
                          value={formData.exp_mind}
                          onChange={(e) => setFormData({ ...formData, exp_mind: parseInt(e.target.value) || 0 })}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="exp_spirit" className="text-zinc-300">精神EXP</Label>
                        <Input
                          id="exp_spirit"
                          type="number"
                          value={formData.exp_spirit}
                          onChange={(e) => setFormData({ ...formData, exp_spirit: parseInt(e.target.value) || 0 })}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                        />
                      </div>
                    </>
                  )}

                  {/* 入力タイプは当面チェックリストのみのため非表示（常に checkbox） */}

                  {/* オプション */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.exclude_weekends}
                        onChange={(e) => setFormData({ ...formData, exclude_weekends: e.target.checked })}
                        className="w-4 h-4 text-cyan-600"
                      />
                      <span className="text-zinc-300">土日を除外</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.exclude_from_complete}
                        onChange={(e) => setFormData({ ...formData, exclude_from_complete: e.target.checked })}
                        className="w-4 h-4 text-cyan-600"
                      />
                      <span className="text-zinc-300">完了判定から除外</span>
                    </label>
                  </div>

                  {/* ボタン */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={editingHabit ? handleUpdateHabit : handleAddHabit}
                      className="bg-cyan-600 hover:bg-cyan-700"
                    >
                      {editingHabit ? '更新' : '追加'}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                      variant="outline"
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 習慣一覧 */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400">読み込み中...</div>
        ) : (
          <div className="space-y-6">
            {/* 良習慣 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-green-400" />
                <h2 className="text-xl font-semibold text-green-400">良習慣</h2>
                <span className="text-sm text-zinc-500">({goodHabits.length}件)</span>
              </div>
              {goodHabits.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
                  良習慣が登録されていません
                </div>
              ) : (
                <div className="space-y-3">
                  {goodHabits.map((habit) => (
                    <HabitCard key={habit.id} habit={habit} />
                  ))}
                </div>
              )}
            </div>

            {/* 悪習慣 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <h2 className="text-xl font-semibold text-red-400">悪習慣</h2>
                <span className="text-sm text-zinc-500">({badHabits.length}件)</span>
              </div>
              {badHabits.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
                  悪習慣が登録されていません
                </div>
              ) : (
                <div className="space-y-3">
                  {badHabits.map((habit) => (
                    <HabitCard key={habit.id} habit={habit} />
                  ))}
                </div>
              )}
            </div>

            {/* ボーナス */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <h2 className="text-xl font-semibold text-yellow-400">ボーナス</h2>
                <span className="text-sm text-zinc-500">({bonusHabits.length}件)</span>
              </div>
              {bonusHabits.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
                  ボーナス習慣が登録されていません
                </div>
              ) : (
                <div className="space-y-3">
                  {bonusHabits.map((habit) => (
                    <HabitCard key={habit.id} habit={habit} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
