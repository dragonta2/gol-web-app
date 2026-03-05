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
import { ArrowLeft, Plus, Edit, Trash2, GripVertical, ClipboardList, Star, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DatePickerField } from '@/components/date-picker-field';
import type { Difficulty, ExpAttribute } from '@/lib/types';
import {
  PRESET_GOLD_BY_DIFFICULTY,
  PRESET_EXP_BY_DIFFICULTY,
  EXP_ATTRIBUTE_LABELS,
  distributePresetExp,
} from '@/lib/types';

interface Todo {
  id: string;
  user_id: string;
  task_name: string;
  sp_points: number;
  sp_exp_body: number;
  sp_exp_mind: number;
  sp_exp_spirit: number;
  status: 'active' | 'in_progress' | 'completed';
  due_date: string | null;
  difficulty?: Difficulty;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export default function TodosSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  // フォーム状態（難易度＋属性で報酬を決定）
  const [selectedAttributes, setSelectedAttributes] = useState<ExpAttribute[]>(['mind']);
  const [formData, setFormData] = useState({
    task_name: '',
    sp_points: 2,
    sp_exp_body: 0,
    sp_exp_mind: 2,
    sp_exp_spirit: 0,
    status: 'active' as 'active' | 'in_progress' | 'completed',
    due_date: '',
    difficulty: 'medium' as Difficulty,
  });

