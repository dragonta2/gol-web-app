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
import type { KanbanBoardProps, Todo, TodoSubtask, Difficulty } from '@/lib/types';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, DIFFICULTY_MULTIPLIERS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FormLabel } from '@/components/ui/form-input';
import { FormCard } from '@/components/ui/form-card';
import { ClipboardList, ChevronDown, ChevronUp, Edit, Plus, Coins, Dumbbell, Brain, Sparkles } from 'lucide-react';

// ドラッグ可能なカードコンポーネント
type Reward = { points: number; exp_body: number; exp_mind: number; exp_spirit: number };

function DraggableTodoCard({ todo, isOverdue, icon, reward, formatDeadline, onMoveToActive, onEditTodo, subtasks, isSubtaskExpanded, onSubtaskExpandToggle, onToggleSubtaskCompletion, formatSubtaskCompletedDate, isReadOnly = false }: {
  todo: Todo;
  isOverdue: boolean;
  icon: string;
  reward: Reward;
  formatDeadline: (dueDate: string | null) => string;
  onMoveToActive?: () => void;
  onEditTodo?: (todoId: string) => void;
  subtasks: TodoSubtask[];
  isSubtaskExpanded: boolean;
  onSubtaskExpandToggle: () => void;
  onToggleSubtaskCompletion?: (subtask: TodoSubtask) => void;
  formatSubtaskCompletedDate: (completedAt: string | null) => string;
  isReadOnly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
    disabled: false,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };
  const hasReward = reward.points > 0 || reward.exp_body > 0 || reward.exp_mind > 0 || reward.exp_spirit > 0;

  const handleCardClick = (e: React.MouseEvent) => {
    if (isReadOnly && !(e.target instanceof HTMLElement && (e.target.closest('button') || e.target.closest('a')))) {
      toast.info(
        '確定済みの日誌のため、タスクの移動はできません。状態を変える場合は、未確定の日付の日誌画面で行ってください。',
        { duration: 5000 }
      );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleCardClick}
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
      {/* 1. ToDoタイトル（左寄せ）｜難易度ラベル（右寄せ） */}
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-base font-bold text-zinc-100 flex-1 min-w-0 truncate" suppressHydrationWarning>
              {todo.task_name}
            </span>
            {todo.difficulty && (
              <span
                className={`px-2 py-0.5 text-xs rounded shrink-0 font-bold ${todo.difficulty === 'easy' ? 'pt-1' : ''} ${DIFFICULTY_COLORS[todo.difficulty]} text-white`}
                title={`難易度: ${DIFFICULTY_LABELS[todo.difficulty]}`}
              >
                {DIFFICULTY_LABELS[todo.difficulty]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. 報酬（ラベル表示）｜ Gold と EXP（種類ごと）・アイコンとテーマカラー */}
      <div className="space-y-1 text-base text-white">
        {hasReward && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold">
            <span className="text-white">報酬</span>
            <span className="text-zinc-500">｜</span>
            {reward.points > 0 && (
              <span className="inline-flex items-center gap-1 text-gold">
                <Coins className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span>{reward.points}G</span>
              </span>
            )}
            {(reward.exp_body > 0 || reward.exp_mind > 0 || reward.exp_spirit > 0) && (
              <>
                {reward.exp_body > 0 && (
                  <span className={`inline-flex items-center gap-0.5 text-exp-body ${reward.points > 0 ? 'ml-[8px]' : ''}`}>
                    <Dumbbell className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    <span>+ {reward.exp_body}</span>
                  </span>
                )}
                {reward.exp_mind > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-exp-intelligence">
                    <Brain className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    <span>+ {reward.exp_mind}</span>
                  </span>
                )}
                {reward.exp_spirit > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-exp-mind">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    <span>+ {reward.exp_spirit}</span>
                  </span>
                )}
              </>
            )}
          </div>
        )}
        {/* 3. （期限超過時はここに表示）期限 */}
        {todo.due_date && (
          <div className={isOverdue ? 'text-red-400' : ''} id={isOverdue ? `overdue-${todo.id}` : undefined} suppressHydrationWarning>
            {isOverdue && <span className="mr-1.5" aria-label="超過">⚠️</span>}
            期限: {formatDeadline(todo.due_date)}
          </div>
        )}
      </div>

      {/* サブタスク（日誌カード：表示＋完了切替のみ。追加・テキスト編集はToDoサマリーで） */}
      <div className="mt-3 pt-3 border-t border-zinc-700 text-sm shrink-0" role="region" aria-label="サブタスク" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSubtaskExpandToggle(); }}
          aria-label={`${todo.task_name}のサブタスクを${isSubtaskExpanded ? '折りたたむ' : '展開する'}`}
          aria-expanded={isSubtaskExpanded}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 w-full text-left"
        >
          <span aria-hidden="true" className={`inline-block text-[0.7rem] leading-none scale-95 origin-left ${isSubtaskExpanded ? 'text-zinc-400' : 'text-cyan-400'}`}>{isSubtaskExpanded ? '▼' : '▶'}</span>
          <span>サブタスク ({subtasks.length}件)</span>
        </button>
        {isSubtaskExpanded && (
          <div className="space-y-2 ml-4 mt-2">
            {subtasks.length === 0 && (
              <p className="text-zinc-500">サブタスクがありません</p>
            )}
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center gap-2 p-2 bg-zinc-800 rounded hover:bg-zinc-750"
              >
                <input
                  type="checkbox"
                  id={`kanban-subtask-${subtask.id}`}
                  checked={subtask.is_completed}
                  onChange={() => onToggleSubtaskCompletion?.(subtask)}
                  disabled={isReadOnly || !onToggleSubtaskCompletion}
                  aria-label={`${subtask.subtask_name}を${subtask.is_completed ? '未完了' : '完了'}にする`}
                  className="w-4 h-4 text-cyan-600 bg-zinc-700 border-zinc-600 rounded focus:ring-cyan-500 shrink-0"
                />
                <span className={`flex-1 min-w-0 ${subtask.is_completed ? 'text-zinc-200 line-through decoration-[3px]' : 'text-zinc-300'}`}>
                  {subtask.subtask_name}
                </span>
                {subtask.is_completed && (subtask.completed_at ?? subtask.updated_at) && (
                  <span className="text-zinc-400 text-xs shrink-0">
                    {formatSubtaskCompletedDate(subtask.completed_at ?? subtask.updated_at ?? null)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 進行中のみ：アクティブに戻す（確定済みでは状態変化のため非表示） */}
      {todo.status === 'in_progress' && onMoveToActive && !isReadOnly && (
        <div className="pt-3 mt-3 border-t border-zinc-700" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveToActive();
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
          >
            ← アクティブに戻す
          </button>
        </div>
      )}

      {/* 編集ボタン（確定済みでもタスク名・難易度・期限などの編集は可能） */}
      {onEditTodo && (
        <div className="pt-3 mt-3 border-t border-zinc-700 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditTodo(todo.id);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
            aria-label={`${todo.task_name}を編集する`}
          >
            <Edit className="w-3 h-3" />
            編集
          </button>
        </div>
      )}
    </div>
  );
}

// 完了済みカードの見た目（中身だけ）
function CompletedTodoCardInner({ todo, icon, reward, formatCompletedDate }: {
  todo: Todo;
  icon: string;
  reward: Reward;
  formatCompletedDate: (completedAt: string | null) => string;
}) {
  const hasReward = reward.points > 0 || reward.exp_body > 0 || reward.exp_mind > 0 || reward.exp_spirit > 0;
  return (
    <>
      {/* 2. ToDoタイトル（左寄せ）｜難易度ラベル（右寄せ） */}
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-base font-bold text-zinc-100 flex-1 min-w-0 truncate line-through decoration-[3px]" suppressHydrationWarning>
              {todo.task_name}
            </span>
            {todo.difficulty && (
              <span
                className={`px-2 py-0.5 text-xs rounded shrink-0 font-bold ${todo.difficulty === 'easy' ? 'pt-1' : ''} ${DIFFICULTY_COLORS[todo.difficulty]} text-white`}
                title={`難易度: ${DIFFICULTY_LABELS[todo.difficulty]}`}
              >
                {DIFFICULTY_LABELS[todo.difficulty]}
              </span>
            )}
          </div>
        </div>
      </div>
      {/* 2. 報酬（ラベル表示）｜ Gold と EXP（種類ごと）・アイコンとテーマカラー */}
      <div className="space-y-1 text-base text-white">
        {hasReward && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold">
            <span className="text-white">報酬</span>
            <span className="text-zinc-500">｜</span>
            {reward.points > 0 && (
              <span className="inline-flex items-center gap-1 text-gold">
                <Coins className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span>{reward.points}G</span>
              </span>
            )}
            {reward.exp_body > 0 && (
              <span className={`inline-flex items-center gap-0.5 text-exp-body ${reward.points > 0 ? 'ml-[8px]' : ''}`}>
                <Dumbbell className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span>+ {reward.exp_body}</span>
              </span>
            )}
            {reward.exp_mind > 0 && (
              <span className="inline-flex items-center gap-0.5 text-exp-intelligence">
                <Brain className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span>+ {reward.exp_mind}</span>
              </span>
            )}
            {reward.exp_spirit > 0 && (
              <span className="inline-flex items-center gap-0.5 text-exp-mind">
                <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span>+ {reward.exp_spirit}</span>
              </span>
            )}
          </div>
        )}
        {todo.completed_at && (
          <div suppressHydrationWarning>完了: {formatCompletedDate(todo.completed_at)}</div>
        )}
      </div>
    </>
  );
}

// 完了済みカードコンポーネント（ドラッグ可能・アクティブ/進行中へ戻せる）
function DraggableCompletedTodoCard({ todo, icon, reward, formatCompletedDate, onEditTodo, subtasks, isSubtaskExpanded, onSubtaskExpandToggle, onToggleSubtaskCompletion, formatSubtaskCompletedDate, isReadOnly = false }: {
  todo: Todo;
  icon: string;
  reward: Reward;
  formatCompletedDate: (completedAt: string | null) => string;
  onEditTodo?: (todoId: string) => void;
  subtasks: TodoSubtask[];
  isSubtaskExpanded: boolean;
  onSubtaskExpandToggle: () => void;
  onToggleSubtaskCompletion?: (subtask: TodoSubtask) => void;
  formatSubtaskCompletedDate: (completedAt: string | null) => string;
  isReadOnly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
    disabled: false,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };
  const handleCardClick = (e: React.MouseEvent) => {
    if (isReadOnly && !(e.target instanceof HTMLElement && (e.target.closest('button') || e.target.closest('a')))) {
      toast.info(
        '確定済みの日誌のため、タスクの移動はできません。状態を変える場合は、未確定の日付の日誌画面で行ってください。',
        { duration: 5000 }
      );
    }
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`${todo.task_name}をドラッグしてアクティブまたは進行中へ戻す`}
      className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 hover:border-cyan-600 transition-colors opacity-75 cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
    >
      <CompletedTodoCardInner todo={todo} icon={icon} reward={reward} formatCompletedDate={formatCompletedDate} />
      {/* サブタスク（日誌カード：表示＋完了切替のみ。追加・テキスト編集はToDoサマリーで） */}
      <div className="mt-3 pt-3 border-t border-zinc-700 text-sm shrink-0" role="region" aria-label="サブタスク" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSubtaskExpandToggle(); }}
          aria-label={`${todo.task_name}のサブタスクを${isSubtaskExpanded ? '折りたたむ' : '展開する'}`}
          aria-expanded={isSubtaskExpanded}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 w-full text-left"
        >
          <span aria-hidden="true" className={`inline-block text-[0.7rem] leading-none scale-95 origin-left ${isSubtaskExpanded ? 'text-zinc-400' : 'text-cyan-400'}`}>{isSubtaskExpanded ? '▼' : '▶'}</span>
          <span>サブタスク ({subtasks.length}件)</span>
        </button>
        {isSubtaskExpanded && (
          <div className="space-y-2 ml-4 mt-2">
            {subtasks.length === 0 && (
              <p className="text-zinc-500">サブタスクがありません</p>
            )}
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center gap-2 p-2 bg-zinc-800 rounded opacity-75"
              >
                <input
                  type="checkbox"
                  id={`kanban-completed-subtask-${subtask.id}`}
                  checked={subtask.is_completed}
                  onChange={() => onToggleSubtaskCompletion?.(subtask)}
                  disabled={isReadOnly || !onToggleSubtaskCompletion}
                  aria-label={`${subtask.subtask_name}を${subtask.is_completed ? '未完了' : '完了'}にする`}
                  className="w-4 h-4 text-cyan-600 bg-zinc-700 border-zinc-600 rounded focus:ring-cyan-500 shrink-0"
                />
                <span className={`flex-1 min-w-0 ${subtask.is_completed ? 'text-zinc-200 line-through decoration-[3px]' : 'text-zinc-300'}`}>
                  {subtask.subtask_name}
                </span>
                {subtask.is_completed && (subtask.completed_at ?? subtask.updated_at) && (
                  <span className="text-zinc-400 text-xs shrink-0">
                    {formatSubtaskCompletedDate(subtask.completed_at ?? subtask.updated_at ?? null)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 編集ボタン（確定済みでもタスク名・難易度・期限などの編集は可能） */}
      {onEditTodo && (
        <div className="pt-3 mt-3 border-t border-zinc-700 flex justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditTodo(todo.id);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
            aria-label={`${todo.task_name}を編集する`}
          >
            <Edit className="w-3 h-3" />
            編集
          </button>
        </div>
      )}
    </div>
  );
}

// 完了済みカード（ドラッグ不可・DragOverlay 用など）
function CompletedTodoCard({ todo, icon, reward, formatCompletedDate }: {
  todo: Todo;
  icon: string;
  reward: Reward;
  formatCompletedDate: (completedAt: string | null) => string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 hover:border-cyan-600 transition-colors opacity-75">
      <CompletedTodoCardInner todo={todo} icon={icon} reward={reward} formatCompletedDate={formatCompletedDate} />
    </div>
  );
}

// カード単位のドロップ領域（同一カラム内の並び替え用）
function DroppableCardSlot({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef}>{children}</div>;
}

// ドロップ可能なカラムコンポーネント
function DroppableColumn({
  id,
  title,
  todos,
  isOverdue,
  getIcon,
  getReward,
  formatDeadline,
  formatCompletedDate,
  sortOrder,
  onSortChange,
  dateSortLabel,
  onMoveToActive,
  onEditTodo,
  getSubtasksForTodo,
  expandedSubtaskTodoIds,
  onSubtaskExpandToggle,
  onToggleSubtaskCompletion,
  formatSubtaskCompletedDate,
  isReadOnly = false,
}: {
  id: string;
  title: string;
  todos: Todo[];
  isOverdue: (dueDate: string | null, status: string) => boolean;
  getIcon: (status: string) => string;
  getReward: (todo: Todo) => Reward;
  formatDeadline: (dueDate: string | null) => string;
  formatCompletedDate: (completedAt: string | null) => string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (order: 'asc' | 'desc') => void;
  dateSortLabel?: string;
  onMoveToActive?: (todoId: string) => void;
  onEditTodo?: (todoId: string) => void;
  getSubtasksForTodo: (todoId: string) => TodoSubtask[];
  expandedSubtaskTodoIds: Set<string>;
  onSubtaskExpandToggle: (todoId: string) => void;
  onToggleSubtaskCompletion?: (subtask: TodoSubtask) => void;
  formatSubtaskCompletedDate: (completedAt: string | null) => string;
  isReadOnly?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="bg-zinc-800 rounded-lg p-3 mb-3 shrink-0">
        <h3 className="font-medium text-zinc-300 text-base flex items-center justify-between gap-2">
          <span>{title}</span>
          <span className="flex items-center gap-1 shrink-0">
            {sortOrder !== undefined && onSortChange && dateSortLabel && (
              <span className="flex items-center gap-1 text-xs text-zinc-500" aria-label={`${dateSortLabel}で並び替え`}>
                <button
                  type="button"
                  onClick={() => onSortChange('asc')}
                  className={`px-1.5 py-0.5 rounded ${sortOrder === 'asc' ? 'bg-cyan-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}`}
                  title="古い順"
                >
                  古い順
                </button>
                <button
                  type="button"
                  onClick={() => onSortChange('desc')}
                  className={`px-1.5 py-0.5 rounded ${sortOrder === 'desc' ? 'bg-cyan-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}`}
                  title="新しい順"
                >
                  新しい順
                </button>
              </span>
            )}
            <span className="text-base text-zinc-500" aria-label={`${todos.length}件のタスク`}>
              ({todos.length})
            </span>
          </span>
        </h3>
      </div>
      <div
        ref={setNodeRef}
        role="region"
        aria-label={`${title}カラム`}
        className={`flex-1 min-h-[200px] space-y-3 rounded-lg p-2 transition-colors ${
          isOver ? 'bg-cyan-900/20 border-2 border-cyan-600 border-dashed' : ''
        }`}
      >
        {todos.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-base">
            {title === 'アクティブタスク' && 'アクティブなタスクはありません'}
            {title === '進行中' && '進行中のタスクはありません'}
            {title === '完了済み' && '完了済みのタスクはありません'}
          </div>
        ) : (
          todos.map((todo) => {
            const overdue = isOverdue(todo.due_date, todo.status);
            const icon = getIcon(todo.status);
            const reward = getReward(todo);

            const subtasksForTodo = getSubtasksForTodo(todo.id);
            const isSubtaskExpanded = expandedSubtaskTodoIds.has(todo.id);

            if (todo.status === 'completed') {
              return (
                <DraggableCompletedTodoCard
                  key={todo.id}
                  todo={todo}
                  icon={icon}
                  reward={reward}
                  formatCompletedDate={formatCompletedDate}
                  onEditTodo={onEditTodo}
                  subtasks={subtasksForTodo}
                  isSubtaskExpanded={isSubtaskExpanded}
                  onSubtaskExpandToggle={() => onSubtaskExpandToggle(todo.id)}
                  onToggleSubtaskCompletion={onToggleSubtaskCompletion}
                  formatSubtaskCompletedDate={formatSubtaskCompletedDate}
                  isReadOnly={isReadOnly}
                />
              );
            }

            return (
              <DroppableCardSlot key={todo.id} id={todo.id}>
                <DraggableTodoCard
                  todo={todo}
                  isOverdue={overdue}
                  icon={icon}
                  reward={reward}
                  formatDeadline={formatDeadline}
                  onMoveToActive={onMoveToActive ? () => onMoveToActive(todo.id) : undefined}
                  onEditTodo={onEditTodo}
                  subtasks={subtasksForTodo}
                  isSubtaskExpanded={isSubtaskExpanded}
                  onSubtaskExpandToggle={() => onSubtaskExpandToggle(todo.id)}
                  onToggleSubtaskCompletion={onToggleSubtaskCompletion}
                  formatSubtaskCompletedDate={formatSubtaskCompletedDate}
                  isReadOnly={isReadOnly}
                />
              </DroppableCardSlot>
            );
          })
        )}
      </div>
    </div>
  );
}

function KanbanBoard({ userId, todos: initialTodos, todoSubtasks: initialSubtasks, dailyLogId, isExpanded: externalIsExpanded, onExpandedChange, onEditTodo, onOpenCreateModal, isConfirmed = false }: KanbanBoardProps) {

  // ローカル状態でtodosを管理（ドラッグ&ドロップで即座に反映）
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [subtasks, setSubtasks] = useState<TodoSubtask[]>(initialSubtasks ?? []);
  // サブタスクが1件以上あるToDoはデフォルトで展開
  const [expandedSubtaskTodoIds, setExpandedSubtaskTodoIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    for (const st of initialSubtasks ?? []) ids.add(st.todo_id);
    return ids;
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [internalIsExpanded, setInternalIsExpanded] = useState(true); // アコーディオンの開閉状態（内部管理）
  // フィルター状態（初回はサーバーとクライアントで同じにし、マウント後に localStorage から復元して Hydration エラーを防ぐ）
  const [filterDifficulties, setFilterDifficulties] = useState<Difficulty[]>([]);
  const [sortDateActive, setSortDateActive] = useState<'asc' | 'desc'>('asc');
  const [sortDateInProgress, setSortDateInProgress] = useState<'asc' | 'desc'>('asc');
  const [sortDateCompleted, setSortDateCompleted] = useState<'asc' | 'desc'>('desc');
  // @dnd-kit の aria-* がサーバーと一致しないため、DndContext 配下はクライアントマウント後のみ描画する
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setSubtasks(initialSubtasks ?? []);
    // サブタスクがある ToDo を展開状態にしておく
    setExpandedSubtaskTodoIds((prev) => {
      const next = new Set(prev);
      for (const st of initialSubtasks ?? []) next.add(st.todo_id);
      return next;
    });
  }, [initialSubtasks]);

  // マウント後に localStorage からフィルター・ソートを復元（Hydration 後のみ実行）
  useEffect(() => {
    const savedDiff = localStorage.getItem('todo-kanban-filter-difficulties');
    if (savedDiff) {
      try {
        const parsed = JSON.parse(savedDiff);
        if (Array.isArray(parsed)) setFilterDifficulties(parsed);
      } catch {
        /* ignore */
      }
    }
    const sActive = localStorage.getItem('todo-kanban-sort-date-active');
    if (sActive === 'asc' || sActive === 'desc') setSortDateActive(sActive);
    const sProgress = localStorage.getItem('todo-kanban-sort-date-in-progress');
    if (sProgress === 'asc' || sProgress === 'desc') setSortDateInProgress(sProgress);
    const sCompleted = localStorage.getItem('todo-kanban-sort-date-completed');
    if (sCompleted === 'asc' || sCompleted === 'desc') setSortDateCompleted(sCompleted);
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // フィルター状態をローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('todo-kanban-filter-difficulties', JSON.stringify(filterDifficulties));
  }, [filterDifficulties]);

  useEffect(() => {
    localStorage.setItem('todo-kanban-sort-date-active', sortDateActive);
  }, [sortDateActive]);
  useEffect(() => {
    localStorage.setItem('todo-kanban-sort-date-in-progress', sortDateInProgress);
  }, [sortDateInProgress]);
  useEffect(() => {
    localStorage.setItem('todo-kanban-sort-date-completed', sortDateCompleted);
  }, [sortDateCompleted]);

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

  // フィルター適用関数
  const applyFilters = (todoList: Todo[]) => {
    return todoList.filter((todo) => {
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

  // 期限超過判定関数（sortTodosByDeadline より前に定義すること）
  const isOverdue = (dueDate: string | null, status: string): boolean => {
    if (!dueDate || status === 'completed') return false;
    const due = new Date(dueDate);
    const todayDate = new Date(today);
    return due < todayDate;
  };

  // 日付でソート（小順=asc=古い順、高順=desc=新しい順）。同一日は getSubKey で比較
  const sortByDate = (
    list: Todo[],
    getDate: (t: Todo) => string | null,
    order: 'asc' | 'desc',
    getSubKey?: (t: Todo) => number
  ): Todo[] => {
    return [...list].sort((a, b) => {
      const da = getDate(a);
      const db = getDate(b);
      const ta = da ? new Date(da).getTime() : NaN;
      const tb = db ? new Date(db).getTime() : NaN;
      const na = Number.isNaN(ta);
      const nb = Number.isNaN(tb);
      if (na && nb) return (getSubKey ? getSubKey(a) - getSubKey(b) : 0);
      if (na) return order === 'asc' ? 1 : -1;
      if (nb) return order === 'asc' ? -1 : 1;
      const cmp = order === 'asc' ? ta - tb : tb - ta;
      if (cmp !== 0) return cmp;
      return getSubKey ? getSubKey(a) - getSubKey(b) : 0;
    });
  };

  // 期限切れを一番上（日付古い順）、それ以外は display_order（ドラッグで変更可能）
  const sortTodosByDeadline = (todoList: Todo[]): Todo[] => {
    const overdue = todoList.filter((t) => isOverdue(t.due_date, t.status));
    const rest = todoList.filter((t) => !isOverdue(t.due_date, t.status));
    const overdueSorted = overdue.sort((a, b) =>
      (a.due_date && b.due_date) ? new Date(a.due_date).getTime() - new Date(b.due_date).getTime() : 0
    );
    const restSorted = rest.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    return [...overdueSorted, ...restSorted];
  };

  // ステータス別にtodosを分類（保留中は日誌カンバンに表示しない）
  const activeFiltered = applyFilters(todos.filter((todo) => todo.status === 'active' && !(todo.is_on_hold === true)));
  const inProgressFiltered = applyFilters(todos.filter((todo) => todo.status === 'in_progress' && !(todo.is_on_hold === true)));
  const activeTodos =
    sortDateActive === 'asc'
      ? sortTodosByDeadline(activeFiltered)
      : sortByDate(activeFiltered, (t) => t.due_date, 'desc', (t) => t.display_order ?? 0);
  const inProgressTodos =
    sortDateInProgress === 'asc'
      ? sortTodosByDeadline(inProgressFiltered)
      : sortByDate(inProgressFiltered, (t) => t.due_date, 'desc', (t) => t.display_order ?? 0);

  // 完了済みタスク（今月のものだけ表示・完了日でソート）
  const completedTodos = sortByDate(
    applyFilters(
      todos.filter((todo) => {
        if (todo.status !== 'completed') return false;
        if (!todo.completed_at) return false;

        const { startDate, endDate } = getCurrentMonthRange();
        const completedDate = new Date(todo.completed_at);

        return completedDate >= startDate && completedDate <= endDate;
      })
    ),
    (t) => t.completed_at,
    sortDateCompleted
  );

  // アイコン取得関数
  const getIcon = (status: string): string => {
    if (status === 'completed') return '✅';
    return '📄';
  };

  const getRewardPoints = (t: Todo): number => calculateReward(t).points;

  // 期限表示用フォーマット関数（西暦下2桁含む YY/MM/DD形式）
  const formatDeadline = (dueDate: string | null): string => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  // 完了日時表示用フォーマット（26/01/28-水 HH:mm 形式、括弧付き）
  const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];
  const formatCompletedDate = (completedAt: string | null): string => {
    if (!completedAt) return '';
    const date = new Date(completedAt);
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekday = WEEKDAY_JA[date.getDay()];
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `(${year}/${month}/${day}-${weekday} ${hour}:${minute})`;
  };

  const formatSubtaskCompletedDate = (completedAt: string | null): string => {
    if (!completedAt) return '';
    const date = new Date(completedAt);
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekday = WEEKDAY_JA[date.getDay()];
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `(${year}/${month}/${day}-${weekday} ${hour}:${minute})`;
  };

  const getSubtasksForTodo = (todoId: string): TodoSubtask[] =>
    subtasks.filter((st) => st.todo_id === todoId);

  const toggleSubtaskExpand = (todoId: string) => {
    setExpandedSubtaskTodoIds((prev) => {
      const next = new Set(prev);
      if (next.has(todoId)) next.delete(todoId);
      else next.add(todoId);
      return next;
    });
  };

  const handleToggleSubtaskCompletion = async (subtask: TodoSubtask) => {
    const willBeCompleted = !subtask.is_completed;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('todo_subtasks')
        .update({
          is_completed: willBeCompleted,
          completed_at: willBeCompleted ? new Date().toISOString() : null,
        })
        .eq('id', subtask.id);
      if (error) {
        toast.error('サブタスクの更新に失敗しました', { description: error.message });
        return;
      }
      setSubtasks((prev) =>
        prev.map((st) =>
          st.id === subtask.id
            ? {
                ...st,
                is_completed: willBeCompleted,
                completed_at: willBeCompleted ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
              }
            : st
        )
      );
    } catch (err) {
      console.error('サブタスク完了切替エラー:', err);
      toast.error('サブタスクの更新に失敗しました');
    }
  };

  // EXP合計計算関数
  const getTotalExp = (todo: Todo): number => {
    return todo.sp_exp_body + todo.sp_exp_mind + todo.sp_exp_spirit;
  };

  // ドラッグ開始時の処理（確定済みの場合はアラートを出してドラッグを無効にする）
  const handleDragStart = (event: DragStartEvent) => {
    if (isConfirmed) {
      toast.info(
        '確定済みの日誌のため、タスクの移動はできません。状態を変える場合は、未確定の日付の日誌画面で行ってください。',
        { duration: 5000 }
      );
      setActiveId(null);
      return;
    }
    setActiveId(event.active.id as string);
  };

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

      // 報酬を計算（userId はサーバーから props で渡されているため、ここでの再認証は不要）
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
      // ポイント/EXPの profiles 反映は確定ボタンで一括適用するため、ここでは記録のみ
    } catch (err) {
      console.error('報酬計算・反映エラー:', err);
    }
  };

  // タスク未完了時: todo_logs から記録を削除（profiles の反映は確定時に一括なのでここでは削除のみ）
  const handleTaskUncompletion = async (todo: Todo) => {
    if (!dailyLogId) {
      return;
    }

    try {
      const supabase = createClient();

      // userId はサーバーから props で渡されているため、ここでの再認証は不要
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

  // 進行中 → アクティブに戻す（ボタン用）
  const handleMoveToActive = async (todoId: string) => {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo || todo.status !== 'in_progress') return;
    setIsUpdating(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('todos')
        .update({ status: 'active', completed_at: null })
        .eq('id', todoId);
      if (error) {
        toast.error('アクティブに戻せませんでした', { description: error.message });
        return;
      }
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todoId ? { ...t, status: 'active' as const, completed_at: null } : t
        )
      );
      toast.success('アクティブに戻しました');
      window.location.reload();
    } catch (err) {
      console.error('アクティブへ移動エラー:', err);
      toast.error('アクティブに戻せませんでした');
    } finally {
      setIsUpdating(false);
    }
  };

  // ドラッグ終了時の処理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (isConfirmed) return;
    if (!over) return;

    const todoId = active.id as string;
    const overId = over.id as string;
    const currentTodo = todos.find((t) => t.id === todoId);
    if (!currentTodo) return;

    // ステータスマッピング（カラムID → ステータス）
    const statusMap: Record<string, 'active' | 'in_progress' | 'completed'> = {
      'column-active': 'active',
      'column-in-progress': 'in_progress',
      'column-completed': 'completed',
    };

    const targetInActive = activeTodos.find((t) => t.id === overId);
    const targetInProgress = inProgressTodos.find((t) => t.id === overId);
    // ドロップ先のステータス（カラム上 or 他カラムのカード上）
    const mappedStatus =
      statusMap[overId] ?? (targetInActive ? 'active' : targetInProgress ? 'in_progress' : undefined);

    // 同じカラム内の並び替え（アクティブ/進行中のみ。完了→他カラムのカード上は下のカラム間処理へ）
    const sameColumnReorder =
      (targetInActive || targetInProgress) &&
      overId !== todoId &&
      currentTodo.status !== 'completed' &&
      (currentTodo.status === 'active' ? !!targetInActive : !!targetInProgress);

    if (sameColumnReorder) {
      if (isOverdue(currentTodo.due_date, currentTodo.status)) {
        toast.warning('期限超過のタスクは並び替えできません');
        return;
      }
      const currentList =
        currentTodo.status === 'active' ? [...activeTodos] : [...inProgressTodos];
      const oldIndex = currentList.findIndex((t) => t.id === todoId);
      const newIndex = currentList.findIndex((t) => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const [moved] = currentList.splice(oldIndex, 1);
      currentList.splice(newIndex, 0, moved);
      const overdueCount = currentList.filter((t) => isOverdue(t.due_date, t.status)).length;
      setIsUpdating(true);
      try {
        const supabase = createClient();
        let restIndex = 0;
        for (const t of currentList) {
          if (!isOverdue(t.due_date, t.status)) {
            await supabase.from('todos').update({ display_order: overdueCount + restIndex }).eq('id', t.id);
            restIndex += 1;
          }
        }
        toast.success('並び順を更新しました');
        window.location.reload();
      } catch (err) {
        console.error('並び順更新エラー:', err);
        toast.error('並び順の更新に失敗しました');
      } finally {
        setIsUpdating(false);
      }
      return;
    }

    // カラム間のステータス変更（カラム上へのドロップ or 完了→アクティブ/進行中のカード上へのドロップ）
    if (!mappedStatus || currentTodo.status === mappedStatus) return;

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
        <h2 className="text-xl sm:text-2xl font-medium text-zinc-100 mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          <span>ToDoリスト</span>
        </h2>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 text-center">
          <p className="text-zinc-400 mb-2">ToDoタスクがまだ登録されていません</p>
          <p className="text-base text-zinc-500">
            設定またはToDoサマリータブからタスクを追加できます。
          </p>
        </div>
      </div>
    );
  }

  // クライアントマウント前は DndContext を使わずプレースホルダーのみ描画（@dnd-kit の aria-* による Hydration エラーを防ぐ）
  if (!isClient) {
    return (
      <div className="mb-8">
        <div className="w-full text-left mb-4 flex items-center justify-between gap-2">
          <h2 className="text-xl sm:text-2xl font-medium text-zinc-100 flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            <span>ToDoリスト</span>
          </h2>
          <ChevronDown className="w-5 h-5 text-cyan-400 shrink-0" />
        </div>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 text-center">
          <p className="text-zinc-400">読み込み中...</p>
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
        <h2 className="text-xl sm:text-2xl font-medium text-zinc-100 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          <span>ToDoリスト</span>
          {isUpdating && (
            <span className="text-base text-zinc-500 ml-2">(更新中...)</span>
          )}
        </h2>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-zinc-400 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-cyan-400 shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div id="kanban-board-content">
          {/* フィルターUI */}
          <FormCard className="p-3 sm:p-4 mb-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-base sm:text-lg font-medium text-zinc-300">フィルター</h3>
                <div className="flex items-center gap-2 shrink-0">
                  {filterDifficulties.length > 0 && (
                    <span className="text-xs text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded">
                      フィルター適用中: アクティブタスク {activeTodos.length}件 / 進行中 {inProgressTodos.length}件 / 完了 {completedTodos.length}件
                    </span>
                  )}
                  {/* 確定済み日誌でも新規ToDo作成は可能（押下でToDoサマリーに切り替えて作成モーダルを開く） */}
                  {onOpenCreateModal && (
                    <Button
                      onClick={(e) => { e.stopPropagation(); onOpenCreateModal(); }}
                      variant="default"
                      size="sm"
                      className="text-cyan-400 bg-cyan-950/50 border border-cyan-700/50 hover:bg-cyan-900/50"
                      aria-label="新規ToDoを作成（ToDoサマリーで追加）"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      新規タスク
                    </Button>
                  )}
                </div>
              </div>

              {/* 難易度フィルター */}
              <div>
                  <FormLabel>難易度</FormLabel>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilterDifficulties([])}
                      className={`px-3 py-1 text-sm rounded font-bold ${
                        filterDifficulties.length === 0
                          ? 'bg-cyan-700 text-white'
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
                        className={`px-3 py-1 text-sm rounded font-bold ${difficulty === 'easy' ? 'pt-1' : ''} ${
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
              {filterDifficulties.length > 0 && (
                <div>
                  <Button
                    onClick={() => setFilterDifficulties([])}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {/* アクティブカラム */}
          <DroppableColumn
            id="column-active"
            title="アクティブタスク"
            todos={activeTodos}
            isOverdue={isOverdue}
            getIcon={getIcon}
            getReward={calculateReward}
            formatDeadline={formatDeadline}
            formatCompletedDate={formatCompletedDate}
            sortOrder={sortDateActive}
            onSortChange={setSortDateActive}
            dateSortLabel="期限"
            onEditTodo={onEditTodo}
            getSubtasksForTodo={getSubtasksForTodo}
            expandedSubtaskTodoIds={expandedSubtaskTodoIds}
            onSubtaskExpandToggle={toggleSubtaskExpand}
            onToggleSubtaskCompletion={handleToggleSubtaskCompletion}
            formatSubtaskCompletedDate={formatSubtaskCompletedDate}
            isReadOnly={isConfirmed}
          />

          {/* 進行中カラム */}
          <DroppableColumn
            id="column-in-progress"
            title="進行中"
            todos={inProgressTodos}
            isOverdue={isOverdue}
            getIcon={getIcon}
            getReward={calculateReward}
            formatDeadline={formatDeadline}
            formatCompletedDate={formatCompletedDate}
            sortOrder={sortDateInProgress}
            onSortChange={setSortDateInProgress}
            dateSortLabel="期限"
            onMoveToActive={handleMoveToActive}
            onEditTodo={onEditTodo}
            getSubtasksForTodo={getSubtasksForTodo}
            expandedSubtaskTodoIds={expandedSubtaskTodoIds}
            onSubtaskExpandToggle={toggleSubtaskExpand}
            onToggleSubtaskCompletion={handleToggleSubtaskCompletion}
            formatSubtaskCompletedDate={formatSubtaskCompletedDate}
            isReadOnly={isConfirmed}
          />

          {/* 完了済みカラム */}
          <DroppableColumn
            id="column-completed"
            title="完了済み"
            todos={completedTodos}
            isOverdue={isOverdue}
            getIcon={getIcon}
            getReward={calculateReward}
            formatDeadline={formatDeadline}
            formatCompletedDate={formatCompletedDate}
            sortOrder={sortDateCompleted}
            onSortChange={setSortDateCompleted}
            dateSortLabel="完了日"
            onEditTodo={onEditTodo}
            getSubtasksForTodo={getSubtasksForTodo}
            expandedSubtaskTodoIds={expandedSubtaskTodoIds}
            onSubtaskExpandToggle={toggleSubtaskExpand}
            onToggleSubtaskCompletion={handleToggleSubtaskCompletion}
            formatSubtaskCompletedDate={formatSubtaskCompletedDate}
            isReadOnly={isConfirmed}
          />
        </div>

        {/* ドラッグ中のオーバーレイ */}
        <DragOverlay>
          {activeTodo ? (
            activeTodo.status === 'completed' ? (
              <div className="bg-zinc-900 border border-cyan-600 rounded-lg p-3 shadow-lg opacity-90 rotate-2">
                <CompletedTodoCardInner
                  todo={activeTodo}
                  icon={getIcon(activeTodo.status)}
                  reward={calculateReward(activeTodo)}
                  formatCompletedDate={formatCompletedDate}
                />
              </div>
            ) : (
              <div className="bg-zinc-900 border border-cyan-600 rounded-lg p-3 shadow-lg opacity-90 rotate-2">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-lg">{getIcon(activeTodo.status)}</span>
                  <span className="text-base font-bold text-zinc-100 flex-1">
                    {activeTodo.task_name}
                  </span>
                </div>
                <div className="space-y-1 text-base text-white">
                  {(() => {
                    const r = calculateReward(activeTodo);
                    const hasR = r.points > 0 || r.exp_body > 0 || r.exp_mind > 0 || r.exp_spirit > 0;
                    return hasR && (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold">
                        {r.points > 0 && (
                          <span className="inline-flex items-center gap-1 text-gold">
                            <Coins className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            <span>{r.points}G</span>
                          </span>
                        )}
                        {r.exp_body > 0 && (
                          <span className={`inline-flex items-center gap-0.5 text-exp-body ${r.points > 0 ? 'ml-[8px]' : ''}`}>
                            <Dumbbell className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            <span>+ {r.exp_body}</span>
                          </span>
                        )}
                        {r.exp_mind > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-exp-intelligence">
                            <Brain className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            <span>+ {r.exp_mind}</span>
                          </span>
                        )}
                        {r.exp_spirit > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-exp-mind">
                            <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            <span>+ {r.exp_spirit}</span>
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )
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
