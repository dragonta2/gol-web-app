'use client';

import { useState, useEffect, memo } from 'react';
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
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { KanbanBoardProps, Todo, Difficulty, Tag } from '@/lib/types';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, DIFFICULTY_MULTIPLIERS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FormLabel } from '@/components/ui/form-input';
import { FormCard } from '@/components/ui/form-card';
import { ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';

// ドラッグ可能なカードコンポーネント
function DraggableTodoCard({ todo, isOverdue, icon, totalExp, formatDeadline }: {
  todo: Todo;
  isOverdue: boolean;
  icon: string;
  totalExp: number;
  formatDeadline: (dueDate: string | null) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      aria-label={`${todo.task_name}をドラッグして移動する`}
      aria-describedby={isOverdue ? `overdue-${todo.id}` : undefined}
      className={`bg-zinc-900 border ${
        isOverdue ? 'border-red-700' : 'border-zinc-700'
      } rounded-lg p-3 hover:border-cyan-600 transition-colors cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-950 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-medium text-zinc-100 flex-1">
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
            <div className="flex flex-wrap gap-1 mt-1">
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
        </div>
      </div>
      <div className="space-y-1 text-base text-zinc-400">
        {todo.is_special && <div>SP {todo.sp_points}pt</div>}
        {totalExp > 0 && <div>{totalExp}ex</div>}
        {todo.due_date && (
          <div className={isOverdue ? 'text-red-400' : ''} id={isOverdue ? `overdue-${todo.id}` : undefined}>
            期限: {formatDeadline(todo.due_date)}
            {isOverdue && <span aria-label="期限超過"> (期限超過)</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// 完了済みカードコンポーネント（ドラッグ不可）
function CompletedTodoCard({ todo, icon, totalExp, formatCompletedDate }: {
  todo: Todo;
  icon: string;
  totalExp: number;
  formatCompletedDate: (completedAt: string | null) => string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 hover:border-cyan-600 transition-colors opacity-75">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-medium text-zinc-100 flex-1 line-through">
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
            <div className="flex flex-wrap gap-1 mt-1">
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
        </div>
      </div>
      <div className="space-y-1 text-base text-zinc-400">
        {todo.is_special && <div>SP {todo.sp_points}pt</div>}
        {totalExp > 0 && <div>{totalExp}ex</div>}
        {todo.completed_at && (
          <div>完了: {formatCompletedDate(todo.completed_at)}</div>
        )}
      </div>
    </div>
  );
}

// ドロップ可能なカラムコンポーネント
function DroppableColumn({
  id,
  title,
  todos,
  isOverdue,
  getIcon,
  getTotalExp,
  formatDeadline,
  formatCompletedDate,
}: {
  id: string;
  title: string;
  todos: Todo[];
  isOverdue: (dueDate: string | null, status: string) => boolean;
  getIcon: (isSpecial: boolean, status: string) => string;
  getTotalExp: (todo: Todo) => number;
  formatDeadline: (dueDate: string | null) => string;
  formatCompletedDate: (completedAt: string | null) => string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div>
      <div className="bg-zinc-800 rounded-lg p-3 mb-3">
        <h3 className="font-medium text-zinc-300 text-base flex items-center justify-between">
          <span>{title}</span>
          <span className="text-base text-zinc-500" aria-label={`${todos.length}件のタスク`}>
            ({todos.length})
          </span>
        </h3>
      </div>
      <div
        ref={setNodeRef}
        role="region"
        aria-label={`${title}カラム`}
        className={`space-y-3 min-h-[200px] rounded-lg p-2 transition-colors ${
          isOver ? 'bg-cyan-900/20 border-2 border-cyan-600 border-dashed' : ''
        }`}
      >
        {todos.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-base">
            {title === 'アクティブ' && 'アクティブなタスクはありません'}
            {title === '進行中' && '進行中のタスクはありません'}
            {title === '完了済み' && '完了済みのタスクはありません'}
          </div>
        ) : (
          todos.map((todo) => {
            const overdue = isOverdue(todo.due_date, todo.status);
            const icon = getIcon(todo.is_special, todo.status);
            const totalExp = getTotalExp(todo);

            if (todo.status === 'completed') {
              return (
                <CompletedTodoCard
                  key={todo.id}
                  todo={todo}
                  icon={icon}
                  totalExp={totalExp}
                  formatCompletedDate={formatCompletedDate}
                />
              );
            }

            return (
              <DraggableTodoCard
                key={todo.id}
                todo={todo}
                isOverdue={overdue}
                icon={icon}
                totalExp={totalExp}
                formatDeadline={formatDeadline}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function KanbanBoard({ todos: initialTodos, dailyLogId, isExpanded: externalIsExpanded, onExpandedChange }: KanbanBoardProps) {

  // ローカル状態でtodosを管理（ドラッグ&ドロップで即座に反映）
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [internalIsExpanded, setInternalIsExpanded] = useState(true); // アコーディオンの開閉状態（内部管理）
  // フィルター状態（ローカルストレージから復元）
  const [tags, setTags] = useState<Tag[]>([]);
  const [filterTagIds, setFilterTagIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('todo-kanban-filter-tag-ids');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [filterDifficulties, setFilterDifficulties] = useState<Difficulty[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('todo-kanban-filter-difficulties');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  // フィルター状態をローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('todo-kanban-filter-tag-ids', JSON.stringify(filterTagIds));
  }, [filterTagIds]);

  useEffect(() => {
    localStorage.setItem('todo-kanban-filter-difficulties', JSON.stringify(filterDifficulties));
  }, [filterDifficulties]);

  const isExpanded = externalIsExpanded ?? internalIsExpanded;
  const setIsExpanded = (value: boolean) => {
    if (onExpandedChange) {
      onExpandedChange(value);
    } else {
      setInternalIsExpanded(value);
    }
  };

  // externalIsExpandedが変更された場合、内部状態を同期
  useEffect(() => {
    if (externalIsExpanded !== undefined) {
      setInternalIsExpanded(externalIsExpanded);
    }
  }, [externalIsExpanded]);

  // initialTodosが変更されたらローカル状態も更新
  useEffect(() => {
    setTodos(initialTodos);
  }, [initialTodos]);

  // タグ一覧を取得
  useEffect(() => {
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
      } finally {
        setIsLoadingTags(false);
      }
    };

    fetchTags();
  }, []);

  // フィルター適用関数
  const applyFilters = (todoList: Todo[]) => {
    return todoList.filter((todo) => {
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

  // ポインターセンサーを設定（マウスとタッチに対応）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px以上移動したらドラッグ開始（誤操作防止）
      },
    })
  );

  // 今日の日付を取得（YYYY-MM-DD形式）
  const today = new Date().toISOString().split('T')[0];
  
  // 今月の開始日と終了日を取得（完了済みフィルター用）
  const getCurrentMonthRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  };

  // ステータス別にtodosを分類（フィルター適用後）
  const activeTodos = applyFilters(todos.filter((todo) => todo.status === 'active'));
  const inProgressTodos = applyFilters(todos.filter((todo) => todo.status === 'in_progress'));
  
  // 完了済みタスク（今月のものだけ表示）
  const completedTodos = applyFilters(
    todos.filter((todo) => {
      if (todo.status !== 'completed') return false;
      if (!todo.completed_at) return false;
      
      const { startDate, endDate } = getCurrentMonthRange();
      const completedDate = new Date(todo.completed_at);
      
      return completedDate >= startDate && completedDate <= endDate;
    })
  );

  // 期限超過判定関数
  const isOverdue = (dueDate: string | null, status: string): boolean => {
    if (!dueDate || status === 'completed') return false;
    const due = new Date(dueDate);
    const todayDate = new Date(today);
    return due < todayDate;
  };

  // アイコン取得関数
  const getIcon = (isSpecial: boolean, status: string): string => {
    if (status === 'completed') return '✅';
    if (isSpecial) return '⚠️';
    return '📄';
  };

  // 期限表示用フォーマット関数（MMDD形式）
  const formatDeadline = (dueDate: string | null): string => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}${day}`;
  };

  // 完了日表示用フォーマット関数（MMDD形式）
  const formatCompletedDate = (completedAt: string | null): string => {
    if (!completedAt) return '';
    const date = new Date(completedAt);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}${day}`;
  };

  // EXP合計計算関数
  const getTotalExp = (todo: Todo): number => {
    return todo.sp_exp_body + todo.sp_exp_mind + todo.sp_exp_spirit;
  };

  // ドラッグ開始時の処理
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // 報酬計算関数（難易度倍率を適用）
  const calculateReward = (todo: Todo) => {
    if (!todo.is_special) {
      return {
        points: 0,
        exp_body: 0,
        exp_mind: 0,
        exp_spirit: 0,
      };
    }
    
    // 難易度倍率を取得（デフォルトはmedium = 1.0）
    const multiplier = DIFFICULTY_MULTIPLIERS[todo.difficulty || 'medium'];
    
    // 難易度倍率を適用して報酬を計算（小数点以下は四捨五入）
    return {
      points: Math.round(todo.sp_points * multiplier),
      exp_body: Math.round(todo.sp_exp_body * multiplier),
      exp_mind: Math.round(todo.sp_exp_mind * multiplier),
      exp_spirit: Math.round(todo.sp_exp_spirit * multiplier),
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

  // ドラッグ終了時の処理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const todoId = active.id as string;
    const newStatus = over.id as string;

    // 同じカラムにドロップした場合は何もしない
    const currentTodo = todos.find((t) => t.id === todoId);
    if (!currentTodo || currentTodo.status === newStatus) return;

    // ステータスマッピング（カラムID → ステータス）
    const statusMap: Record<string, 'active' | 'in_progress' | 'completed'> = {
      'column-active': 'active',
      'column-in-progress': 'in_progress',
      'column-completed': 'completed',
    };

    const mappedStatus = statusMap[newStatus];
    if (!mappedStatus) return;

    const wasCompleted = currentTodo.status === 'completed';
    const willBeCompleted = mappedStatus === 'completed';

    // ローカル状態を即座に更新（楽観的更新）
    const updatedTodos = todos.map((todo) => {
      if (todo.id === todoId) {
        return {
          ...todo,
          status: mappedStatus,
          completed_at: mappedStatus === 'completed' ? new Date().toISOString() : null,
        };
      }
      return todo;
    });
    setTodos(updatedTodos);

    // データベースを更新
    setIsUpdating(true);
    try {
      const supabase = createClient();
      const updateData: Partial<Todo> = {
        status: mappedStatus,
      };

      // 完了済みに変更する場合はcompleted_atを設定
      if (mappedStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else {
        // 完了済み以外に戻す場合はcompleted_atをnullに
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from('todos')
        .update(updateData)
        .eq('id', todoId);

      if (error) {
        console.error('todos更新エラー:', error);
        // エラー時は元の状態に戻す
        setTodos(initialTodos);
        toast.error('ステータスの更新に失敗しました', {
          description: error.message || 'ページをリロードしてください',
        });
        return;
      }

      // 報酬計算・反映処理
      if (!wasCompleted && willBeCompleted) {
        // 未完了 → 完了: 報酬を付与
        await handleTaskCompletion(currentTodo);
      } else if (wasCompleted && !willBeCompleted) {
        // 完了 → 未完了: 報酬を削除
        await handleTaskUncompletion(currentTodo);
      }

      // ページをリフレッシュして最新データを取得
      window.location.reload();
    } catch (err) {
      console.error('予期しないエラー:', err);
      setTodos(initialTodos);
      toast.error('ステータスの更新に失敗しました', {
        description: err instanceof Error ? err.message : 'ページをリロードしてください',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // ドラッグ中のカードを取得
  const activeTodo = activeId ? todos.find((todo) => todo.id === activeId) : null;

  // データが空の場合の表示
  if (todos.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          <span>ToDoリスト</span>
        </h2>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 text-center">
          <p className="text-zinc-400 mb-2">ToDoタスクがまだ登録されていません</p>
          <p className="text-base text-zinc-500 mb-4">
            タスクを追加する機能は今後実装予定です
          </p>
          <a
            href="/test-todos"
            className="inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-base"
          >
            🧪 テストデータを挿入
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left mb-4 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
        aria-expanded={isExpanded}
        aria-controls="kanban-board-content"
      >
        <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          <span>ToDoリスト</span>
          {isUpdating && (
            <span className="text-base text-zinc-500 ml-2">(更新中...)</span>
          )}
        </h2>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-zinc-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-zinc-400 flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div id="kanban-board-content">
          {/* フィルターUI */}
          <FormCard className="p-3 sm:p-4 mb-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-medium text-zinc-300">フィルター</h3>
                {(filterTagIds.length > 0 || filterDifficulties.length > 0) && (
                  <span className="text-xs text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded">
                    フィルター適用中: アクティブ {activeTodos.length}件 / 進行中 {inProgressTodos.length}件 / 完了 {completedTodos.length}件
                  </span>
                )}
              </div>
              
              {/* タグフィルター */}
              <div>
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
              {(filterTagIds.length > 0 || filterDifficulties.length > 0) && (
                <div>
                  <Button
                    onClick={() => {
                      setFilterTagIds([]);
                      setFilterDifficulties([]);
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

          <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* 3カラムレイアウト（モバイルでは1カラム） */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* アクティブカラム */}
          <DroppableColumn
            id="column-active"
            title="アクティブ"
            todos={activeTodos}
            isOverdue={isOverdue}
            getIcon={getIcon}
            getTotalExp={getTotalExp}
            formatDeadline={formatDeadline}
            formatCompletedDate={formatCompletedDate}
          />

          {/* 進行中カラム */}
          <DroppableColumn
            id="column-in-progress"
            title="進行中"
            todos={inProgressTodos}
            isOverdue={isOverdue}
            getIcon={getIcon}
            getTotalExp={getTotalExp}
            formatDeadline={formatDeadline}
            formatCompletedDate={formatCompletedDate}
          />

          {/* 完了済みカラム */}
          <DroppableColumn
            id="column-completed"
            title="完了済み"
            todos={completedTodos}
            isOverdue={isOverdue}
            getIcon={getIcon}
            getTotalExp={getTotalExp}
            formatDeadline={formatDeadline}
            formatCompletedDate={formatCompletedDate}
          />
        </div>

        {/* ドラッグ中のオーバーレイ */}
        <DragOverlay>
          {activeTodo ? (
            <div className="bg-zinc-900 border border-cyan-600 rounded-lg p-3 shadow-lg opacity-90 rotate-2">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-lg">{getIcon(activeTodo.is_special, activeTodo.status)}</span>
                <span className="text-base font-medium text-zinc-100 flex-1">
                  {activeTodo.task_name}
                </span>
              </div>
              <div className="space-y-1 text-base text-zinc-400">
                {activeTodo.is_special && <div>SP {activeTodo.sp_points}pt</div>}
                {getTotalExp(activeTodo) > 0 && <div>{getTotalExp(activeTodo)}ex</div>}
              </div>
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>
        </div>
      )}
    </div>
  );
}

// React.memoでメモ化（propsが変わったときだけ再レンダリング）
export default memo(KanbanBoard);
