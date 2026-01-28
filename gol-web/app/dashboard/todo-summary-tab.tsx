'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Todo, TodoLog, TodoSubtask, Difficulty, Tag } from '@/lib/types';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, DIFFICULTY_MULTIPLIERS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { FormInput, FormInputSmall, FormLabel } from '@/components/ui/form-input';
import { FormCard } from '@/components/ui/form-card';
import { toast } from 'sonner';
import { ClipboardList, Edit } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface TodoSummaryTabProps {
  todos: Todo[];
  todoLogs: TodoLog[];
  todoSubtasks: TodoSubtask[];
  dailyLogId: string | null;
  /** 日誌カンバンから「編集」で飛んできたとき、このIDのタスクの編集モーダルを開く */
  initialEditTodoId?: string | null;
  /** 編集モーダルを開いたあと、親の editTodoId をクリアするために呼ぶ */
  onInitialEditConsumed?: () => void;
}

interface TodoFormData {
  task_name: string;
  sp_points: number;
  sp_exp_body: number;
  sp_exp_mind: number;
  sp_exp_spirit: number;
  due_date: string;
  status: 'active' | 'in_progress' | 'completed';
  difficulty: Difficulty;
}

export default function TodoSummaryTab({ todos, todoLogs, todoSubtasks, dailyLogId, initialEditTodoId, onInitialEditConsumed }: TodoSummaryTabProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // サブタスクが1件以上あるToDoはデフォルトで展開
  const [expandedTodos, setExpandedTodos] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    for (const st of todoSubtasks) ids.add(st.todo_id);
    return ids;
  });
  const [editingSubtask, setEditingSubtask] = useState<{ todoId: string; subtask: TodoSubtask | null } | null>(null);
  const [subtaskFormData, setSubtaskFormData] = useState({ subtask_name: '' });
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  // フィルター状態（初回はサーバーとクライアントで同じにし、マウント後に localStorage から復元して Hydration エラーを防ぐ）
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [filterDifficulties, setFilterDifficulties] = useState<Difficulty[]>([]);
  // 月ごとのフィルター状態（'all' = すべて、'YYYY-MM' = 特定の月）
  const [monthFilter, setMonthFilter] = useState<string>('all');
  
  // ドラッグ&ドロップ用の状態
  const [activeId, setActiveId] = useState<string | null>(null);
  const [orderedTodos, setOrderedTodos] = useState<{ active: Todo[]; inProgress: Todo[] }>({
    active: [],
    inProgress: [],
  });

  // マウント後に localStorage からフィルターを復元（Hydration 後のみ実行）
  useEffect(() => {
    const savedTagIds = localStorage.getItem('todo-summary-filter-tag-ids');
    if (savedTagIds) {
      try {
        const parsed = JSON.parse(savedTagIds);
        if (Array.isArray(parsed)) setFilterTagIds(parsed);
      } catch {
        /* ignore */
      }
    }
    const savedDiff = localStorage.getItem('todo-summary-filter-difficulties');
    if (savedDiff) {
      try {
        const parsed = JSON.parse(savedDiff);
        if (Array.isArray(parsed)) setFilterDifficulties(parsed);
      } catch {
        /* ignore */
      }
    }
  }, []);

  // フィルター状態をローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('todo-summary-filter-tag-ids', JSON.stringify(filterTagIds));
  }, [filterTagIds]);

  useEffect(() => {
    localStorage.setItem('todo-summary-filter-difficulties', JSON.stringify(filterDifficulties));
  }, [filterDifficulties]);
  // タグ管理モーダル
  const [isTagManagementModalOpen, setIsTagManagementModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagFormData, setTagFormData] = useState({ tag_name: '', tag_color: '#3b82f6' });
  const [formData, setFormData] = useState<TodoFormData>({
    task_name: '',
    sp_points: 0,
    sp_exp_body: 0,
    sp_exp_mind: 0,
    sp_exp_spirit: 0,
    due_date: '',
    status: 'active',
    difficulty: 'medium',
  });

  // フィルター適用関数
  const applyFilters = (todoList: Todo[]) => {
    return todoList.filter((todo) => {
      // 検索フィルター
      if (searchQuery && !todo.task_name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // タグフィルター（AND条件：選択されたタグのすべてが含まれている必要がある）
      if (filterTagIds.length > 0) {
        const todoTagIds = todo.tags?.map((t) => t.id) || [];
        const hasAllTags = filterTagIds.every((tagId) => todoTagIds.includes(tagId));
        if (!hasAllTags) return false;
      }

      // 難易度フィルター（OR条件：選択された難易度のいずれかに一致）
      if (filterDifficulties.length > 0) {
        if (!todo.difficulty || !filterDifficulties.includes(todo.difficulty)) {
          return false;
        }
      }

      return true;
    });
  };

  // 完了済みToDoを月ごとにグループ化
  const getCompletedTodosByMonth = () => {
    const completed = todos.filter((todo) => todo.status === 'completed');
    const grouped: Record<string, Todo[]> = {};
    
    completed.forEach((todo) => {
      if (todo.completed_at) {
        const date = new Date(todo.completed_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!grouped[monthKey]) {
          grouped[monthKey] = [];
        }
        grouped[monthKey].push(todo);
      }
    });
    
    return grouped;
  };

  // 月ごとのオプションリストを生成（降順：最新の月が先頭）
  const getMonthOptions = (): string[] => {
    const grouped = getCompletedTodosByMonth();
    const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    return months;
  };

  // 月の表示名を取得（例: "2026年1月"）
  const getMonthLabel = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    return `${year}年${parseInt(month)}月`;
  };

  // 期限超過判定
  const isOverdue = (dueDate: string | null, status: string): boolean => {
    if (!dueDate || status === 'completed') return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  // ToDoを並び替える関数（期限超過を一番上、それ以外は期限の古い順）
  const sortTodos = (todoList: Todo[]): Todo[] => {
    return [...todoList].sort((a, b) => {
      const aOverdue = isOverdue(a.due_date, a.status);
      const bOverdue = isOverdue(b.due_date, b.status);
      
      // 期限超過を一番上に
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      // 両方とも期限超過、または両方とも期限超過でない場合
      // 期限の古い順（昇順）に並び替え
      if (a.due_date && b.due_date) {
        const aDate = new Date(a.due_date).getTime();
        const bDate = new Date(b.due_date).getTime();
        return aDate - bDate;
      }
      
      // 期限がない場合は後ろに
      if (!a.due_date && b.due_date) return 1;
      if (a.due_date && !b.due_date) return -1;
      
      // 両方とも期限がない場合は元の順序を維持（display_orderで並び替え）
      return (a.display_order || 0) - (b.display_order || 0);
    });
  };

  // ステータス別にtodosを分類（フィルター適用後、並び替え）。useMemoで参照を安定させ、useEffectの無限ループを防ぐ
  const filteredActiveTodos = useMemo(
    () => sortTodos(applyFilters(todos.filter((todo) => todo.status === 'active'))),
    [todos, filterTagIds, filterDifficulties, searchQuery]
  );
  const filteredInProgressTodos = useMemo(
    () => sortTodos(applyFilters(todos.filter((todo) => todo.status === 'in_progress'))),
    [todos, filterTagIds, filterDifficulties, searchQuery]
  );

  // ドラッグ&ドロップで並び替えられた順序を管理
  useEffect(() => {
    setOrderedTodos({
      active: filteredActiveTodos,
      inProgress: filteredInProgressTodos,
    });
  }, [filteredActiveTodos, filteredInProgressTodos]);
  
  const activeTodos = orderedTodos.active;
  const inProgressTodos = orderedTodos.inProgress;
  
  // ドラッグ&ドロップ用のセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px以上移動しないとドラッグ開始しない
      },
    })
  );
  
  // ドラッグ開始時の処理
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  
  // ドラッグ終了時の処理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }
    
    const activeTodo = todos.find((t) => t.id === active.id);
    if (!activeTodo) {
      setActiveId(null);
      return;
    }
    
    // 期限超過のToDoは並び替え不可
    if (isOverdue(activeTodo.due_date, activeTodo.status)) {
      setActiveId(null);
      toast.warning('期限超過のToDoは並び替えできません');
      return;
    }
    
    // 並び替え処理
    const status = activeTodo.status;
    const currentList = status === 'active' ? [...activeTodos] : [...inProgressTodos];
    const oldIndex = currentList.findIndex((t) => t.id === active.id);
    const newIndex = currentList.findIndex((t) => t.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) {
      setActiveId(null);
      return;
    }
    
    // 配列を並び替え
    const [movedTodo] = currentList.splice(oldIndex, 1);
    currentList.splice(newIndex, 0, movedTodo);
    
    // 期限超過のToDoを一番上に戻す
    const overdueTodos = currentList.filter((t) => isOverdue(t.due_date, t.status));
    const nonOverdueTodos = currentList.filter((t) => !isOverdue(t.due_date, t.status));
    const sortedList = [...overdueTodos, ...nonOverdueTodos];
    
    // 状態を更新
    if (status === 'active') {
      setOrderedTodos({ ...orderedTodos, active: sortedList });
    } else {
      setOrderedTodos({ ...orderedTodos, inProgress: sortedList });
    }
    
    // display_orderを更新
    try {
      const supabase = createClient();
      for (let i = 0; i < sortedList.length; i++) {
        const todo = sortedList[i];
        // 期限超過のToDoはdisplay_orderを更新しない（一番上に固定）
        if (!isOverdue(todo.due_date, todo.status)) {
          await supabase
            .from('todos')
            .update({ display_order: i + overdueTodos.length })
            .eq('id', todo.id);
        }
      }
      toast.success('並び順を更新しました');
    } catch (error) {
      console.error('並び順更新エラー:', error);
      toast.error('並び順の更新に失敗しました');
      // エラー時は元の順序に戻す
      setOrderedTodos({
        active: filteredActiveTodos,
        inProgress: filteredInProgressTodos,
      });
    }
    
    setActiveId(null);
  };
  
  // 完了済みタスク（月フィルター適用）
  const getFilteredCompletedTodos = () => {
    const completed = todos.filter((todo) => todo.status === 'completed');
    let filtered = applyFilters(completed);
    
    // 月フィルターが適用されている場合
    if (monthFilter !== 'all') {
      filtered = filtered.filter((todo) => {
        if (!todo.completed_at) return false;
        const date = new Date(todo.completed_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === monthFilter;
      });
    }
    
    return filtered;
  };
  
  const completedTodos = getFilteredCompletedTodos();

  // 日付フォーマット（YY/MM/DD形式）
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '─';
    const date = new Date(dateString);
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  // EXP合計計算
  const getTotalExp = (todo: Todo): number => {
    return todo.sp_exp_body + todo.sp_exp_mind + todo.sp_exp_spirit;
  };

  // 完了済みタスクのEXP配分を取得（todo_logsから）
  const getExpDistribution = (todoId: string): { body: number; mind: number; spirit: number } | null => {
    const log = todoLogs.find((log) => log.todo_id === todoId);
    if (!log) return null;
    return {
      body: log.exp_body_earned,
      mind: log.exp_mind_earned,
      spirit: log.exp_spirit_earned,
    };
  };

  // タグ一覧を取得
  const fetchTags = async () => {
    setIsLoadingTags(true);
    try {
      const response = await fetch('/api/tags');
      if (!response.ok) {
        throw new Error('タグの取得に失敗しました');
      }
      const data = await response.json();
      setTags(data.tags || []);
    } catch (err) {
      console.error('タグ取得エラー:', err);
      toast.error('タグの取得に失敗しました');
    } finally {
      setIsLoadingTags(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  // ToDoのタグを取得
  const fetchTodoTags = async (todoId: string) => {
    try {
      const response = await fetch(`/api/todos/${todoId}/tags`);
      if (!response.ok) {
        throw new Error('ToDoのタグ取得に失敗しました');
      }
      const data = await response.json();
      // todoTagsからtag_idを抽出
      const tagIds = (data.tags || []).map((tt: any) => tt.tag_id);
      setSelectedTagIds(tagIds);
    } catch (err) {
      console.error('ToDoのタグ取得エラー:', err);
    }
  };

  // モーダルを開く（新規作成）
  const handleOpenCreateModal = () => {
    setEditingTodo(null);
    setSelectedTagIds([]);
    setFormData({
      task_name: '',
      sp_points: 0,
      sp_exp_body: 0,
      sp_exp_mind: 0,
      sp_exp_spirit: 0,
      due_date: '',
      status: 'active',
      difficulty: 'medium',
    });
    setIsModalOpen(true);
  };

  // モーダルを開く（編集）
  const handleOpenEditModal = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      task_name: todo.task_name,
      sp_points: todo.sp_points,
      sp_exp_body: todo.sp_exp_body,
      sp_exp_mind: todo.sp_exp_mind,
      sp_exp_spirit: todo.sp_exp_spirit,
      due_date: todo.due_date || '',
      status: todo.status,
      difficulty: todo.difficulty || 'medium',
    });
    // ToDoのタグを取得
    fetchTodoTags(todo.id);
    setIsModalOpen(true);
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTodo(null);
    setSelectedTagIds([]);
  };

  // 日誌カンバンから「編集」で飛んできたとき、該当タスクの編集モーダルを開く
  useEffect(() => {
    if (!initialEditTodoId || !todos.length) return;
    const todo = todos.find((t) => t.id === initialEditTodoId);
    if (!todo) return;
    setEditingTodo(todo);
    setFormData({
      task_name: todo.task_name,
      sp_points: todo.sp_points,
      sp_exp_body: todo.sp_exp_body,
      sp_exp_mind: todo.sp_exp_mind,
      sp_exp_spirit: todo.sp_exp_spirit,
      due_date: todo.due_date || '',
      status: todo.status,
      difficulty: todo.difficulty || 'medium',
    });
    fetchTodoTags(todo.id);
    setIsModalOpen(true);
    onInitialEditConsumed?.();
  }, [initialEditTodoId, todos, onInitialEditConsumed]);

  // 報酬計算関数（難易度倍率を適用、sp_* をそのまま倍率掛け）
  const calculateReward = (todo: Todo) => {
    const multiplier = DIFFICULTY_MULTIPLIERS[todo.difficulty || 'medium'];
    return {
      points: Math.round((todo.sp_points ?? 0) * multiplier),
      exp_body: Math.round((todo.sp_exp_body ?? 0) * multiplier),
      exp_mind: Math.round((todo.sp_exp_mind ?? 0) * multiplier),
      exp_spirit: Math.round((todo.sp_exp_spirit ?? 0) * multiplier),
    };
  };

  // タスク完了時の報酬計算・反映処理
  const handleTaskCompletion = async (todo: Todo) => {
    if (!dailyLogId) {
      console.warn('dailyLogIdが存在しないため、報酬を記録できません');
      return;
    }

    try {
      const supabase = createClient();

      // 現在のユーザーを取得
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('ユーザー取得エラー:', authError);
        return;
      }

      // 報酬を計算
      const reward = calculateReward(todo);

      // todo_logsに記録を作成または更新（UNIQUE制約があるためUPSERT）
      const { error: logError } = await supabase
        .from('todo_logs')
        .upsert(
          {
            daily_log_id: dailyLogId,
            todo_id: todo.id,
            points_earned: reward.points,
            exp_body_earned: reward.exp_body,
            exp_mind_earned: reward.exp_mind,
            exp_spirit_earned: reward.exp_spirit,
          },
          {
            onConflict: 'daily_log_id,todo_id',
          }
        );

      if (logError) {
        console.error('todo_logs記録エラー:', logError);
        return;
      }

      // profilesテーブルのポイント/EXPを更新（報酬がある場合のみ）
      if (reward.points > 0 || reward.exp_body > 0 || reward.exp_mind > 0 || reward.exp_spirit > 0) {
        // 現在のprofilesデータを取得
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('points, exp_body, exp_mind, exp_spirit')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          console.error('profiles取得エラー:', profileError);
          return;
        }

        // 報酬を加算
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            points: profile.points + reward.points,
            exp_body: profile.exp_body + reward.exp_body,
            exp_mind: profile.exp_mind + reward.exp_mind,
            exp_spirit: profile.exp_spirit + reward.exp_spirit,
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('profiles更新エラー:', updateError);
        }
      }
    } catch (err) {
      console.error('報酬計算・反映エラー:', err);
    }
  };

  // タスク未完了時の報酬削除処理
  const handleTaskUncompletion = async (todo: Todo) => {
    if (!dailyLogId) {
      return;
    }

    try {
      const supabase = createClient();

      // 現在のユーザーを取得
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('ユーザー取得エラー:', authError);
        return;
      }

      // todo_logsから記録を取得
      const { data: todoLog, error: logSelectError } = await supabase
        .from('todo_logs')
        .select('points_earned, exp_body_earned, exp_mind_earned, exp_spirit_earned')
        .eq('daily_log_id', dailyLogId)
        .eq('todo_id', todo.id)
        .single();

      if (logSelectError || !todoLog) {
        // 記録が存在しない場合は何もしない
        return;
      }

      // profilesテーブルから報酬を減算
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('points, exp_body, exp_mind, exp_spirit')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('profiles取得エラー:', profileError);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          points: Math.max(0, profile.points - todoLog.points_earned),
          exp_body: Math.max(0, profile.exp_body - todoLog.exp_body_earned),
          exp_mind: Math.max(0, profile.exp_mind - todoLog.exp_mind_earned),
          exp_spirit: Math.max(0, profile.exp_spirit - todoLog.exp_spirit_earned),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('profiles更新エラー:', updateError);
        return;
      }

      // todo_logsから記録を削除
      const { error: logDeleteError } = await supabase
        .from('todo_logs')
        .delete()
        .eq('daily_log_id', dailyLogId)
        .eq('todo_id', todo.id);

      if (logDeleteError) {
        console.error('todo_logs削除エラー:', logDeleteError);
      }
    } catch (err) {
      console.error('報酬削除エラー:', err);
    }
  };

  // ToDoを保存（作成・更新）
  const handleSaveTodo = async () => {
    // クライアント側バリデーション
    if (!formData.task_name.trim()) {
      toast.error('タスク名を入力してください');
      return;
    }
    const numericFields = [
      { key: 'sp_points', value: formData.sp_points, label: 'ゴルド' },
      { key: 'sp_exp_body', value: formData.sp_exp_body, label: '身体EXP' },
      { key: 'sp_exp_mind', value: formData.sp_exp_mind, label: '頭脳EXP' },
      { key: 'sp_exp_spirit', value: formData.sp_exp_spirit, label: '精神EXP' },
    ];
    for (const f of numericFields) {
      if (Number.isNaN(f.value) || f.value < 0) {
        toast.error(`${f.label}は0以上の数値で入力してください`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      // 現在のユーザーを取得
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast.error('ログインが必要です', { description: '再度ログインしてください' });
        return;
      }

      // 最大display_orderを取得（新規作成時）
      let displayOrder = 0;
      if (!editingTodo) {
        const { data: maxOrderTodo } = await supabase
          .from('todos')
          .select('display_order')
          .eq('user_id', user.id)
          .order('display_order', { ascending: false })
          .limit(1)
          .single();

        displayOrder = maxOrderTodo ? maxOrderTodo.display_order + 1 : 0;
      }

      const wasCompleted = editingTodo?.status === 'completed';
      const willBeCompleted = formData.status === 'completed';
      const updatedTodo: Todo = editingTodo
        ? { ...editingTodo, ...formData }
        : {
            id: '',
            user_id: user.id,
            task_name: formData.task_name.trim(),
            sp_points: formData.sp_points,
            sp_exp_body: formData.sp_exp_body,
            sp_exp_mind: formData.sp_exp_mind,
            sp_exp_spirit: formData.sp_exp_spirit,
            status: formData.status,
            due_date: formData.due_date || null,
            completed_at: formData.status === 'completed' ? new Date().toISOString() : null,
            display_order: displayOrder,
            difficulty: formData.difficulty,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

      if (editingTodo) {
        // 更新
        const updateData: Partial<Todo> = {
          task_name: formData.task_name.trim(),
          sp_points: formData.sp_points,
          sp_exp_body: formData.sp_exp_body,
          sp_exp_mind: formData.sp_exp_mind,
          sp_exp_spirit: formData.sp_exp_spirit,
          due_date: formData.due_date || null,
          status: formData.status,
          difficulty: formData.difficulty,
        };

        if (formData.status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        } else {
          updateData.completed_at = null;
        }

        const { error } = await supabase
          .from('todos')
          .update(updateData)
          .eq('id', editingTodo.id);

        if (error) {
          console.error('ToDo更新エラー:', error);
          toast.error('ToDoの更新に失敗しました', {
            description: error.message || 'データベースエラーが発生しました',
          });
          return;
        }

        // タグの更新処理
        if (editingTodo) {
          // 既存のタグを取得
          const existingTagsResponse = await fetch(`/api/todos/${editingTodo.id}/tags`);
          if (existingTagsResponse.ok) {
            const existingTagsData = await existingTagsResponse.json();
            const existingTagIds = (existingTagsData.tags || []).map((tt: any) => tt.tag_id);

            // 削除するタグ
            const tagsToRemove = existingTagIds.filter((id: string) => !selectedTagIds.includes(id));
            for (const tagId of tagsToRemove) {
              await fetch(`/api/todos/${editingTodo.id}/tags/${tagId}`, {
                method: 'DELETE',
              });
            }

            // 追加するタグ
            const tagsToAdd = selectedTagIds.filter((id: string) => !existingTagIds.includes(id));
            for (const tagId of tagsToAdd) {
              await fetch(`/api/todos/${editingTodo.id}/tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tag_id: tagId }),
              });
            }
          }
        }

        // 報酬計算・反映処理
        if (!wasCompleted && willBeCompleted) {
          // 未完了 → 完了: 報酬を付与
          await handleTaskCompletion(updatedTodo);
        } else if (wasCompleted && !willBeCompleted) {
          // 完了 → 未完了: 報酬を削除
          await handleTaskUncompletion(editingTodo);
        }
      } else {
        // 作成
        const { data: newTodo, error } = await supabase
          .from('todos')
          .insert({
            user_id: user.id,
            task_name: formData.task_name.trim(),
            sp_points: formData.sp_points,
            sp_exp_body: formData.sp_exp_body,
            sp_exp_mind: formData.sp_exp_mind,
            sp_exp_spirit: formData.sp_exp_spirit,
            due_date: formData.due_date || null,
            status: formData.status,
            difficulty: formData.difficulty,
            display_order: displayOrder,
            completed_at: formData.status === 'completed' ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (error || !newTodo) {
          console.error('ToDo作成エラー:', error);
          toast.error('ToDoの作成に失敗しました', {
            description: error?.message || 'データベースエラーが発生しました',
          });
          return;
        }

        // タグを追加
        if (newTodo && selectedTagIds.length > 0) {
          for (const tagId of selectedTagIds) {
            await fetch(`/api/todos/${newTodo.id}/tags`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tag_id: tagId }),
            });
          }
        }

        // 新規作成で完了状態の場合、報酬を付与
        if (willBeCompleted && newTodo) {
          await handleTaskCompletion(newTodo);
        }
      }

      // モーダルを閉じる
      handleCloseModal();

      // ページをリフレッシュしてデータを再取得
      router.refresh();
    } catch (err) {
      console.error('予期しないエラー:', err);
      toast.error('エラーが発生しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ToDoを削除
  const handleDeleteTodo = async (todo: Todo) => {
    if (!confirm(`「${todo.task_name}」を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', todo.id);

      if (error) {
        console.error('ToDo削除エラー:', error);
        toast.error('ToDoの削除に失敗しました', {
          description: error.message || 'データベースエラーが発生しました',
        });
        return;
      }

      // ページをリフレッシュしてデータを再取得
      router.refresh();
    } catch (err) {
      console.error('予期しないエラー:', err);
      toast.error('エラーが発生しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    }
  };

  // サブタスクを取得（todo_idでフィルタ）
  const getSubtasksForTodo = (todoId: string): TodoSubtask[] => {
    return todoSubtasks.filter((st) => st.todo_id === todoId);
  };

  // サブタスクの展開/折りたたみ
  const toggleSubtaskExpansion = (todoId: string) => {
    const newExpanded = new Set(expandedTodos);
    if (newExpanded.has(todoId)) {
      newExpanded.delete(todoId);
    } else {
      newExpanded.add(todoId);
    }
    setExpandedTodos(newExpanded);
  };

  // サブタスクの完了状態を切り替え（チェック時に completed_at を記録）
  const handleToggleSubtaskCompletion = async (subtask: TodoSubtask) => {
    try {
      const supabase = createClient();
      const willBeCompleted = !subtask.is_completed;

      const { error } = await supabase
        .from('todo_subtasks')
        .update({
          is_completed: willBeCompleted,
          completed_at: willBeCompleted ? new Date().toISOString() : null,
        })
        .eq('id', subtask.id);

      if (error) {
        console.error('サブタスク更新エラー:', error);
        toast.error('サブタスクの更新に失敗しました', {
          description: error.message || 'データベースエラーが発生しました',
        });
        return;
      }

      // ページをリフレッシュしてデータを再取得
      router.refresh();
    } catch (err) {
      console.error('予期しないエラー:', err);
      toast.error('エラーが発生しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    }
  };

  // サブタスクを追加
  const handleAddSubtask = async (todoId: string) => {
    if (!subtaskFormData.subtask_name.trim()) {
      toast.error('サブタスク名を入力してください');
      return;
    }

    try {
      const supabase = createClient();

      // 最大display_orderを取得（0件のときは .single() がエラーになるため .maybeSingle() を使用）
      const { data: maxOrderSubtask } = await supabase
        .from('todo_subtasks')
        .select('display_order')
        .eq('todo_id', todoId)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const displayOrder = maxOrderSubtask != null ? maxOrderSubtask.display_order + 1 : 0;

      const { error } = await supabase
        .from('todo_subtasks')
        .insert({
          todo_id: todoId,
          subtask_name: subtaskFormData.subtask_name.trim(),
          is_completed: false,
          display_order: displayOrder,
        });

      if (error) {
        console.error('サブタスク作成エラー:', error);
        toast.error('サブタスクの作成に失敗しました', {
          description: error.message || 'データベースエラーが発生しました',
        });
        return;
      }

      // フォームをリセット
      setSubtaskFormData({ subtask_name: '' });
      setEditingSubtask(null);

      // ページをリフレッシュしてデータを再取得
      router.refresh();
    } catch (err) {
      console.error('予期しないエラー:', err);
      toast.error('エラーが発生しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    }
  };

  // サブタスクを編集
  const handleEditSubtask = async (subtask: TodoSubtask) => {
    if (!subtaskFormData.subtask_name.trim()) {
      toast.error('サブタスク名を入力してください');
      return;
    }

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('todo_subtasks')
        .update({ subtask_name: subtaskFormData.subtask_name.trim() })
        .eq('id', subtask.id);

      if (error) {
        console.error('サブタスク更新エラー:', error);
        toast.error('サブタスクの更新に失敗しました', {
          description: error.message || 'データベースエラーが発生しました',
        });
        return;
      }

      // フォームをリセット
      setSubtaskFormData({ subtask_name: '' });
      setEditingSubtask(null);

      // ページをリフレッシュしてデータを再取得
      router.refresh();
    } catch (err) {
      console.error('予期しないエラー:', err);
      toast.error('エラーが発生しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    }
  };

  // サブタスクを削除
  const handleDeleteSubtask = async (subtask: TodoSubtask) => {
    if (!confirm(`「${subtask.subtask_name}」を削除しますか？`)) {
      return;
    }

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('todo_subtasks')
        .delete()
        .eq('id', subtask.id);

      if (error) {
        console.error('サブタスク削除エラー:', error);
        toast.error('サブタスクの削除に失敗しました', {
          description: error.message || 'データベースエラーが発生しました',
        });
        return;
      }

      // ページをリフレッシュしてデータを再取得
      router.refresh();
    } catch (err) {
      console.error('予期しないエラー:', err);
      toast.error('エラーが発生しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    }
  };

  // ドラッグ可能なToDoカードコンポーネント
  const DraggableTodoCard = ({ todo, isCompleted, isOverdue }: { todo: Todo; isCompleted: boolean; isOverdue: boolean }) => {
    const canDrag = !isCompleted && !isOverdue;
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: todo.id,
      disabled: !canDrag,
    });

    const style = {
      transform: CSS.Translate.toString(transform),
      opacity: isDragging ? 0.5 : 1,
    };

    const totalExp = getTotalExp(todo);
    const expDist = isCompleted ? getExpDistribution(todo.id) : null;
    const reward = calculateReward(todo);

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...(canDrag ? { ...listeners, ...attributes } : {})}
        className={`bg-zinc-900 border border-zinc-700 rounded-lg p-3 sm:p-4 transition-colors ${
          isCompleted ? 'opacity-75' : canDrag ? 'hover:border-cyan-600 cursor-grab active:cursor-grabbing' : ''
        }`}
      >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {isCompleted && <span className="text-green-400">✅</span>}
                  {!isCompleted && isOverdue && <span className="text-red-400 text-base">⚠️ 期限超過</span>}
                  {(reward.points > 0 || totalExp > 0) && (
                    <span className="text-zinc-400 text-base">
                      {reward.points > 0 && <>{reward.points}G </>}
                      {totalExp > 0 && <>{totalExp}ex</>}
                    </span>
                  )}
                  <span className={`text-zinc-100 font-medium text-base ${isCompleted ? 'line-through' : ''}`}>
                    {todo.task_name}
                  </span>
                  {todo.difficulty && (
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${DIFFICULTY_COLORS[todo.difficulty]} text-white`}
                      title={`難易度: ${DIFFICULTY_LABELS[todo.difficulty]}`}
                    >
                      {DIFFICULTY_LABELS[todo.difficulty]}
                    </span>
                  )}
                </div>
                {/* タグチップ */}
                {todo.tags && todo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {todo.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-0.5 text-xs rounded text-white"
                        style={{ backgroundColor: tag.tag_color }}
                        title={tag.tag_name}
                      >
                        {tag.tag_name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-base text-zinc-400 space-y-1">
                  <div>
                    期限: {todo.due_date ? formatDate(todo.due_date) : '─'}
                  </div>
                  {isCompleted && (
                    <div>
                      完了日: {todo.completed_at ? formatDate(todo.completed_at) : '─'}
                    </div>
                  )}
                  {expDist && (
                    <div className="text-zinc-300 mt-2">
                      EXP配分: 身体+{expDist.body} 頭脳+{expDist.mind} 精神+{expDist.spirit}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0 ml-auto">
                <Button
                  onClick={() => handleOpenEditModal(todo)}
                  variant="ghost"
                  size="sm"
                  aria-label={`${todo.task_name}を編集する`}
                  className="text-xs text-cyan-400 hover:text-cyan-300 group h-auto px-2 py-0.5 flex items-center gap-0.5 min-h-0"
                >
                  <Edit className="w-3 h-3 shrink-0" />
                  <span className="group-hover:underline">編集</span>
                </Button>
                <Button
                  onClick={() => handleDeleteTodo(todo)}
                  variant="ghost"
                  size="sm"
                  aria-label={`${todo.task_name}を削除する`}
                  className="text-xs text-red-400 hover:text-red-300 group h-auto px-2 py-0.5 flex items-center gap-1 min-h-0"
                >
                  <span className="shrink-0" aria-hidden>🗑</span>
                  <span className="group-hover:underline">削除</span>
                </Button>
              </div>
            </div>

            {/* サブタスク表示 */}
            {(() => {
              const subtasks = getSubtasksForTodo(todo.id);
              const isExpanded = expandedTodos.has(todo.id);
              const isEditing = editingSubtask?.todoId === todo.id;

              return (
                <div className="mt-3 pt-3 border-t border-zinc-700">
                  <div className="flex items-center justify-between mb-2">
                    <Button
                      onClick={() => toggleSubtaskExpansion(todo.id)}
                      variant="ghost"
                      size="sm"
                      aria-label={`${todo.task_name}のサブタスクを${isExpanded ? '折りたたむ' : '展開する'}`}
                      aria-expanded={isExpanded}
                      className="flex items-center gap-2 text-base text-zinc-400 hover:text-zinc-300 h-auto p-0"
                    >
                      <span aria-hidden="true">{isExpanded ? '▼' : '▶'}</span>
                      <span>サブタスク ({subtasks.length}件)</span>
                    </Button>
                    {isExpanded && !isCompleted && (
                      <Button
                        onClick={() => {
                          setEditingSubtask({ todoId: todo.id, subtask: null });
                          setSubtaskFormData({ subtask_name: '' });
                        }}
                        variant="ghost"
                        size="sm"
                        aria-label={`${todo.task_name}にサブタスクを追加する`}
                        className="text-base text-cyan-400 hover:text-cyan-300 h-auto p-0"
                      >
                        + 追加
                      </Button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="space-y-2 ml-4">
                      {subtasks.length === 0 && !isEditing && (
                        <p className="text-base text-zinc-500">サブタスクがありません</p>
                      )}
                      {subtasks.map((subtask) => (
                        <div
                          key={subtask.id}
                          className={`flex items-center gap-2 p-2 bg-zinc-800 rounded ${isCompleted ? 'opacity-75' : 'hover:bg-zinc-750'}`}
                        >
                          <input
                            type="checkbox"
                            id={`subtask-${subtask.id}`}
                            checked={subtask.is_completed}
                            onChange={() => !isCompleted && handleToggleSubtaskCompletion(subtask)}
                            disabled={isCompleted}
                            aria-label={`${subtask.subtask_name}を${subtask.is_completed ? '未完了' : '完了'}にする`}
                            className="w-4 h-4 text-cyan-600 bg-zinc-700 border-zinc-600 rounded focus:ring-cyan-500"
                          />
                          {!isCompleted && editingSubtask?.todoId === todo.id && editingSubtask?.subtask?.id === subtask.id ? (
                            <div className="flex-1 flex items-center gap-2">
                              <Input
                                type="text"
                                value={subtaskFormData.subtask_name}
                                onChange={(e) => setSubtaskFormData({ subtask_name: e.target.value })}
                                className="flex-1 px-2 py-1 bg-zinc-900 border-zinc-700 text-base text-zinc-100 focus:ring-cyan-500"
                                placeholder="サブタスク名"
                                autoFocus
                              />
                              <Button
                                onClick={() => handleEditSubtask(subtask)}
                                size="sm"
                                aria-label="サブタスクの編集を保存する"
                                className="px-2 py-1 text-base bg-cyan-600 hover:bg-cyan-700 text-white h-auto"
                              >
                                保存
                              </Button>
                              <Button
                                onClick={() => {
                                  setEditingSubtask(null);
                                  setSubtaskFormData({ subtask_name: '' });
                                }}
                                variant="outline"
                                size="sm"
                                aria-label="サブタスクの編集をキャンセルする"
                                className="px-2 py-1 text-base bg-zinc-700 hover:bg-zinc-600 text-zinc-300 border-zinc-600 h-auto"
                              >
                                キャンセル
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="flex-1 text-base flex items-center gap-2 flex-wrap">
                                <span
                                  className={
                                    subtask.is_completed ? 'text-zinc-200 line-through' : 'text-zinc-300'
                                  }
                                >
                                  {subtask.subtask_name}
                                </span>
                                {subtask.is_completed && (subtask.completed_at ?? subtask.updated_at) && (
                                  <span className="text-zinc-300 text-sm font-normal no-underline">
                                    （{formatDate(subtask.completed_at ?? subtask.updated_at)}）
                                  </span>
                                )}
                              </span>
                              {!isCompleted && (
                                <div className="flex items-center gap-0 shrink-0 ml-auto pl-4">
                                  <Button
                                    onClick={() => {
                                      setEditingSubtask({ todoId: todo.id, subtask });
                                      setSubtaskFormData({ subtask_name: subtask.subtask_name });
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`${subtask.subtask_name}を編集する`}
                                    className="text-xs text-cyan-400 hover:text-cyan-300 group h-auto px-2 py-0.5 flex items-center min-h-0"
                                  >
                                    <span className="group-hover:underline">編集</span>
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteSubtask(subtask)}
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`${subtask.subtask_name}を削除する`}
                                    className="text-xs text-red-400 hover:text-red-300 group h-auto px-2 py-0.5 flex items-center min-h-0 -ml-2"
                                  >
                                    <span className="group-hover:underline">削除</span>
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                      {!isCompleted && isEditing && editingSubtask?.subtask === null && (
                        <div className="flex items-center gap-2 p-2 bg-zinc-800 rounded">
                          <Input
                            type="text"
                            value={subtaskFormData.subtask_name}
                            onChange={(e) => setSubtaskFormData({ subtask_name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddSubtask(todo.id);
                              } else if (e.key === 'Escape') {
                                setEditingSubtask(null);
                                setSubtaskFormData({ subtask_name: '' });
                              }
                            }}
                            className="flex-1 px-2 py-1 bg-zinc-900 border-zinc-700 text-base text-zinc-100 focus:ring-cyan-500"
                            placeholder="サブタスク名を入力"
                            autoFocus
                          />
                          <Button
                            onClick={() => handleAddSubtask(todo.id)}
                            size="sm"
                            aria-label="サブタスクを追加する"
                            className="px-2 py-1 text-base bg-cyan-600 hover:bg-cyan-700 text-white h-auto"
                          >
                            追加
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingSubtask(null);
                              setSubtaskFormData({ subtask_name: '' });
                            }}
                            variant="outline"
                            size="sm"
                            aria-label="サブタスクの追加をキャンセルする"
                            className="px-2 py-1 text-base bg-zinc-700 hover:bg-zinc-600 text-zinc-300 border-zinc-600 h-auto"
                          >
                            キャンセル
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );
  };

  // ドロップ可能なカラムコンポーネント
  const DroppableColumn = ({ id, todos, status, renderTodoCard }: { 
    id: string; 
    todos: Todo[]; 
    status: 'active' | 'in_progress';
    renderTodoCard: (todo: Todo, isCompleted: boolean) => JSX.Element;
  }) => {
    const { setNodeRef } = useDroppable({ id });
    const columnLabel = status === 'active' ? 'アクティブ' : '進行中';
    
    return (
      <div>
        <div className="bg-zinc-800 rounded-lg p-3 mb-3">
          <h3 className="font-medium text-zinc-300 text-base flex items-center justify-between">
            <span>{columnLabel}</span>
            <span className="text-base text-zinc-500" aria-label={`${todos.length}件のタスク`}>
              ({todos.length})
            </span>
          </h3>
        </div>
        <div ref={setNodeRef} className="space-y-3 min-h-[200px]">
          {todos.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-base">
              {columnLabel}なタスクはありません
            </div>
          ) : (
            todos.map((todo) => renderTodoCard(todo, false))
          )}
        </div>
      </div>
    );
  };

  // ToDoカードを表示する共通関数（ドラッグ&ドロップ対応）
  const renderTodoCard = (todo: Todo, isCompleted: boolean = false) => {
    const overdue = isOverdue(todo.due_date, todo.status);
    return <DraggableTodoCard key={todo.id} todo={todo} isCompleted={isCompleted} isOverdue={overdue} />;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ヘッダーとアクション */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h2 className="text-lg sm:text-xl font-semibold text-cyan-400 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>全ToDoリスト一覧</span>
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            onClick={handleOpenCreateModal}
            aria-label="新しいToDoタスクを作成する"
            className="bg-cyan-600 hover:bg-cyan-700 text-white w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            size="sm"
          >
            + 新規タスク
          </Button>
          <div className="relative w-full sm:w-auto">
            <label htmlFor="todo-search" className="sr-only">
              ToDoタスクを検索する
            </label>
            <Input
              id="todo-search"
              type="text"
              placeholder="🔍 検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="ToDoタスクを検索する"
              className="pl-10 pr-4 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:ring-cyan-500 text-base w-full sm:w-auto"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true">🔍</span>
          </div>
        </div>
      </div>

      {/* フィルターUI */}
      <FormCard className="p-3 sm:p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-medium text-zinc-300">フィルター</h3>
            {(filterTagIds.length > 0 || filterDifficulties.length > 0 || monthFilter !== 'all') && (
              <span className="text-xs text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded">
                フィルター適用中: アクティブ {activeTodos.length}件 / 完了 {completedTodos.length}件
              </span>
            )}
          </div>

          {/* 月ごとのフィルター */}
          <div>
            <FormLabel>表示期間</FormLabel>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="mt-2 w-full pl-4 pr-10 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent custom-select-arrow"
            >
              <option value="all">すべてのToDo</option>
              {getMonthOptions().map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {getMonthLabel(monthKey)}のToDo
                </option>
              ))}
            </select>
          </div>
          
          {/* タグ・難易度フィルター（並列表示） */}
          <div className="flex flex-row gap-4">
            {/* タグフィルター */}
            <div className="flex-1 min-w-0">
              <FormLabel>タグ</FormLabel>
              {isLoadingTags ? (
                <div className="mt-2 text-sm text-zinc-400">読み込み中...</div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterTagIds([])}
                    className={`px-3 py-1 text-sm rounded ${
                      filterTagIds.length === 0
                        ? 'bg-cyan-600 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    すべて
                  </button>
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        if (filterTagIds.includes(tag.id)) {
                          setFilterTagIds(filterTagIds.filter((id) => id !== tag.id));
                        } else {
                          setFilterTagIds([...filterTagIds, tag.id]);
                        }
                      }}
                      className={`px-3 py-1 text-sm rounded flex items-center gap-2 ${
                        filterTagIds.includes(tag.id)
                          ? 'bg-cyan-600 text-white'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: tag.tag_color }}
                      />
                      {tag.tag_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 難易度フィルター */}
            <div className="flex-1 min-w-0">
              <FormLabel>難易度</FormLabel>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterDifficulties([])}
                  className={`px-3 py-1 text-sm rounded ${
                    filterDifficulties.length === 0
                      ? 'bg-cyan-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  すべて
                </button>
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((difficulty) => (
                  <button
                    key={difficulty}
                    onClick={() => {
                      if (filterDifficulties.includes(difficulty)) {
                        setFilterDifficulties(filterDifficulties.filter((d) => d !== difficulty));
                      } else {
                        setFilterDifficulties([...filterDifficulties, difficulty]);
                      }
                    }}
                    className={`px-3 py-1 text-sm rounded ${
                      filterDifficulties.includes(difficulty)
                        ? `${DIFFICULTY_COLORS[difficulty]} text-white`
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {DIFFICULTY_LABELS[difficulty]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* フィルターリセットボタン */}
          {(filterTagIds.length > 0 || filterDifficulties.length > 0 || monthFilter !== 'all') && (
            <div>
              <Button
                onClick={() => {
                  setFilterTagIds([]);
                  setFilterDifficulties([]);
                  setMonthFilter('all');
                }}
                variant="outline"
                size="sm"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
              >
                フィルターをクリア
              </Button>
            </div>
          )}
        </div>
      </FormCard>

      {/* 3列カラムレイアウト（ドラッグ&ドロップ対応） */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* アクティブカラム */}
          <DroppableColumn id="active" todos={activeTodos} status="active" renderTodoCard={renderTodoCard} />
          
          {/* 進行中カラム */}
          <DroppableColumn id="in_progress" todos={inProgressTodos} status="in_progress" renderTodoCard={renderTodoCard} />

          {/* 完了済みカラム */}
          <div>
            <div className="bg-zinc-800 rounded-lg p-3 mb-3">
              <h3 className="font-medium text-zinc-300 text-base flex items-center justify-between">
                <span>完了済み</span>
                <span className="text-base text-zinc-500" aria-label={`${completedTodos.length}件のタスク`}>
                  ({completedTodos.length})
                </span>
              </h3>
            </div>
            <div className="space-y-3 min-h-[200px]">
              {completedTodos.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-base">
                  完了済みのタスクはありません
                </div>
              ) : (
                completedTodos.map((todo) => renderTodoCard(todo, true))
              )}
            </div>
          </div>
        </div>
        
        {/* ドラッグ中のオーバーレイ */}
        <DragOverlay>
          {activeId && (() => {
            const todo = todos.find((t) => t.id === activeId);
            if (!todo) return null;
            return (
              <div className="bg-zinc-900 border border-cyan-600 rounded-lg p-3 sm:p-4 opacity-90 rotate-3 shadow-lg">
                <div className="text-zinc-100 font-medium">{todo.task_name}</div>
              </div>
            );
          })()}
        </DragOverlay>
      </DndContext>

      {/* モーダル（追加・編集） */}
      <Modal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingTodo ? 'ToDoを編集' : '+ 新規ToDoを作成'}
        description={editingTodo ? 'ToDoの内容を編集します' : '新しいToDoタスクを作成します'}
        footer={
          <>
            <Button
              onClick={handleSaveTodo}
              disabled={isSubmitting}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {isSubmitting ? '保存中...' : editingTodo ? '更新' : '作成'}
            </Button>
            <Button
              onClick={handleCloseModal}
              disabled={isSubmitting}
              variant="outline"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            >
              キャンセル
            </Button>
          </>
        }
      >
            {/* タスク名 */}
            <FormInput
              id="task_name"
              label="タスク名"
              required
              type="text"
              value={formData.task_name}
              onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
              placeholder="例: 沖縄旅行の準備"
            />

            {/* 報酬（ゴルド・EXP）。難易度で倍率がかかります */}
            <FormCard variant="nested" className="p-4 space-y-3">
              <h4 className="text-base font-medium text-zinc-300 mb-3">報酬</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInputSmall
                  id="sp_points"
                  label="ゴルド"
                  type="number"
                  min="0"
                  value={formData.sp_points}
                  onChange={(e) => setFormData({ ...formData, sp_points: parseInt(e.target.value) || 0 })}
                />
                <FormInputSmall
                  id="sp_exp_body"
                  label="身体EXP"
                  type="number"
                  min="0"
                  value={formData.sp_exp_body}
                  onChange={(e) => setFormData({ ...formData, sp_exp_body: parseInt(e.target.value) || 0 })}
                />
                <FormInputSmall
                  id="sp_exp_mind"
                  label="頭脳EXP"
                  type="number"
                  min="0"
                  value={formData.sp_exp_mind}
                  onChange={(e) => setFormData({ ...formData, sp_exp_mind: parseInt(e.target.value) || 0 })}
                />
                <FormInputSmall
                  id="sp_exp_spirit"
                  label="精神EXP"
                  type="number"
                  min="0"
                  value={formData.sp_exp_spirit}
                  onChange={(e) => setFormData({ ...formData, sp_exp_spirit: parseInt(e.target.value) || 0 })}
                />
              </div>
            </FormCard>

            {/* ステータス */}
            <div>
              <FormLabel htmlFor="status">ステータス</FormLabel>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'in_progress' | 'completed' })}
                className="mt-2 w-full pl-4 pr-10 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent custom-select-arrow"
              >
                  <option value="active">アクティブ</option>
                  <option value="in_progress">進行中</option>
                  <option value="completed">完了済み</option>
                </select>
              </div>

            {/* 期限 */}
            <FormInput
              id="due_date"
              label="期限（任意）"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />

            {/* 難易度 */}
            <div>
              <FormLabel htmlFor="difficulty">難易度</FormLabel>
              <select
                id="difficulty"
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                className="mt-2 w-full pl-4 pr-10 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent custom-select-arrow"
              >
                <option value="easy">やさしい</option>
                <option value="medium">ふつう</option>
                <option value="hard">むずかしい</option>
              </select>
            </div>

            {/* タグ選択 */}
            <div>
              <FormLabel htmlFor="tags">タグ</FormLabel>
              {isLoadingTags ? (
                <div className="mt-2 text-sm text-zinc-400">読み込み中...</div>
              ) : (
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {tags.length === 0 ? (
                    <div className="text-sm text-zinc-400">タグがありません</div>
                  ) : (
                    tags.map((tag) => (
                      <div key={tag.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`todo-tag-${tag.id}`}
                          checked={selectedTagIds.includes(tag.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTagIds([...selectedTagIds, tag.id]);
                            } else {
                              setSelectedTagIds(selectedTagIds.filter((id) => id !== tag.id));
                            }
                          }}
                          className="w-4 h-4 text-cyan-600 bg-zinc-800 border-zinc-700 rounded focus:ring-cyan-500"
                        />
                        <label
                          htmlFor={`todo-tag-${tag.id}`}
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <span
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: tag.tag_color }}
                          />
                          <span className="text-base text-zinc-300">{tag.tag_name}</span>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
      </Modal>

      {/* タグ管理モーダル */}
      <Modal
        open={isTagManagementModalOpen}
        onOpenChange={setIsTagManagementModalOpen}
        title={editingTag ? 'タグを編集' : '+ 新規タグを作成'}
        description={editingTag ? 'タグの内容を編集します' : '新しいタグを作成して、習慣やToDoを分類しましょう'}
        footer={
          <>
            <Button
              onClick={async () => {
                if (!tagFormData.tag_name.trim()) {
                  toast.error('タグ名を入力してください');
                  return;
                }

                try {
                  const url = editingTag ? `/api/tags/${editingTag.id}` : '/api/tags';
                  const method = editingTag ? 'PUT' : 'POST';
                  
                  const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      tag_name: tagFormData.tag_name.trim(),
                      tag_color: tagFormData.tag_color,
                    }),
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'タグの保存に失敗しました');
                  }

                  toast.success(editingTag ? 'タグを更新しました' : 'タグを作成しました');
                  setIsTagManagementModalOpen(false);
                  setEditingTag(null);
                  setTagFormData({ tag_name: '', tag_color: '#3b82f6' });
                  await fetchTags(); // タグ一覧を再取得
                } catch (err) {
                  console.error('タグ保存エラー:', err);
                  toast.error(err instanceof Error ? err.message : 'タグの保存に失敗しました');
                }
              }}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {editingTag ? '更新' : '作成'}
            </Button>
            <Button
              onClick={() => {
                setIsTagManagementModalOpen(false);
                setEditingTag(null);
                setTagFormData({ tag_name: '', tag_color: '#3b82f6' });
              }}
              variant="outline"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            >
              キャンセル
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* タグ名 */}
          <FormInput
            id="tag_name"
            label="タグ名"
            required
            type="text"
            value={tagFormData.tag_name}
            onChange={(e) => setTagFormData({ ...tagFormData, tag_name: e.target.value })}
            placeholder="例: 運動、学習、仕事"
          />

          {/* タグの色 */}
          <div>
            <FormLabel htmlFor="tag_color">タグの色</FormLabel>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="color"
                id="tag_color"
                value={tagFormData.tag_color}
                onChange={(e) => setTagFormData({ ...tagFormData, tag_color: e.target.value })}
                className="w-16 h-10 rounded border border-zinc-700 cursor-pointer"
              />
              <input
                type="text"
                value={tagFormData.tag_color}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                    setTagFormData({ ...tagFormData, tag_color: value });
                  }
                }}
                placeholder="#3b82f6"
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* 既存タグ一覧 */}
          <div>
            <FormLabel>既存のタグ</FormLabel>
            {isLoadingTags ? (
              <div className="mt-2 text-sm text-zinc-400">読み込み中...</div>
            ) : tags.length === 0 ? (
              <div className="mt-2 text-sm text-zinc-400">タグがありません</div>
            ) : (
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 bg-zinc-800 border border-zinc-700 rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: tag.tag_color }}
                      />
                      <span className="text-base text-zinc-300">{tag.tag_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => {
                          setEditingTag(tag);
                          setTagFormData({
                            tag_name: tag.tag_name,
                            tag_color: tag.tag_color,
                          });
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-cyan-400 hover:text-cyan-300 h-8 px-2"
                      >
                        編集
                      </Button>
                      <Button
                        onClick={async () => {
                          if (!window.confirm(`「${tag.tag_name}」を削除してもよろしいですか？`)) {
                            return;
                          }

                          try {
                            const response = await fetch(`/api/tags/${tag.id}`, {
                              method: 'DELETE',
                            });

                            if (!response.ok) {
                              const error = await response.json();
                              throw new Error(error.error || 'タグの削除に失敗しました');
                            }

                            toast.success('タグを削除しました');
                            await fetchTags(); // タグ一覧を再取得
                            
                            // 選択中のタグが削除された場合は選択から除外
                            if (selectedTagIds.includes(tag.id)) {
                              setSelectedTagIds(selectedTagIds.filter((id) => id !== tag.id));
                            }
                            if (filterTagIds.includes(tag.id)) {
                              setFilterTagIds(filterTagIds.filter((id) => id !== tag.id));
                            }
                          } catch (err) {
                            console.error('タグ削除エラー:', err);
                            toast.error(err instanceof Error ? err.message : 'タグの削除に失敗しました');
                          }
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 h-8 px-2"
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

