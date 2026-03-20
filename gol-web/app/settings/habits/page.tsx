'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Edit, Trash2, GripVertical, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { isSubmitShortcut } from '@/lib/utils';

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
  parent_habit_id?: string | null;
  is_custom: boolean;
  input_type: 'checkbox' | 'number';
  exclude_weekends: boolean;
  exclude_from_complete: boolean;
  description?: string | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

/** 親→子のツリー構築（親は parent_habit_id == null、子は parent_habit_id === 親.id） */
function buildHabitTree(habits: Habit[]): { parent: Habit; children: Habit[] }[] {
  const parents = habits
    .filter((h) => !h.parent_habit_id)
    .sort((a, b) => a.display_order - b.display_order);
  return parents.map((parent) => {
    const children = habits
      .filter((h) => h.parent_habit_id === parent.id)
      .sort((a, b) => a.display_order - b.display_order);
    return { parent, children };
  });
}

export default function HabitsSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [openGoodAccordion, setOpenGoodAccordion] = useState(true);
  const [openBadAccordion, setOpenBadAccordion] = useState(true);

  // フォーム状態
  const [formData, setFormData] = useState({
    habit_name: '',
    description: '',
    note: '',
    habit_type: 'good' as 'good' | 'bad' | 'bonus',
    points: 1,
    exp_body: 0,
    exp_mind: 0,
    exp_spirit: 0,
    input_type: 'checkbox' as 'checkbox' | 'number',
    exclude_weekends: false,
    exclude_from_complete: false,
    parent_habit_id: '' as string,
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
      description: '',
      note: '',
      habit_type: 'good',
      points: 1,
      exp_body: 0,
      exp_mind: 0,
      exp_spirit: 0,
      input_type: 'checkbox',
      exclude_weekends: false,
      exclude_from_complete: false,
      parent_habit_id: '',
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
      const payload = { ...formData };
      if (!payload.parent_habit_id) (payload as Record<string, unknown>).parent_habit_id = null;
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      const payload = { habitId: editingHabit.id, ...formData };
      if (!(payload as Record<string, unknown>).parent_habit_id) (payload as Record<string, unknown>).parent_habit_id = null;
      const response = await fetch('/api/habits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  // 週末除外・Comp対象外トグル
  const toggleHabitBoolField = async (habit: Habit, field: 'exclude_weekends' | 'exclude_from_complete') => {
    const next = !habit[field];
    try {
      const { error } = await supabase
        .from('habits')
        .update({ [field]: next })
        .eq('id', habit.id);
      if (error) throw error;
      toast.success('変更しました');
      fetchHabits();
    } catch (err) {
      toast.error('更新に失敗しました');
      console.error(err);
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

  // 新規追加ダイアログを開く（日誌画面と同じく、良習慣用・悪習慣用で開き分け）
  const openAddDialog = (habitType: 'good' | 'bad') => {
    setEditingHabit(null);
    setFormData({
      habit_name: '',
      description: '',
      note: '',
      habit_type: habitType,
      points: 1,
      exp_body: 0,
      exp_mind: 0,
      exp_spirit: 0,
      input_type: 'checkbox',
      exclude_weekends: false,
      exclude_from_complete: false,
      parent_habit_id: '',
    });
    setIsDialogOpen(true);
  };

  // 編集ダイアログを開く
  const openEditDialog = (habit: Habit) => {
    setEditingHabit(habit);
    setFormData({
      habit_name: habit.habit_name,
      description: habit.description ?? '',
      note: habit.note ?? '',
      habit_type: habit.habit_type,
      points: habit.points,
      exp_body: habit.exp_body,
      exp_mind: habit.exp_mind,
      exp_spirit: habit.exp_spirit,
      input_type: 'checkbox',
      exclude_weekends: habit.exclude_weekends,
      exclude_from_complete: habit.exclude_from_complete,
      parent_habit_id: habit.parent_habit_id ?? '',
    });
    setIsDialogOpen(true);
  };

  // 習慣を種類別に分類し、表示用ツリーを構築
  const goodHabits = habits.filter(h => h.habit_type === 'good');
  const badHabits = habits.filter(h => h.habit_type === 'bad');
  const goodTree = buildHabitTree(goodHabits);
  const badTree = buildHabitTree(badHabits);

  // 習慣カードコンポーネント（子の場合はインデント。親で子を持つ場合はラベルとゴルド/EXPを「ー」表示）
  const HabitCard = ({ habit, isChild = false, hasChildren = false }: { habit: Habit; isChild?: boolean; hasChildren?: boolean }) => (
    <div className={`bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex items-start justify-between gap-4 ${isChild ? 'ml-6' : ''}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <GripVertical className="w-4 h-4 text-zinc-500" />
          <h3 className="text-lg font-medium text-zinc-100">{habit.habit_name}</h3>
          {habit.description && (
            <span className="text-sm text-zinc-400 ml-2">｜ {habit.description}</span>
          )}
          {hasChildren && (
            <span className="text-xs px-2 py-0.5 bg-cyan-900/50 text-cyan-300 rounded">親</span>
          )}
          {!habit.is_custom && (
            <span className="text-xs px-2 py-0.5 bg-zinc-700 text-zinc-400 rounded">デフォルト</span>
          )}
        </div>
        <div className="text-sm text-zinc-400 space-y-1">
          {hasChildren ? (
            <div>ゴルド / EXP: ー</div>
          ) : (
            <>
              <div>ゴルド: {habit.points > 0 ? '+' : ''}{habit.points}G</div>
              {habit.habit_type === 'good' && (
                <div>
                  <span>EXP: <span className="text-exp-body">身体 + {habit.exp_body}</span> / <span className="text-exp-intelligence">頭脳 + {habit.exp_mind}</span> / <span className="text-exp-mind">精神 + {habit.exp_spirit}</span></span>
                </div>
              )}
            </>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => toggleHabitBoolField(habit, 'exclude_weekends')}
              className={`text-xs px-2 py-0.5 rounded transition-colors cursor-pointer ${habit.exclude_weekends ? 'text-cyan-300 bg-cyan-900/40 hover:bg-cyan-900/60' : 'text-zinc-500 bg-zinc-700 hover:bg-zinc-600'}`}
            >
              週末除外: {habit.exclude_weekends ? '有効' : '無効'}
            </button>
            <button
              type="button"
              onClick={() => toggleHabitBoolField(habit, 'exclude_from_complete')}
              className={`text-xs px-2 py-0.5 rounded transition-colors cursor-pointer ${habit.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/40 hover:bg-yellow-900/60' : 'text-zinc-500 bg-zinc-700 hover:bg-zinc-600'}`}
            >
              Comp対象外: {habit.exclude_from_complete ? '有効' : '無効'}
            </button>
          </div>
          {isChild && <div className="text-zinc-500">子習慣（親の報酬で1回のみ加算）</div>}
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
            <div className="flex items-center gap-2">
              <Button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => openAddDialog('good')}
                className="bg-cyan-600 hover:bg-cyan-700 font-bold"
              >
                <Plus className="w-4 h-4 mr-2" />
                良習慣を追加
              </Button>
              <Button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => openAddDialog('bad')}
                className="bg-red-600 hover:bg-red-700 font-bold"
              >
                <Plus className="w-4 h-4 mr-2" />
                悪習慣を追加
              </Button>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl text-cyan-400">
                  {editingHabit ? '習慣を編集' : formData.habit_type === 'bad' ? '悪習慣を追加' : '良習慣を追加'}
                </DialogTitle>
              </DialogHeader>
                <div
                  className="space-y-4 mt-4"
                  onKeyDown={(e) => {
                    if (!isSubmitShortcut(e)) return
                    e.preventDefault()
                    if (editingHabit) handleUpdateHabit()
                    else handleAddHabit()
                  }}
                >
                  {/* 習慣名 */}
                  <div>
                    <Label htmlFor="habit_name" className="text-zinc-300">習慣名 *</Label>
                    <Input
                      id="habit_name"
                      value={formData.habit_name}
                      onChange={(e) => setFormData({ ...formData, habit_name: e.target.value })}
                      placeholder="例: 筋トレ、早起き"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                    />
                  </div>

                  {/* 副見出し */}
                  <div>
                    <Label htmlFor="habit_subtitle" className="text-zinc-300">副見出し（任意）</Label>
                    <Input
                      id="habit_subtitle"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="例: 胸と背中、朝6時"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                    />
                  </div>

                  {/* 説明 */}
                  <div>
                    <Label htmlFor="habit_note" className="text-zinc-300">説明（任意）</Label>
                    <textarea
                      id="habit_note"
                      rows={3}
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="詳しい説明を記載してください。"
                      className="mt-1 w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-y min-h-[80px]"
                    />
                  </div>

                  {/* ゴルド（良習慣: + 表記 / 悪習慣: - 表記。タイプは「良習慣を追加」「悪習慣を追加」で開き分け） */}
                  <div>
                    <Label htmlFor="points" className="text-zinc-300">
                      ゴルド
                      {formData.habit_type === 'good' && <span className="text-green-400 ml-1">(+)</span>}
                      {formData.habit_type === 'bad' && <span className="text-red-400 ml-1">(-)</span>}
                    </Label>
                    <Input
                      id="points"
                      type="number"
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                    />
                  </div>

                  {/* EXP（良習慣: + 表記 / 悪習慣: - 表記） */}
                  {formData.habit_type === 'good' && (
                    <>
                      <div>
                        <Label htmlFor="exp_body" className="text-exp-body">身体EXP <span className="text-green-400">(+)</span></Label>
                        <Input
                          id="exp_body"
                          type="number"
                          value={formData.exp_body}
                          onChange={(e) => setFormData({ ...formData, exp_body: parseInt(e.target.value) || 0 })}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="exp_mind" className="text-exp-intelligence">頭脳EXP <span className="text-green-400">(+)</span></Label>
                        <Input
                          id="exp_mind"
                          type="number"
                          value={formData.exp_mind}
                          onChange={(e) => setFormData({ ...formData, exp_mind: parseInt(e.target.value) || 0 })}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="exp_spirit" className="text-exp-mind">精神EXP <span className="text-green-400">(+)</span></Label>
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
                  {formData.habit_type === 'bad' && (
                    <>
                      <div>
                        <Label htmlFor="exp_body_bad" className="text-exp-body">身体EXP <span className="text-red-400">(-)</span></Label>
                        <Input
                          id="exp_body_bad"
                          type="number"
                          value={formData.exp_body}
                          onChange={(e) => setFormData({ ...formData, exp_body: parseInt(e.target.value) || 0 })}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="exp_mind_bad" className="text-exp-intelligence">頭脳EXP <span className="text-red-400">(-)</span></Label>
                        <Input
                          id="exp_mind_bad"
                          type="number"
                          value={formData.exp_mind}
                          onChange={(e) => setFormData({ ...formData, exp_mind: parseInt(e.target.value) || 0 })}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="exp_spirit_bad" className="text-exp-mind">精神EXP <span className="text-red-400">(-)</span></Label>
                        <Input
                          id="exp_spirit_bad"
                          type="number"
                          value={formData.exp_spirit}
                          onChange={(e) => setFormData({ ...formData, exp_spirit: parseInt(e.target.value) || 0 })}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                        />
                      </div>
                    </>
                  )}

                  {/* オプション */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.exclude_weekends}
                        onChange={(e) => setFormData({ ...formData, exclude_weekends: e.target.checked })}
                        className="w-4 h-4 text-cyan-600"
                      />
                      <span className="text-zinc-300">週末を除外する</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.exclude_from_complete}
                        onChange={(e) => setFormData({ ...formData, exclude_from_complete: e.target.checked })}
                        className="w-4 h-4 text-cyan-600"
                      />
                      <span className="text-zinc-300">Completeボーナス対象外にする</span>
                    </label>
                  </div>

                  {/* ボタン：キャンセル左端・グレー、更新は右端 */}
                  <div className="flex justify-between gap-3 pt-4">
                    <Button
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                      variant="outline"
                      className="bg-zinc-600 hover:bg-zinc-500 text-zinc-200 border-zinc-500"
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={editingHabit ? handleUpdateHabit : handleAddHabit}
                      className="bg-cyan-600 hover:bg-cyan-700 shrink-0"
                    >
                      {editingHabit ? '更新' : '追加'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

        {/* 習慣一覧 */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400">読み込み中...</div>
        ) : (
          <div className="space-y-6">
            {/* 良習慣（アコーディオン） */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenGoodAccordion((v) => !v)}
                className="flex w-full items-center gap-2 p-4 text-left hover:bg-zinc-800/50 transition-colors"
                aria-expanded={openGoodAccordion}
              >
                <CheckCircle className="w-5 h-5 text-cyan-400 shrink-0" />
                <h2 className="text-xl font-semibold text-cyan-400">良習慣</h2>
                <span className="text-sm text-zinc-500">({goodHabits.length}件)</span>
                <span className={`ml-auto ${openGoodAccordion ? 'text-zinc-400' : 'text-cyan-400'}`}>
                  {openGoodAccordion ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </span>
              </button>
              {openGoodAccordion && (
                <div className="px-4 pb-4">
                  {goodHabits.length === 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
                      良習慣が登録されていません
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {goodTree.map(({ parent, children }) => (
                        <div key={parent.id} className="space-y-2">
                          <HabitCard habit={parent} hasChildren={children.length > 0} />
                          {children.map((child) => (
                            <HabitCard key={child.id} habit={child} isChild />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 悪習慣（アコーディオン） */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenBadAccordion((v) => !v)}
                className="flex w-full items-center gap-2 p-4 text-left hover:bg-zinc-800/50 transition-colors"
                aria-expanded={openBadAccordion}
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <h2 className="text-xl font-semibold text-red-400">悪習慣</h2>
                <span className="text-sm text-zinc-500">({badHabits.length}件)</span>
                <span className={`ml-auto ${openBadAccordion ? 'text-zinc-400' : 'text-cyan-400'}`}>
                  {openBadAccordion ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </span>
              </button>
              {openBadAccordion && (
                <div className="px-4 pb-4">
                  {badHabits.length === 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
                      悪習慣が登録されていません
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {badTree.map(({ parent, children }) => (
                        <div key={parent.id} className="space-y-2">
                          <HabitCard habit={parent} hasChildren={children.length > 0} />
                          {children.map((child) => (
                            <HabitCard key={child.id} habit={child} isChild />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
