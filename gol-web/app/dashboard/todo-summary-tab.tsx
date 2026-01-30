'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Todo, TodoLog, TodoSubtask, Difficulty } from '@/lib/types';
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  DIFFICULTY_MULTIPLIERS,
  PRESET_GOLD_BY_DIFFICULTY,
  PRESET_EXP_BY_DIFFICULTY,
  type ExpAttribute,
  EXP_ATTRIBUTE_LABELS,
  distributePresetExp,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { FormInput, FormLabel } from '@/components/ui/form-input';
import { DatePickerField } from '@/components/date-picker-field';
import { FormCard } from '@/components/ui/form-card';
import { toast } from 'sonner';
import { ClipboardList, Edit, Search } from 'lucide-react';
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
  // フィルター状態（初回はサーバーとクライアントで同じにし、マウント後に localStorage から復元して Hydration エラーを防ぐ）
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
    localStorage.setItem('todo-summary-filter-difficulties', JSON.stringify(filterDifficulties));
  }, [filterDifficulties]);

  /** 属性選択（体・頭・心）。やさしいは1つのみ。編集時も変更可 */
  const [selectedAttributes, setSelectedAttributes] = useState<ExpAttribute[]>(['mind']);
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
    [todos, filterDifficulties, searchQuery]
  );
  const filteredInProgressTodos = useMemo(
    () => sortTodos(applyFilters(todos.filter((todo) => todo.status === 'in_progress'))),
    [todos, filterDifficulties, searchQuery]
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

  // 完了日時フォーマット（26/01/28-水 HH:mm 形式、括弧付きで表示用）
  const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];
  const formatCompletedDateTime = (dateString: string | null): string => {
    if (!dateString) return '─';
    const date = new Date(dateString);
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekday = WEEKDAY_JA[date.getDay()];
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `(${year}/${month}/${day}-${weekday} ${hour}:${minute})`;
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

  // モーダルを開く（新規作成）
  const handleOpenCreateModal = () => {
    setEditingTodo(null);
    setSelectedAttributes(['mind']);
    const gold = PRESET_GOLD_BY_DIFFICULTY['medium'];
    const dist = distributePresetExp(PRESET_EXP_BY_DIFFICULTY['medium'], ['mind']);
    setFormData({
      task_name: '',
      sp_points: gold,
      sp_exp_body: dist.body,
      sp_exp_mind: dist.mind,
      sp_exp_spirit: dist.spirit,
      due_date: '',
      status: 'active',
      difficulty: 'medium',
    });
    setIsModalOpen(true);
  };

  // 保存されている sp_exp_* から属性選択を復元（編集時）
  const inferAttributesFromTodo = (todo: Todo): ExpAttribute[] => {
    const attrs: ExpAttribute[] = [];
    if ((todo.sp_exp_body ?? 0) > 0) attrs.push('body');
    if ((todo.sp_exp_mind ?? 0) > 0) attrs.push('mind');
    if ((todo.sp_exp_spirit ?? 0) > 0) attrs.push('spirit');
    return attrs.length > 0 ? attrs : ['mind'];
  };

  // モーダルを開く（編集）
  const handleOpenEditModal = (todo: Todo) => {
    setEditingTodo(todo);
    const attrs = inferAttributesFromTodo(todo);
    setSelectedAttributes(attrs);
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
    setIsModalOpen(true);
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTodo(null);
  };

  // 日誌カンバンから「編集」で飛んできたとき、該当タスクの編集モーダルを開く
  useEffect(() => {
    if (!initialEditTodoId || !todos.length) return;
    const todo = todos.find((t) => t.id === initialEditTodoId);
    if (!todo) return;
    setEditingTodo(todo);
    setSelectedAttributes(inferAttributesFromTodo(todo));
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
    if (selectedAttributes.length === 0) {
      toast.error('属性を1つ以上選んでください');
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

  // ToDoを削除。成功時は true、キャンセルまたは失敗時は false を返す（モーダルから呼ぶときは成功時に閉じるため）
  const handleDeleteTodo = async (todo: Todo): Promise<boolean> => {
    if (!confirm(`「${todo.task_name}」を削除しますか？\nこの操作は取り消せません。`)) {
      return false;
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
        return false;
      }

      // ページをリフレッシュしてデータを再取得
      router.refresh();
      return true;
    } catch (err) {
      console.error('予期しないエラー:', err);
      toast.error('エラーが発生しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
      return false;
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
        className={`bg-zinc-900 border border-zinc-700 rounded-lg p-3 transition-colors overflow-visible ${
          isCompleted ? 'opacity-75' : canDrag ? 'hover:border-cyan-600 cursor-grab active:cursor-grabbing' : ''
        }`}
      >
            {/* 1. ToDoタイトル（左寄せ）｜難易度ラベル（右寄せ）・日誌カードと同じレイアウト */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className={`text-zinc-100 font-bold text-base flex-1 min-w-0 truncate ${isCompleted ? 'line-through decoration-[3px]' : ''}`}>
                {isCompleted && <span className="text-green-400 mr-1">✅</span>}
                {todo.task_name}
              </span>
              {todo.difficulty && (
                <span
                  className={`px-2 py-0.5 text-xs rounded shrink-0 ${DIFFICULTY_COLORS[todo.difficulty]} text-white`}
                  title={`難易度: ${DIFFICULTY_LABELS[todo.difficulty]}`}
                >
                  {DIFFICULTY_LABELS[todo.difficulty]}
                </span>
              )}
            </div>

            {/* 2＆3. 報酬・期限（日誌カードと同じ space-y-1 text-base の1ブロック） */}
            <div className="space-y-1 text-base text-white">
              {(reward.points > 0 || reward.exp_body > 0 || reward.exp_mind > 0 || reward.exp_spirit > 0) && (
                <div className="text-white">
                  <span className="text-white">報酬</span>
                  {' ｜ '}
                  {reward.points > 0 && <>{reward.points}Gold</>}
                  {(reward.exp_body > 0 || reward.exp_mind > 0 || reward.exp_spirit > 0) && (
                    <span className={reward.points > 0 ? ' ml-1' : ''}>
                      {reward.exp_body > 0 && <>身体+{reward.exp_body}</>}
                      {reward.exp_mind > 0 && <>{reward.exp_body > 0 ? ' ' : ''}頭脳+{reward.exp_mind}</>}
                      {reward.exp_spirit > 0 && <>{reward.exp_mind > 0 || reward.exp_body > 0 ? ' ' : ''}精神+{reward.exp_spirit}</>}
                    </span>
                  )}
                </div>
              )}
              <div className={!isCompleted && isOverdue ? 'text-red-400' : ''}>
                {!isCompleted && isOverdue && <span className="mr-1.5" aria-label="超過">⚠️</span>}
                期限: {todo.due_date ? formatDate(todo.due_date) : '─'}
                {isCompleted && todo.completed_at && (
                  <> ／ 完了: {formatCompletedDateTime(todo.completed_at)}</>
                )}
              </div>
            </div>

            {/* サブタスク表示 */}
            {(() => {
              const subtasks = getSubtasksForTodo(todo.id);
              const isExpanded = expandedTodos.has(todo.id);
              const isEditing = editingSubtask?.todoId === todo.id;

              return (
                <div className="mt-3 pt-3 border-t border-zinc-700 text-sm shrink-0" role="region" aria-label="サブタスク">
                  <div className="flex items-center justify-between mb-2 text-base">
                    <Button
                      onClick={() => toggleSubtaskExpansion(todo.id)}
                      variant="ghost"
                      size="sm"
                      aria-label={`${todo.task_name}のサブタスクを${isExpanded ? '折りたたむ' : '展開する'}`}
                      aria-expanded={isExpanded}
                      className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 h-auto p-0"
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
                        className="text-cyan-400 hover:text-cyan-300 h-auto p-0"
                      >
                        + 追加
                      </Button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="space-y-2 ml-4">
                      {subtasks.length === 0 && !isEditing && (
                        <p className="text-zinc-500">サブタスクがありません</p>
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
                                className="flex-1 px-2 py-1 bg-zinc-900 border-zinc-700 text-zinc-100 focus:ring-cyan-500"
                                placeholder="サブタスク名"
                                autoFocus
                              />
                              <Button
                                onClick={() => handleEditSubtask(subtask)}
                                size="sm"
                                aria-label="サブタスクの編集を保存する"
                                className="px-2 py-1 text-sm bg-cyan-600 hover:bg-cyan-700 text-white h-auto"
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
                                className="px-2 py-1 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 border-zinc-600 h-auto"
                              >
                                キャンセル
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="flex-1 flex items-center gap-2 flex-wrap min-w-0">
                                <span
                                  className={
                                    subtask.is_completed
                                      ? 'text-sm text-zinc-200 line-through decoration-[3px]'
                                      : 'text-sm text-zinc-300'
                                  }
                                >
                                  {subtask.subtask_name}
                                </span>
                                {subtask.is_completed && (subtask.completed_at ?? subtask.updated_at) && (
                                  <span className="text-zinc-300 text-sm font-normal no-underline shrink-0">
                                    {formatCompletedDateTime(subtask.completed_at ?? subtask.updated_at)}
                                  </span>
                                )}
                              </span>
                              {!isCompleted && (
                                <div className="flex items-center gap-0 shrink-0 ml-auto pl-4 text-xs">
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
                            className="flex-1 px-2 py-1 bg-zinc-900 border-zinc-700 text-zinc-100 focus:ring-cyan-500"
                            placeholder="サブタスク名を入力"
                            autoFocus
                          />
                          <Button
                            onClick={() => handleAddSubtask(todo.id)}
                            size="sm"
                            aria-label="サブタスクを追加する"
                            className="px-2 py-1 text-sm bg-cyan-600 hover:bg-cyan-700 text-white h-auto"
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
                            className="px-2 py-1 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 border-zinc-600 h-auto"
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

            {/* 編集ボタン（カードの一番右下） */}
            <div className="pt-3 mt-3 border-t border-zinc-700 flex items-center justify-end">
              <button
                type="button"
                onClick={() => handleOpenEditModal(todo)}
                className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
                aria-label={`${todo.task_name}を編集する`}
              >
                <Edit className="w-3 h-3" />
                編集
              </button>
            </div>
          </div>
        );
  };

  // ドロップ可能なカラムコンポーネント
  const DroppableColumn = ({ id, todos, status, renderTodoCard }: { 
    id: string; 
    todos: Todo[]; 
    status: 'active' | 'in_progress';
    renderTodoCard: (todo: Todo, isCompleted: boolean) => React.ReactElement;
  }) => {
    const { setNodeRef } = useDroppable({ id });
    const columnLabel = status === 'active' ? 'アクティブタスク' : '進行中';
    
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
          <div className="relative w-full sm:w-auto sm:min-w-[280px]">
            <label htmlFor="todo-search" className="sr-only">
              ToDoタスクを検索する
            </label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 shrink-0 pointer-events-none" aria-hidden />
            <Input
              id="todo-search"
              type="text"
              placeholder="検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="ToDoタスクを検索する"
              className="pl-10 pr-4 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:ring-cyan-500 text-base w-full sm:min-w-[280px]"
            />
          </div>
        </div>
      </div>

      {/* フィルターUI */}
      <FormCard className="p-3 sm:p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-medium text-zinc-300">フィルター</h3>
            {(filterDifficulties.length > 0 || monthFilter !== 'all') && (
              <span className="text-xs text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded">
                フィルター適用中: アクティブタスク {activeTodos.length}件 / 完了 {completedTodos.length}件
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

          {/* 難易度フィルター */}
          <div>
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

          {/* フィルターリセットボタン */}
          {(filterDifficulties.length > 0 || monthFilter !== 'all') && (
            <div>
              <Button
                onClick={() => {
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-visible">
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
            <div className="flex flex-1 items-center justify-between gap-2 flex-wrap">
              <div>
                {editingTodo && (
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!editingTodo) return;
                      const ok = await handleDeleteTodo(editingTodo);
                      if (ok) handleCloseModal();
                    }}
                    disabled={isSubmitting}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                  >
                    削除
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
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
              </div>
            </div>
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

            {/* 難易度（やさしい1G/1EXP・ふつう2G/2EXP・むずかしい3G/3EXP） */}
            <div>
              <FormLabel htmlFor="difficulty">難易度</FormLabel>
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
                className="mt-2 w-full pl-4 pr-10 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent custom-select-arrow"
              >
                <option value="easy">やさしい（1Gold・1EXP）</option>
                <option value="medium">ふつう（2Gold・2EXP）</option>
                <option value="hard">むずかしい（3Gold・3EXP）</option>
              </select>
            </div>

            {/* 属性（体・頭・心）。やさしい=1つのみ／ふつう=1or2／むずかしい=1or2or3。説明文は難易度で切り替え */}
            <FormCard variant="nested" className="p-4 space-y-3">
              <h4 className="text-base font-medium text-zinc-300 mb-3">属性（EXPの振り分け先）</h4>
              <p className="text-sm text-zinc-400 mb-2">
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
                        className="w-4 h-4 text-cyan-600 bg-zinc-700 border-zinc-600 rounded focus:ring-cyan-500"
                      />
                      <span className="text-zinc-300">{EXP_ATTRIBUTE_LABELS[attr]}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                報酬: {formData.sp_points}Gold / 身体+{formData.sp_exp_body} 頭脳+{formData.sp_exp_mind} 精神+{formData.sp_exp_spirit}
              </p>
            </FormCard>

            {/* ステータス（編集時のみ選択可。新規は常にアクティブ） */}
            {editingTodo && (
              <div>
                <FormLabel htmlFor="status">ステータス</FormLabel>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'in_progress' | 'completed' })}
                  className="mt-2 w-full pl-4 pr-10 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent custom-select-arrow"
                >
                  <option value="active">アクティブタスク</option>
                  <option value="in_progress">進行中</option>
                  <option value="completed">完了済み</option>
                </select>
              </div>
            )}

            {/* 期限（ヘッダーと同じダークカレンダーで選択） */}
            <DatePickerField
              id="due_date"
              label="期限（任意）"
              value={formData.due_date}
              onChange={(value) => setFormData({ ...formData, due_date: value })}
              optional
            />
      </Modal>
    </div>
  );
}