  // ToDo一覧を取得
  const fetchTodos = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTodos(data || []);
    } catch (error) {
      console.error('ToDo取得エラー:', error);
      toast.error('ToDoの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  // フォームをリセット
  const resetForm = () => {
    setSelectedAttributes(['mind']);
    const gold = PRESET_GOLD_BY_DIFFICULTY['medium'];
    const dist = distributePresetExp(PRESET_EXP_BY_DIFFICULTY['medium'], ['mind']);
    setFormData({
      task_name: '',
      sp_points: gold,
      sp_exp_body: dist.body,
      sp_exp_mind: dist.mind,
      sp_exp_spirit: dist.spirit,
      status: 'active',
      due_date: '',
      difficulty: 'medium',
    });
    setEditingTodo(null);
  };

  // ToDoを追加
  const handleAddTodo = async () => {
    if (!formData.task_name.trim()) {
      toast.error('ToDo名を入力してください');
      return;
    }
    if (selectedAttributes.length === 0) {
      toast.error('属性を1つ以上選んでください');
      return;
    }

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          due_date: formData.due_date || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ToDoの追加に失敗しました');
      }

      toast.success('ToDoを追加しました');
      setIsDialogOpen(false);
      resetForm();
      fetchTodos();
    } catch (error) {
      console.error('ToDo追加エラー:', error);
      toast.error(error instanceof Error ? error.message : 'ToDoの追加に失敗しました');
    }
  };

  // ToDoを更新
  const handleUpdateTodo = async () => {
    if (!editingTodo || !formData.task_name.trim()) {
      toast.error('ToDo名を入力してください');
      return;
    }
    if (selectedAttributes.length === 0) {
      toast.error('属性を1つ以上選んでください');
      return;
    }

    try {
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todoId: editingTodo.id,
          ...formData,
          due_date: formData.due_date || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ToDoの更新に失敗しました');
      }

      toast.success('ToDoを更新しました');
      setIsDialogOpen(false);
      resetForm();
      fetchTodos();
    } catch (error) {
      console.error('ToDo更新エラー:', error);
      toast.error(error instanceof Error ? error.message : 'ToDoの更新に失敗しました');
    }
  };

  // ToDoを削除
  const handleDeleteTodo = async (todo: Todo) => {
    if (!confirm(`「${todo.task_name}」を削除しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/todos?id=${todo.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ToDoの削除に失敗しました');
      }

      toast.success('ToDoを削除しました');
      fetchTodos();
    } catch (error) {
      console.error('ToDo削除エラー:', error);
      toast.error(error instanceof Error ? error.message : 'ToDoの削除に失敗しました');
    }
  };

  // 保存されている sp_exp_* から属性選択を復元
  const inferAttributesFromTodo = (todo: Todo): ExpAttribute[] => {
    const attrs: ExpAttribute[] = [];
    if ((todo.sp_exp_body ?? 0) > 0) attrs.push('body');
    if ((todo.sp_exp_mind ?? 0) > 0) attrs.push('mind');
    if ((todo.sp_exp_spirit ?? 0) > 0) attrs.push('spirit');
    return attrs.length > 0 ? attrs : ['mind'];
  };

  // 編集ダイアログを開く
  const openEditDialog = (todo: Todo) => {
    setEditingTodo(todo);
    setSelectedAttributes(inferAttributesFromTodo(todo));
    setFormData({
      task_name: todo.task_name,
      sp_points: todo.sp_points,
      sp_exp_body: todo.sp_exp_body,
      sp_exp_mind: todo.sp_exp_mind,
      sp_exp_spirit: todo.sp_exp_spirit,
      status: todo.status,
      due_date: todo.due_date || '',
      difficulty: (todo.difficulty ?? 'medium') as Difficulty,
    });
    setIsDialogOpen(true);
  };

  // ToDoをステータス別に分類
  const activeTodos = todos.filter(t => t.status === 'active');
  const inProgressTodos = todos.filter(t => t.status === 'in_progress');
  const completedTodos = todos.filter(t => t.status === 'completed');

  // ステータスの表示名
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'アクティブタスク';
      case 'in_progress':
        return '進行中';
      case 'completed':
        return '完了済み';
      default:
        return status;
    }
  };

  // ステータスの色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-blue-400';
      case 'in_progress':
        return 'text-yellow-400';
      case 'completed':
        return 'text-green-400';
      default:
        return 'text-zinc-400';
    }
  };

  // ToDoカードコンポーネント
  const TodoCard = ({ todo }: { todo: Todo }) => (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <GripVertical className="w-4 h-4 text-zinc-500" />
          <h3 className={`text-lg font-medium text-zinc-100 ${todo.status === 'completed' ? 'line-through decoration-[3px]' : ''}`}>{todo.task_name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(todo.status)} bg-opacity-20`}>
            {getStatusLabel(todo.status)}
          </span>
        </div>
        <div className="text-sm text-zinc-400 space-y-1">
          {(todo.sp_points > 0 || todo.sp_exp_body + todo.sp_exp_mind + todo.sp_exp_spirit > 0) && (
            <>
              {todo.sp_points > 0 && <div>ゴルド: + {todo.sp_points}G</div>}
              {(todo.sp_exp_body + todo.sp_exp_mind + todo.sp_exp_spirit) > 0 && (
                <div>EXP: <span className="text-exp-body">身体 + {todo.sp_exp_body}</span> / <span className="text-exp-intelligence">頭脳 + {todo.sp_exp_mind}</span> / <span className="text-exp-mind">精神 + {todo.sp_exp_spirit}</span></div>
              )}
            </>
          )}
          {todo.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>期限: {format(new Date(todo.due_date), 'yyyy年MM月dd日(E)', { locale: ja })}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => openEditDialog(todo)}
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-zinc-100"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => handleDeleteTodo(todo)}
          variant="ghost"
          size="sm"
          className="text-red-400 hover:text-red-300"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
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
            <h1 className="text-3xl font-bold text-cyan-400">ToDo管理</h1>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="w-4 h-4 mr-2" />
                  ToDoを追加
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-cyan-400">
                    {editingTodo ? 'ToDoを編集' : '新しいToDoを追加'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {/* ToDo名 */}
                  <div>
                    <Label htmlFor="task_name" className="text-zinc-300">ToDo名 *</Label>
                    <Input
                      id="task_name"
                      value={formData.task_name}
                      onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                      placeholder="例: プロジェクトの準備"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                    />
                  </div>

                  {/* 難易度（やさしい1G/1EXP・ふつう2G/2EXP・むずかしい3G/3EXP） */}
                  <div>
                    <Label htmlFor="difficulty" className="text-zinc-300">難易度</Label>
                    <select
                      id="difficulty"
                      value={formData.difficulty}
                      onChange={(e) => {
                        const d = e.target.value as Difficulty;
                        let attrs = selectedAttributes;
                        if (d === 'easy' && attrs.length > 1) attrs = [attrs[0]];
                        if (d === 'medium' && attrs.length > 2) attrs = attrs.slice(0, 2);
                        setSelectedAttributes(attrs);
                        const gold = PRESET_GOLD_BY_DIFFICULTY[d];
                        const totalExp = PRESET_EXP_BY_DIFFICULTY[d];
                        const effective: ExpAttribute[] = attrs.length > 0 ? attrs : ['mind'];
                        const dist = distributePresetExp(totalExp, effective);
                        setFormData((prev) => ({
                          ...prev,
                          difficulty: d,
                          sp_points: gold,
                          sp_exp_body: dist.body,
                          sp_exp_mind: dist.mind,
                          sp_exp_spirit: dist.spirit,
                        }));
                      }}
                      className="mt-1 w-full pl-4 pr-10 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="easy">やさしい（1Gold・1EXP）</option>
                      <option value="medium">ふつう（2Gold・2EXP）</option>
                      <option value="hard">むずかしい（3Gold・3EXP）</option>
                    </select>
                  </div>

                  {/* 属性（体・頭・心）。やさしい=1つのみ／ふつう=1or2／むずかしい=1or2or3 */}
                  <div>
                    <Label className="text-zinc-300">属性（EXPの振り分け先）</Label>
                    <p className="text-sm text-zinc-400 mt-0.5 mb-2">
                      {formData.difficulty === 'easy' && '1つ選べます'}
                      {formData.difficulty === 'medium' && '1つ or 2つ選べます'}
                      {formData.difficulty === 'hard' && '1つ or 2つ or 3つ選べます'}
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {(['body', 'mind', 'spirit'] as ExpAttribute[]).map((attr) => {
                        const checked = selectedAttributes.includes(attr);
                        const isEasy = formData.difficulty === 'easy';
                        const isMedium = formData.difficulty === 'medium';
                        const disabled =
                          (isEasy && !checked && selectedAttributes.length >= 1) ||
                          (isMedium && !checked && selectedAttributes.length >= 2);
                        return (
                          <label
                            key={attr}
                            className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => {
                                let next: ExpAttribute[];
                                if (checked) {
                                  next = selectedAttributes.filter((a) => a !== attr);
                                  // いったん0個にして別の属性を選べるようにする（保存時に1つ以上必須で検証）
                                } else {
                                  if (isEasy) next = [attr];
                                  else if (isMedium && selectedAttributes.length >= 2) next = selectedAttributes;
                                  else next = [...selectedAttributes, attr];
                                }
                                setSelectedAttributes(next);
                                const gold = PRESET_GOLD_BY_DIFFICULTY[formData.difficulty];
                                const totalExp = PRESET_EXP_BY_DIFFICULTY[formData.difficulty];
                                const dist = distributePresetExp(totalExp, next);
                                setFormData((prev) => ({
                                  ...prev,
                                  sp_points: gold,
                                  sp_exp_body: dist.body,
                                  sp_exp_mind: dist.mind,
                                  sp_exp_spirit: dist.spirit,
                                }));
                              }}
                              className="w-4 h-4 text-cyan-600"
                            />
                            <span className="text-zinc-300">{EXP_ATTRIBUTE_LABELS[attr]}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">
                      ［報酬］<span className="text-gold">{formData.sp_points}GOLD</span> / <span className="text-exp-body">身体 + {formData.sp_exp_body}</span> <span className="text-exp-intelligence">頭脳 + {formData.sp_exp_mind}</span> <span className="text-exp-mind">精神 + {formData.sp_exp_spirit}</span>
                    </p>
                  </div>

                  {/* ステータス（編集時のみ選択可。新規は常にアクティブ） */}
                  {editingTodo && (
                    <div>
                      <Label className="text-zinc-300">ステータス</Label>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="active"
                            checked={formData.status === 'active'}
                            onChange={(e) => setFormData({ ...formData, status: 'active' as const })}
                            className="w-4 h-4 text-cyan-600"
                          />
                          <span className="text-zinc-300">アクティブタスク</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="in_progress"
                            checked={formData.status === 'in_progress'}
                            onChange={(e) => setFormData({ ...formData, status: 'in_progress' as const })}
                            className="w-4 h-4 text-cyan-600"
                          />
                          <span className="text-zinc-300">進行中</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="completed"
                            checked={formData.status === 'completed'}
                            onChange={(e) => setFormData({ ...formData, status: 'completed' as const })}
                            className="w-4 h-4 text-cyan-600"
                          />
                          <span className="text-zinc-300">完了済み</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* 期限（ヘッダーと同じダークカレンダーで選択） */}
                  <DatePickerField
                    id="due_date"
                    label="期限"
                    value={formData.due_date}
                    onChange={(value) => setFormData({ ...formData, due_date: value })}
                    optional
                  />

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
                      onClick={editingTodo ? handleUpdateTodo : handleAddTodo}
                      className="bg-cyan-600 hover:bg-cyan-700 shrink-0"
                    >
                      {editingTodo ? '更新' : '追加'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ToDo一覧 */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400">読み込み中...</div>
        ) : (
          <div className="space-y-6">
            {/* アクティブタスク */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-semibold text-blue-400">アクティブタスク</h2>
                <span className="text-sm text-zinc-500">({activeTodos.length}件)</span>
              </div>
              {activeTodos.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
                  アクティブなToDoがありません
                </div>
              ) : (
                <div className="space-y-3">
                  {activeTodos.map((todo) => (
                    <TodoCard key={todo.id} todo={todo} />
                  ))}
                </div>
              )}
            </div>

            {/* 進行中 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-yellow-400" />
                <h2 className="text-xl font-semibold text-yellow-400">進行中</h2>
                <span className="text-sm text-zinc-500">({inProgressTodos.length}件)</span>
              </div>
              {inProgressTodos.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
                  進行中のToDoがありません
                </div>
              ) : (
                <div className="space-y-3">
                  {inProgressTodos.map((todo) => (
                    <TodoCard key={todo.id} todo={todo} />
                  ))}
                </div>
              )}
            </div>

            {/* 完了済み */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-green-400" />
                <h2 className="text-xl font-semibold text-green-400">完了済み</h2>
                <span className="text-sm text-zinc-500">({completedTodos.length}件)</span>
              </div>
              {completedTodos.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
                  完了済みのToDoがありません
                </div>
              ) : (
                <div className="space-y-3">
                  {completedTodos.map((todo) => (
                    <TodoCard key={todo.id} todo={todo} />
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
