'use client';

import React, { useState, useMemo, memo, useEffect } from 'react';
import { useRouterRefresh } from '@/contexts/router-refresh-context';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { FormInput, FormInputSmall, FormLabel } from '@/components/ui/form-input';
import { FormCard, FormCardContent } from '@/components/ui/form-card';
import { toast } from 'sonner';
import { Settings, Edit, ChevronDown, ChevronUp, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { ExpWithIcons } from '@/components/exp-with-icons';
import { isWeekendOrHoliday } from '@/lib/date-utils';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  type Habit,
  type HabitLog,
  type HabitListProps,
  type HabitWithLog,
  type HabitFormData,
  type ChildHabitRow,
  SortableManagementGroup,
  buildHabitTree,
  buildManagementGroups,
  isParentCompleted,
  HabitMobileDetail,
  getHabitPointsExpPartsUtil,
} from './habit-list-utils';

function HabitList({ habits, habitLogs, dailyLogId, logDate, isConfirmed = false }: HabitListProps) {
  const { refreshQuiet } = useRouterRefresh();
  const supabase = createClient();
  const sensors = useSensors(useSensor(PointerSensor));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const defaultFormData: HabitFormData = {
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
    is_low_frequency: false,
    parent_habit_id: '',
  };
  const [formData, setFormData] = useState<HabitFormData>(defaultFormData);
  /** モーダル内フォーム用。開閉時と入力時のみ更新され、他から上書きされない */
  const [modalFormData, setModalFormData] = useState<HabitFormData>(defaultFormData);
  /** 親習慣（子習慣を設定する）モード：true のとき親は見出しのみ・子だけチェック可能 */
  const [isParentWithChildren, setIsParentWithChildren] = useState(false);
  /** モーダル内の子習慣リスト（サブタスク風）。id は既存なら habit.id、新規なら temp-* */
  const [modalChildRows, setModalChildRows] = useState<ChildHabitRow[]>([]);

  // habitsとhabit_logsをマージ（useMemoで計算）
  const baseHabitsWithLogs = useMemo<HabitWithLog[]>(() => {
    return habits.map((habit) => {

      const log = habitLogs.find((log) => log.habit_id === habit.id);
      return {
        ...habit,
        checked: log?.is_checked || false,
        count: log?.count || (habit.input_type === 'number' ? 0 : 1),
        habitLogId: log?.id || null,
      };
    });
  }, [habits, habitLogs]);

  // データベース更新後の一時的な状態管理
  const [localUpdates, setLocalUpdates] = useState<Map<string, { checked: boolean; count: number }>>(new Map());

  // 日付（dailyLogId）が変わったらローカルのチェック状態をクリアし、前の日のチェックが残らないようにする
  useEffect(() => {
    setLocalUpdates(new Map());
  }, [dailyLogId]);

  // 計算された値と一時的な更新をマージ
  const habitsWithLogs = useMemo<HabitWithLog[]>(() => {
    return baseHabitsWithLogs.map((habit) => {
      const update = localUpdates.get(habit.id);
      if (update) {
        return {
          ...habit,
          checked: update.checked,
          count: update.count,
        };
      }
      return habit;
    });
  }, [baseHabitsWithLogs, localUpdates]);

  // アコーディオンの開閉状態を管理
  const [isGoodHabitsExpanded, setIsGoodHabitsExpanded] = useState(true);
  const [isBadHabitsExpanded, setIsBadHabitsExpanded] = useState(true);
  const [isBonusExpanded, setIsBonusExpanded] = useState(true);
  const [isGoodLowFreqExpanded, setIsGoodLowFreqExpanded] = useState(false);
  const [isBadLowFreqExpanded, setIsBadLowFreqExpanded] = useState(false);
  // モバイル用：習慣の詳細展開（週末除外・Comp対象外ボタン表示）
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);

  // フィルター適用（習慣では難易度フィルターなし）
  const applyFilters = (habits: HabitWithLog[]) => habits;

  const isWeekendOrHolidayToday = isWeekendOrHoliday(logDate);

  // 良習慣、悪習慣、ボーナスに分類（フィルター適用後。非活性習慣は除外）
  const goodHabits = applyFilters(habitsWithLogs.filter((h) => h.habit_type === 'good' && h.is_active !== false));
  const badHabits = applyFilters(habitsWithLogs.filter((h) => h.habit_type === 'bad' && h.is_active !== false));
  const bonusHabits = applyFilters(habitsWithLogs.filter((h) => h.habit_type === 'bonus' && h.is_active !== false));

  // 表示用ツリー（親→子のネスト）
  // 低頻度ゾーン = 親が低頻度の習慣 + その子習慣（子の is_low_frequency に関わらず）
  const goodLowParentIds = useMemo(
    () => new Set(goodHabits.filter((h) => !h.parent_habit_id && h.is_low_frequency).map((h) => h.id)),
    [goodHabits]
  );
  const goodLowHabits = useMemo(
    () => goodHabits.filter((h) => h.is_low_frequency || (h.parent_habit_id != null && goodLowParentIds.has(h.parent_habit_id))),
    [goodHabits, goodLowParentIds]
  );
  const goodHighHabits = useMemo(() => {
    const lowIds = new Set(goodLowHabits.map((h) => h.id));
    return goodHabits.filter((h) => !lowIds.has(h.id));
  }, [goodHabits, goodLowHabits]);
  const badLowParentIds = useMemo(
    () => new Set(badHabits.filter((h) => !h.parent_habit_id && h.is_low_frequency).map((h) => h.id)),
    [badHabits]
  );
  const badLowHabits = useMemo(
    () => badHabits.filter((h) => h.is_low_frequency || (h.parent_habit_id != null && badLowParentIds.has(h.parent_habit_id))),
    [badHabits, badLowParentIds]
  );
  const badHighHabits = useMemo(() => {
    const lowIds = new Set(badLowHabits.map((h) => h.id));
    return badHabits.filter((h) => !lowIds.has(h.id));
  }, [badHabits, badLowHabits]);
  const goodTree = useMemo(() => buildHabitTree(goodHighHabits), [goodHighHabits]);
  const goodLowTree = useMemo(() => buildHabitTree(goodLowHabits), [goodLowHabits]);
  const badTree = useMemo(() => buildHabitTree(badHighHabits), [badHighHabits]);
  const badLowTree = useMemo(() => buildHabitTree(badLowHabits), [badLowHabits]);
  const bonusTree = useMemo(() => buildHabitTree(bonusHabits), [bonusHabits]);

  // habit_logsを更新または作成（API経由でサーバー側認証を使用）
  const updateHabitLog = async (habitId: string, isChecked: boolean, count: number) => {
    if (isConfirmed) return;
    if (!dailyLogId) {
      toast.error('この日付の日誌がまだありません', {
        description: '日誌エリアで日付を選ぶか、今日の日付でチェックできます。',
      });
      return;
    }

    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const currentCount = habit.input_type === 'number' ? count : (isChecked ? 1 : 0);

    // 一時的な状態を先に更新（即座にUI反映）
    setLocalUpdates((prev) => {
      const newMap = new Map(prev);
      newMap.set(habitId, {
        checked: isChecked,
        count: currentCount,
      });
      return newMap;
    });

    try {
      const res = await fetch('/api/habit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dailyLogId,
          habitId,
          isChecked,
          count: currentCount,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        toast.error('ログインが必要です', {
          description: '再度ログインしてください',
        });
        setLocalUpdates((prev) => {
          const newMap = new Map(prev);
          newMap.delete(habitId);
          return newMap;
        });
        return;
      }

      if (!res.ok) {
        toast.error('習慣の更新に失敗しました', {
          description: (data?.error ?? data?.details) || 'しばらくしてからお試しください',
        });
        setLocalUpdates((prev) => {
          const newMap = new Map(prev);
          newMap.delete(habitId);
          return newMap;
        });
        return;
      }

      refreshQuiet();
    } catch (error) {
      console.error('習慣更新エラー:', error);
      setLocalUpdates((prev) => {
        const newMap = new Map(prev);
        newMap.delete(habitId);
        return newMap;
      });
      toast.error('習慣の更新に失敗しました', {
        description: error instanceof Error ? error.message : 'データベースエラーが発生しました',
      });
    }
  };

  // 週末除外トグル
  const toggleExcludeWeekends = async (habitId: string) => {
    if (isConfirmed) return;
    const habit = habitsWithLogs.find((h) => h.id === habitId);
    if (!habit) return;

    const next = !habit.exclude_weekends;
    try {
      const { error } = await supabase
        .from('habits')
        .update({ exclude_weekends: next })
        .eq('id', habitId);

      if (error) throw error;
      toast.success('変更しました');
      refreshQuiet();
    } catch (err) {
      toast.error('更新に失敗しました');
      console.error(err);
    }
  };

  // Comp対象外トグル
  const toggleExcludeFromComplete = async (habitId: string) => {
    if (isConfirmed) return;
    const habit = habitsWithLogs.find((h) => h.id === habitId);
    if (!habit) return;

    const next = !habit.exclude_from_complete;
    try {
      const { error } = await supabase
        .from('habits')
        .update({ exclude_from_complete: next })
        .eq('id', habitId);

      if (error) throw error;
      toast.success('変更しました');
      refreshQuiet();
    } catch (err) {
      toast.error('更新に失敗しました');
      console.error(err);
    }
  };

  // 低頻度トグル
  const toggleIsLowFrequency = async (habitId: string) => {
    const habit = habitsWithLogs.find((h) => h.id === habitId);
    if (!habit) return;

    const next = !habit.is_low_frequency;
    try {
      const { error } = await supabase
        .from('habits')
        .update({ is_low_frequency: next })
        .eq('id', habitId);

      if (error) throw error;
      toast.success('変更しました');
      refreshQuiet();
    } catch (err) {
      toast.error('更新に失敗しました');
      console.error(err);
    }
  };

  // 活性/非活性トグル
  const toggleIsActive = async (habitId: string) => {
    const habit = habitsWithLogs.find((h) => h.id === habitId);
    if (!habit) return;

    const next = habit.is_active !== false;
    try {
      const { error } = await supabase
        .from('habits')
        .update({ is_active: !next })
        .eq('id', habitId);

      if (error) throw error;
      toast.success('変更しました');
      refreshQuiet();
    } catch (err) {
      toast.error('更新に失敗しました');
      console.error(err);
    }
  };

  // チェックボックス切り替え
  const toggleCheck = async (habitId: string) => {
    const habit = habitsWithLogs.find((h) => h.id === habitId);
    if (!habit) return;

    const newChecked = !habit.checked;
    await updateHabitLog(habitId, newChecked, habit.count);
  };

  // 数値入力の変更
  const updateCount = async (habitId: string, newCount: number) => {
    if (isConfirmed) return;
    const habit = habitsWithLogs.find((h) => h.id === habitId);
    if (!habit) return;

    const count = Math.max(0, newCount);
    await updateHabitLog(habitId, habit.checked, count);
  };

  // ポイント計算（表示用）
  const calculatePoints = (habit: HabitWithLog) => {
    if (!habit.checked) return 0;
    // 悪習慣の場合はマイナス、良習慣・ボーナスはプラス
    if (habit.habit_type === 'bad') {
      // 週末除外が付いている習慣は、週末は減点表示しない（メモ仕様）
      if (habit.exclude_weekends && isWeekendOrHolidayToday) return 0;
      return -habit.points * habit.count;
    }
    return habit.points * habit.count;
  };

  // 習慣のゴルド・EXPの加減算設定値（表示用・ライン揃えのため g と exp を分離）
  const getHabitPointsExpParts = (habit: HabitWithLog): { g: string; body: number; mind: number; spirit: number } => {
    const sign = habit.habit_type === 'bad' ? -1 : 1;
    const g = `${habit.habit_type === 'bad' ? '-' : '+'} ${habit.points}G`;
    return {
      g,
      body: habit.exp_body > 0 ? habit.exp_body * sign : 0,
      mind: habit.exp_mind > 0 ? habit.exp_mind * sign : 0,
      spirit: habit.exp_spirit > 0 ? habit.exp_spirit * sign : 0,
    };
  };

  // チェック時に加算・減算されるゴルド・EXP（表示用・週末除外考慮）
  const getCheckTimeDeltaParts = (habit: HabitWithLog): { g: string; body: number; mind: number; spirit: number } => {
    if (!habit.checked) return { g: '', body: 0, mind: 0, spirit: 0 };
    const badWeekendExcluded = habit.habit_type === 'bad' && habit.exclude_weekends && isWeekendOrHolidayToday;
    if (badWeekendExcluded) return { g: '', body: 0, mind: 0, spirit: 0 };
    const sign = habit.habit_type === 'bad' ? -1 : 1;
    const gVal = habit.points * habit.count;
    const g = gVal !== 0 ? `${habit.habit_type === 'bad' ? '-' : '+'} ${gVal}G` : '';
    const body = habit.exp_body * habit.count * sign;
    const mind = habit.exp_mind * habit.count * sign;
    const spirit = habit.exp_spirit * habit.count * sign;
    return { g, body, mind, spirit };
  };

  // Completeボーナスのチェック状態を取得（親習慣の場合は親or子のいずれかで完了なら true）
  const completeBonus =
    bonusTree.length > 0
      ? isParentCompleted(bonusTree[0].parent, bonusTree[0].children)
      : false;

  // Completeボーナスの切り替え（親習慣の id で toggle）
  const toggleCompleteBonus = async () => {
    if (bonusTree.length > 0) {
      await toggleCheck(bonusTree[0].parent.id);
    }
  };

  // モーダルを開く
  const handleOpenModal = (habitType: 'good' | 'bad' | 'bonus' = 'good') => {
    setEditingHabit(null);
    const initial = {
      ...defaultFormData,
      habit_type: habitType,
    };
    setFormData(initial);
    setModalFormData(initial);
    setIsParentWithChildren(false);
    setModalChildRows([]);
    setIsModalOpen(true);
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingHabit(null);
    setIsParentWithChildren(false);
    setModalChildRows([]);
  };

  // ポイント設定をAIにおまかせ
  const handleAiSuggestPoints = async () => {
    const name = modalFormData.habit_name.trim();
    if (!name) {
      toast.error('習慣名を入力してからお試しください');
      return;
    }
    setAiSuggesting(true);
    try {
      const res = await fetch('/api/ai/habit-points-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habit_name: name,
          habit_type: modalFormData.habit_type,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? '提案の取得に失敗しました');
      }
      setModalFormData((prev) => ({
        ...prev,
        points: data.points ?? prev.points,
        exp_body: data.exp_body ?? prev.exp_body,
        exp_mind: data.exp_mind ?? prev.exp_mind,
        exp_spirit: data.exp_spirit ?? prev.exp_spirit,
      }));
      toast.success('ポイント・EXPを提案しました');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提案の取得に失敗しました');
    } finally {
      setAiSuggesting(false);
    }
  };

  // 習慣管理モーダルを開く
  const handleOpenManagementModal = () => {
    setIsManagementModalOpen(true);
  };

  // 習慣管理モーダルを閉じる
  const handleCloseManagementModal = () => {
    setIsManagementModalOpen(false);
    setEditingHabit(null);
  };

  // 習慣編集モーダルを開く
  const handleOpenEditModal = (habit: Habit) => {
    setEditingHabit(habit);
    const parentId = (habit as Habit & { parent_habit_id?: string | null }).parent_habit_id ?? '';
    const children = habits.filter((h) => (h as Habit & { parent_habit_id?: string | null }).parent_habit_id === habit.id);
    const hasChildren = children.length > 0;
    const initial = {
      habit_name: habit.habit_name,
      description: habit.description ?? '',
      note: habit.note ?? '',
      habit_type: habit.habit_type,
      points: habit.points,
      exp_body: habit.exp_body,
      exp_mind: habit.exp_mind,
      exp_spirit: habit.exp_spirit,
      input_type: habit.input_type,
      exclude_weekends: habit.exclude_weekends,
      exclude_from_complete: habit.exclude_from_complete,
      is_low_frequency: habit.is_low_frequency ?? false,
      parent_habit_id: parentId,
    };
    setFormData(initial);
    setModalFormData(initial);
    setIsParentWithChildren(hasChildren);
    setModalChildRows(
      hasChildren
        ? children.sort((a, b) => a.display_order - b.display_order).map((c) => ({
            id: c.id,
            habit_name: c.habit_name,
            description: c.description ?? '',
            points: c.points,
            exp_body: c.exp_body,
            exp_mind: c.exp_mind,
            exp_spirit: c.exp_spirit,
          }))
        : []
    );
    setIsManagementModalOpen(false);
    setIsModalOpen(true);
  };

  // 習慣を更新
  const handleUpdateHabit = async () => {
    if (!modalFormData.habit_name.trim() || !editingHabit) {
      toast.error('習慣名を入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('habits')
        .update({
          habit_name: modalFormData.habit_name.trim(),
          description: modalFormData.description.trim() || null,
          note: modalFormData.note.trim() || null,
          habit_type: modalFormData.habit_type,
          points: modalFormData.points,
          exp_body: modalFormData.exp_body,
          exp_mind: modalFormData.exp_mind,
          exp_spirit: modalFormData.exp_spirit,
          input_type: 'checkbox',
          exclude_weekends: modalFormData.exclude_weekends,
          exclude_from_complete: modalFormData.exclude_from_complete,
          is_low_frequency: modalFormData.is_low_frequency,
          parent_habit_id: modalFormData.parent_habit_id || null,
        })
        .eq('id', editingHabit.id);

      if (error) {
        console.error('習慣更新エラー:', error);
        toast.error('習慣の更新に失敗しました', {
          description: error.message || 'データベースエラーが発生しました',
        });
        return;
      }

      toast.success('習慣を更新しました');
      handleCloseModal();
      refreshQuiet();
    } catch (err) {
      console.error('予期しないエラー:', err);
      toast.error('エラーが発生しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 習慣を削除
  const handleDeleteHabit = async (habit: Habit) => {
    if (!window.confirm(`「${habit.habit_name}」を削除してもよろしいですか？`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', habit.id);

      if (error) {
        console.error('習慣削除エラー:', error);
        toast.error('習慣の削除に失敗しました', {
          description: error.message || 'データベースエラーが発生しました',
        });
        return;
      }

      toast.success('習慣を削除しました');
      refreshQuiet();
    } catch (err) {
      console.error('予期しないエラー:', err);
      toast.error('エラーが発生しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    }
  };

  // 習慣の並び替え（上に移動）。親を動かすと子も一緒に移動する。
  const handleMoveUp = async (habit: Habit) => {
    const groups = buildManagementGroups(habits, habit.habit_type);
    const groupIndex = groups.findIndex((g) => g.root.id === habit.id || g.habits.some((h) => h.id === habit.id));
    if (groupIndex <= 0) return;

    const reordered = [...groups];
    [reordered[groupIndex - 1], reordered[groupIndex]] = [reordered[groupIndex], reordered[groupIndex - 1]];
    const flat = reordered.flatMap((g) => g.habits);
    const updates = flat.map((h, i) => ({ id: h.id, display_order: i }));

    try {
      await Promise.all(
        updates.map((u) => supabase.from('habits').update({ display_order: u.display_order }).eq('id', u.id))
      );
      toast.success('習慣の順序を変更しました');
      refreshQuiet();
    } catch (err) {
      console.error('並び替えエラー:', err);
      toast.error('並び替えに失敗しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    }
  };

  // 習慣の並び替え（下に移動）。親を動かすと子も一緒に移動する。
  const handleMoveDown = async (habit: Habit) => {
    const groups = buildManagementGroups(habits, habit.habit_type);
    const groupIndex = groups.findIndex((g) => g.root.id === habit.id || g.habits.some((h) => h.id === habit.id));
    if (groupIndex < 0 || groupIndex >= groups.length - 1) return;

    const reordered = [...groups];
    [reordered[groupIndex], reordered[groupIndex + 1]] = [reordered[groupIndex + 1], reordered[groupIndex]];
    const flat = reordered.flatMap((g) => g.habits);
    const updates = flat.map((h, i) => ({ id: h.id, display_order: i }));

    try {
      await Promise.all(
        updates.map((u) => supabase.from('habits').update({ display_order: u.display_order }).eq('id', u.id))
      );
      toast.success('習慣の順序を変更しました');
      refreshQuiet();
    } catch (err) {
      console.error('並び替えエラー:', err);
      toast.error('並び替えに失敗しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    }
  };

  // D&D並び替えハンドラー（管理モーダル内・親グループ単位）
  const handleManagementDragEnd = async (event: DragEndEvent, habitType: 'good' | 'bad' | 'bonus') => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const groups = buildManagementGroups(habits, habitType);
    const oldIndex = groups.findIndex((g) => g.root.id === active.id);
    const newIndex = groups.findIndex((g) => g.root.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(groups, oldIndex, newIndex);
    const flat = reordered.flatMap((g) => g.habits);
    try {
      await Promise.all(
        flat.map((h, i) => supabase.from('habits').update({ display_order: i }).eq('id', h.id))
      );
      toast.success('習慣の順序を変更しました');
      refreshQuiet();
    } catch (err) {
      console.error('並び替えエラー:', err);
      toast.error('並び替えに失敗しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    }
  };

  // 子習慣1行を追加（モーダル内）
  const addModalChildRow = () => {
    setModalChildRows((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${prev.length}`,
        habit_name: '',
        description: '',
        points: 1,
        exp_body: 0,
        exp_mind: 0,
        exp_spirit: 0,
      },
    ]);
  };

  // 子習慣1行を削除（モーダル内。既存はAPIで削除はせず一覧から外すだけ。保存時にDELETEする）
  const removeModalChildRow = (id: string) => {
    setModalChildRows((prev) => prev.filter((r) => r.id !== id));
  };

  // 子習慣1行を更新（モーダル内）
  const updateModalChildRow = (id: string, patch: Partial<ChildHabitRow>) => {
    setModalChildRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  // 習慣を保存（新規作成または更新）
  const handleSaveHabit = async () => {
    if (!modalFormData.habit_name.trim()) {
      toast.error('習慣名を入力してください');
      return;
    }

    if (isParentWithChildren) {
      if (modalChildRows.length === 0) {
        toast.error('子習慣を1件以上追加してください');
        return;
      }
      for (const row of modalChildRows) {
        if (!row.habit_name.trim()) {
          toast.error('子習慣の名前を入力してください');
          return;
        }
        if (row.points < 0 || row.exp_body < 0 || row.exp_mind < 0 || row.exp_spirit < 0) {
          toast.error('子習慣のゴルド・EXPは0以上で入力してください');
          return;
        }
      }
    } else {
      const pointsLabel = modalFormData.habit_type === 'good' ? '加点ポイント' : modalFormData.habit_type === 'bad' ? '減点ポイント' : 'ボーナスポイント';
      const numericFields = [
        { label: pointsLabel, value: modalFormData.points },
        { label: '身体EXP', value: modalFormData.exp_body },
        { label: '頭脳EXP', value: modalFormData.exp_mind },
        { label: '精神EXP', value: modalFormData.exp_spirit },
      ];
      for (const f of numericFields) {
        if (Number.isNaN(f.value) || f.value < 0) {
          toast.error(`${f.label}は0以上の数値で入力してください`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      if (isParentWithChildren) {
        if (editingHabit) {
          const resParent = await fetch('/api/habits', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              habitId: editingHabit.id,
              habit_name: modalFormData.habit_name.trim(),
              description: modalFormData.description.trim() || null,
              note: modalFormData.note.trim() || null,
              habit_type: modalFormData.habit_type,
              points: 0,
              exp_body: 0,
              exp_mind: 0,
              exp_spirit: 0,
              input_type: 'checkbox',
              exclude_weekends: modalFormData.exclude_weekends,
              exclude_from_complete: modalFormData.exclude_from_complete,
              is_low_frequency: modalFormData.is_low_frequency,
              parent_habit_id: null,
            }),
          });
          if (!resParent.ok) {
            const data = await resParent.json().catch(() => ({}));
            throw new Error(data?.error ?? data?.details ?? '親習慣の更新に失敗しました');
          }
          const previousChildIds = habits.filter((h) => (h as Habit & { parent_habit_id?: string | null }).parent_habit_id === editingHabit.id).map((h) => h.id);
          const currentIds = modalChildRows.filter((r) => !r.id.startsWith('temp-')).map((r) => r.id);
          const toDelete = previousChildIds.filter((id) => !currentIds.includes(id));
          for (const id of toDelete) {
            await fetch(`/api/habits?id=${id}`, { method: 'DELETE', credentials: 'include' });
          }
          for (const row of modalChildRows) {
            if (row.id.startsWith('temp-')) {
              const res = await fetch('/api/habits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  habit_name: row.habit_name.trim(),
                  description: row.description?.trim() || null,
                  habit_type: modalFormData.habit_type,
                  points: row.points,
                  exp_body: row.exp_body,
                  exp_mind: row.exp_mind,
                  exp_spirit: row.exp_spirit,
                  input_type: 'checkbox',
                  exclude_weekends: false,
                  exclude_from_complete: false,
                  is_low_frequency: false,
                  parent_habit_id: editingHabit.id,
                }),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error ?? data?.details ?? '子習慣の追加に失敗しました');
              }
            } else {
              const res = await fetch('/api/habits', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  habitId: row.id,
                  habit_name: row.habit_name.trim(),
                  description: row.description?.trim() || null,
                  habit_type: modalFormData.habit_type,
                  points: row.points,
                  exp_body: row.exp_body,
                  exp_mind: row.exp_mind,
                  exp_spirit: row.exp_spirit,
                  input_type: 'checkbox',
                  exclude_weekends: false,
                  exclude_from_complete: false,
                  is_low_frequency: false,
                  parent_habit_id: editingHabit.id,
                }),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error ?? data?.details ?? '子習慣の更新に失敗しました');
              }
            }
          }
          toast.success('習慣を更新しました');
        } else {
          const resParent = await fetch('/api/habits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              habit_name: modalFormData.habit_name.trim(),
              description: modalFormData.description.trim() || null,
              note: modalFormData.note.trim() || null,
              habit_type: modalFormData.habit_type,
              points: 0,
              exp_body: 0,
              exp_mind: 0,
              exp_spirit: 0,
              input_type: 'checkbox',
              exclude_weekends: modalFormData.exclude_weekends,
              exclude_from_complete: modalFormData.exclude_from_complete,
              is_low_frequency: modalFormData.is_low_frequency,
              parent_habit_id: null,
            }),
          });
          if (!resParent.ok) {
            const data = await resParent.json().catch(() => ({}));
            throw new Error(data?.error ?? data?.details ?? '親習慣の作成に失敗しました');
          }
          const parentData = await resParent.json().catch(() => ({}));
          const parentId = parentData?.habit?.id;
          if (!parentId) throw new Error('親習慣のIDを取得できませんでした');
          for (const row of modalChildRows) {
            const res = await fetch('/api/habits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                habit_name: row.habit_name.trim(),
                description: row.description?.trim() || null,
                habit_type: modalFormData.habit_type,
                points: row.points,
                exp_body: row.exp_body,
                exp_mind: row.exp_mind,
                exp_spirit: row.exp_spirit,
                input_type: 'checkbox',
                exclude_weekends: false,
                exclude_from_complete: false,
                is_low_frequency: false,
                parent_habit_id: parentId,
              }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data?.error ?? data?.details ?? '子習慣の追加に失敗しました');
            }
          }
          toast.success('習慣を作成しました');
        }
      } else if (editingHabit) {
        const res = await fetch('/api/habits', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            habitId: editingHabit.id,
            habit_name: modalFormData.habit_name.trim(),
            description: modalFormData.description.trim() || null,
            note: modalFormData.note.trim() || null,
            habit_type: modalFormData.habit_type,
            points: modalFormData.points,
            exp_body: modalFormData.exp_body,
            exp_mind: modalFormData.exp_mind,
            exp_spirit: modalFormData.exp_spirit,
            input_type: 'checkbox',
            exclude_weekends: modalFormData.exclude_weekends,
            exclude_from_complete: modalFormData.exclude_from_complete,
            is_low_frequency: modalFormData.is_low_frequency,
            parent_habit_id: modalFormData.parent_habit_id || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          toast.error('ログインが必要です', { description: '再度ログインしてください' });
          return;
        }
        if (!res.ok) {
          toast.error('習慣の更新に失敗しました', { description: (data?.error ?? data?.details) || 'しばらくしてからお試しください' });
          return;
        }
        toast.success('習慣を更新しました');
      } else {
        const res = await fetch('/api/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            habit_name: modalFormData.habit_name.trim(),
            description: modalFormData.description.trim() || null,
            note: modalFormData.note.trim() || null,
            habit_type: modalFormData.habit_type,
            points: modalFormData.points,
            exp_body: modalFormData.exp_body,
            exp_mind: modalFormData.exp_mind,
            exp_spirit: modalFormData.exp_spirit,
            input_type: 'checkbox',
            exclude_weekends: modalFormData.exclude_weekends,
            exclude_from_complete: modalFormData.exclude_from_complete,
            is_low_frequency: modalFormData.is_low_frequency,
            parent_habit_id: modalFormData.parent_habit_id || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          toast.error('ログインが必要です', { description: '再度ログインしてください' });
          return;
        }
        if (!res.ok) {
          toast.error('習慣の作成に失敗しました', { description: (data?.error ?? data?.details) || 'しばらくしてからお試しください' });
          return;
        }
        toast.success('習慣を作成しました');
      }

      handleCloseModal();
      refreshQuiet();
    } catch (err) {
      console.error('予期しないエラー:', err);
      toast.error('エラーが発生しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      {/* 良習慣実行 */}
      <div>
        <button
          onClick={() => setIsGoodHabitsExpanded(!isGoodHabitsExpanded)}
          className="w-full text-left mb-2 sm:mb-3 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
          aria-expanded={isGoodHabitsExpanded}
          aria-controls="good-habits-content"
        >
          <h3 className="text-base sm:text-lg font-semibold text-zinc-300 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-cyan-400 shrink-0" aria-hidden />
            良習慣
            <span className="text-sm text-zinc-500 font-normal">({goodHabits.length}件)</span>
            {goodLowHabits.length > 0 && (
              <span className="text-xs text-zinc-600 font-normal">低頻度 {goodLowHabits.length}件含む</span>
            )}
          </h3>
          {isGoodHabitsExpanded ? (
            <ChevronUp className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          )}
        </button>
        {isGoodHabitsExpanded && (
          <FormCard id="good-habits-content" className="p-3 sm:p-4 overflow-hidden">
          <div className="space-y-3 w-full min-w-0 overflow-x-auto pl-3 pt-3">
          {goodTree.map(({ parent, children }) => {
            const parentChecked = isParentCompleted(parent, children);
            const hasChildren = children.length > 0;
            return (
              <div key={parent.id} className="space-y-1">
                {/* 親習慣行：子がいる場合は「親」ラベル（チェックなし） */}
                {hasChildren ? (
                  <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-base w-full min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs px-2 py-0.5 bg-cyan-900/50 text-cyan-300 rounded shrink-0">親</span>
                      <span className="text-[calc(1em-2px)] text-zinc-400 truncate min-w-0" title={[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜') || undefined}>
                        {[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜')}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2 shrink-0 min-w-[41rem]">
                      <div className="w-16" />
                      <div className="flex items-baseline gap-1 text-sm text-zinc-100 whitespace-nowrap w-[14rem] min-w-[14rem]">
                        <span className="text-zinc-500">ー</span>
                      </div>
                      <div className="flex items-center shrink-0 ml-3">
                        <div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleExcludeWeekends(parent.id); }}
                            disabled={isConfirmed}
                            title="土日祝は任意（進捗に影響しません）"
                            className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            週末除外
                          </button>
                        </div>
                        <div className="w-[5.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleExcludeFromComplete(parent.id); }}
                            disabled={isConfirmed}
                            title="Completeボーナス対象外"
                            className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            Comp対象外
                          </button>
                        </div>
                      </div>
                      <div className="w-[13rem] min-w-[13rem]" />
                    </div>
                  </div>
                ) : (
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-base w-full">
                  <button
                    id={`habit-${parent.id}`}
                    onClick={() => !isConfirmed && toggleCheck(parent.id)}
                    onKeyDown={(e) => {
                      if (isConfirmed) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleCheck(parent.id);
                      }
                    }}
                    aria-label={`${parent.habit_name}を${parentChecked ? '未完了' : '完了'}にする`}
                    aria-checked={parentChecked}
                    aria-disabled={isConfirmed}
                    role="checkbox"
                    tabIndex={isConfirmed ? -1 : 0}
                    disabled={isConfirmed}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                      parentChecked
                        ? 'bg-cyan-500 border-cyan-500'
                        : 'bg-transparent border-zinc-600 hover:border-zinc-400'
                    } ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {parentChecked && (
                      <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </button>
                  <label
                    htmlFor={`habit-${parent.id}`}
                    className={`block text-[calc(1em-2px)] truncate min-w-0 ${isConfirmed ? 'cursor-default text-zinc-500' : 'cursor-pointer'} ${parentChecked ? 'text-zinc-100' : 'text-zinc-400'}`}
                    title={[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜') || undefined}
                  >
                    {[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜')}
                  </label>
                  <div className="flex items-center justify-end gap-2 shrink-0 min-w-[42rem]">
                    <div className="w-16" />
                    <div className="flex items-baseline gap-1 text-sm text-zinc-100 flex-wrap w-[14rem] min-w-[14rem]" title="ゴルド・EXPの加減算設定">
                      <span className="w-9 text-right shrink-0">{getHabitPointsExpParts(parent).g}</span>
                      {(getHabitPointsExpParts(parent).body !== 0 || getHabitPointsExpParts(parent).mind !== 0 || getHabitPointsExpParts(parent).spirit !== 0) && (
                        <>
                          <span className="shrink-0">｜</span>
                          <ExpWithIcons body={getHabitPointsExpParts(parent).body} mind={getHabitPointsExpParts(parent).mind} spirit={getHabitPointsExpParts(parent).spirit} signed />
                        </>
                      )}
                    </div>
                    <div className="flex items-center shrink-0 ml-3">
                      <div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleExcludeWeekends(parent.id); }}
                          disabled={isConfirmed}
                          title="土日祝は任意（進捗に影響しません）"
                          className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          週末除外
                        </button>
                      </div>
                      <div className="w-[5.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleExcludeFromComplete(parent.id); }}
                          disabled={isConfirmed}
                          title="Completeボーナス対象外"
                          className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          Comp対象外
                        </button>
                      </div>
                    </div>
                    <div className={`flex items-baseline gap-1 text-[17px] font-bold whitespace-nowrap w-[13rem] min-w-[13rem] justify-end shrink-0 text-cyan-400`} title="チェック時に加算・減算される数値">
                      {(() => {
                        const { g, body, mind, spirit } = getCheckTimeDeltaParts({ ...parent, checked: parentChecked });
                        const hasExp = body !== 0 || mind !== 0 || spirit !== 0;
                        if (!g && !hasExp) return null;
                        return (
                          <>
                            {g && <span className="shrink-0">{g}</span>}
                            {g && hasExp && <span className="shrink-0">｜</span>}
                            {hasExp && <ExpWithIcons body={body} mind={mind} spirit={spirit} signed />}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                )}
                {/* 子習慣行（インデント・チェックあり） */}
                {children.map((child) => (
                  <div key={child.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-base w-full pl-6">
                    <button
                      id={`habit-${child.id}`}
                      onClick={() => !isConfirmed && toggleCheck(child.id)}
                      onKeyDown={(e) => {
                        if (isConfirmed) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleCheck(child.id);
                        }
                      }}
                      aria-label={`${child.habit_name}を${child.checked ? '未完了' : '完了'}にする`}
                      aria-checked={child.checked}
                      aria-disabled={isConfirmed}
                      role="checkbox"
                      tabIndex={isConfirmed ? -1 : 0}
                      disabled={isConfirmed}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                        child.checked ? 'bg-cyan-500 border-cyan-500' : 'bg-transparent border-zinc-600 hover:border-zinc-400'
                      } ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {child.checked && (
                        <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </button>
                    <label
                      htmlFor={`habit-${child.id}`}
                      className={`block text-[calc(1em-2px)] truncate min-w-0 ${isConfirmed ? 'cursor-default text-zinc-500' : 'cursor-pointer'} ${child.checked ? 'text-zinc-100' : 'text-zinc-400'}`}
                    >
                      {[child.habit_name, child.description?.trim()].filter(Boolean).join('｜')}
                    </label>
                    <div className="flex items-center justify-end gap-2 shrink-0 min-w-[42rem]">
                      <div className="w-16" />
                      <div className="flex items-baseline gap-1 text-sm text-zinc-100 flex-wrap w-[14rem] min-w-[14rem]" title="ゴルド・EXPの加減算設定">
                        <span className="w-9 text-right shrink-0">{getHabitPointsExpParts(child).g}</span>
                        {(getHabitPointsExpParts(child).body !== 0 || getHabitPointsExpParts(child).mind !== 0 || getHabitPointsExpParts(child).spirit !== 0) && (
                          <>
                            <span className="shrink-0">｜</span>
                            <ExpWithIcons body={getHabitPointsExpParts(child).body} mind={getHabitPointsExpParts(child).mind} spirit={getHabitPointsExpParts(child).spirit} signed />
                          </>
                        )}
                      </div>
                      <div className="flex items-center shrink-0 ml-3">
                        <div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleExcludeWeekends(child.id); }}
                            disabled={isConfirmed}
                            title="土日祝は任意（進捗に影響しません）"
                            className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${child.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            週末除外
                          </button>
                        </div>
                        <div className="w-[5.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleExcludeFromComplete(child.id); }}
                            disabled={isConfirmed}
                            title="Completeボーナス対象外"
                            className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${child.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            Comp対象外
                          </button>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1 text-[17px] font-bold whitespace-nowrap w-[13rem] min-w-[13rem] justify-end shrink-0 text-cyan-400" title="チェック時に加算・減算される数値">
                        {(() => {
                          const { g, body, mind, spirit } = getCheckTimeDeltaParts(child);
                          const hasExp = body !== 0 || mind !== 0 || spirit !== 0;
                          if (!g && !hasExp) return null;
                          return (
                            <>
                              {g && <span className="shrink-0">{g}</span>}
                              {g && hasExp && <span className="shrink-0">｜</span>}
                              {hasExp && <ExpWithIcons body={body} mind={mind} spirit={spirit} signed />}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* 低頻度エリア（良習慣） */}
          {goodLowTree.length > 0 && (
            <div className="mt-3 border-t border-zinc-700">
              <button
                type="button"
                onClick={() => setIsGoodLowFreqExpanded(!isGoodLowFreqExpanded)}
                className="w-full text-left py-2 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
                aria-expanded={isGoodLowFreqExpanded}
              >
                <span className="text-sm text-zinc-500 flex items-center gap-1">
                  <ChevronDown className={`w-4 h-4 transition-transform ${isGoodLowFreqExpanded ? 'rotate-180' : ''}`} />
                  低頻度 ({goodLowHabits.length}件)
                </span>
              </button>
              {isGoodLowFreqExpanded && (
                <div className="space-y-3 w-full min-w-0 overflow-x-auto pl-3 pt-3">
                  {goodLowTree.map(({ parent, children }) => {
                    const parentChecked = isParentCompleted(parent, children);
                    const hasChildren = children.length > 0;
                    return (
                      <div key={parent.id} className="space-y-1">
                        {/* 親習慣行：子がいる場合は「親」ラベル（チェックなし） */}
                        {hasChildren ? (
                          <>
                            <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-base w-full min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs px-2 py-0.5 bg-cyan-900/50 text-cyan-300 rounded shrink-0">親</span>
                                <span className="text-[calc(1em-2px)] text-zinc-400 truncate min-w-0" title={[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜') || undefined}>
                                  {[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜')}
                                </span>
                                <button
                                  type="button"
                                  className="sm:hidden shrink-0 p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                                  onClick={() => setExpandedHabitId(expandedHabitId === parent.id ? null : parent.id)}
                                  aria-label="詳細を表示"
                                  aria-expanded={expandedHabitId === parent.id}
                                >
                                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedHabitId === parent.id ? 'rotate-180' : ''}`} />
                                </button>
                              </div>
                              <div className="hidden sm:flex items-center justify-end gap-2 shrink-0 min-w-[41rem]">
                                <div className="w-16" />
                                <div className="flex items-baseline gap-1 text-sm text-zinc-100 whitespace-nowrap w-[14rem] min-w-[14rem]">
                                  <span className="text-zinc-500">ー</span>
                                </div>
                                <div className="flex items-center shrink-0 ml-3">
                                  <div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleExcludeWeekends(parent.id); }} disabled={isConfirmed} title="土日祝は任意（進捗に影響しません）" className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}>週末除外</button>
                                  </div>
                                  <div className="w-[5.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleExcludeFromComplete(parent.id); }} disabled={isConfirmed} title="Completeボーナス対象外" className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}>Comp対象外</button>
                                  </div>
                                </div>
                                <div className="w-[13rem] min-w-[13rem]" />
                              </div>
                            </div>
                            {expandedHabitId === parent.id && (
                              <div className="sm:hidden pl-3 pb-2">
                                <HabitMobileDetail habit={parent} isConfirmed={isConfirmed} onToggleExcludeWeekends={toggleExcludeWeekends} onToggleExcludeFromComplete={toggleExcludeFromComplete} />
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-base w-full">
                              <button
                                id={`habit-${parent.id}`}
                                onClick={() => !isConfirmed && toggleCheck(parent.id)}
                                onKeyDown={(e) => { if (isConfirmed) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCheck(parent.id); } }}
                                aria-label={`${parent.habit_name}を${parentChecked ? '未完了' : '完了'}にする`}
                                aria-checked={parentChecked}
                                aria-disabled={isConfirmed}
                                role="checkbox"
                                tabIndex={isConfirmed ? -1 : 0}
                                disabled={isConfirmed}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${parentChecked ? 'bg-cyan-500 border-cyan-500' : 'bg-transparent border-zinc-600 hover:border-zinc-400'} ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                {parentChecked && <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path d="M5 13l4 4L19 7"></path></svg>}
                              </button>
                              <label htmlFor={`habit-${parent.id}`} className={`block text-[calc(1em-2px)] truncate min-w-0 ${isConfirmed ? 'cursor-default text-zinc-500' : 'cursor-pointer'} ${parentChecked ? 'text-zinc-100' : 'text-zinc-400'}`} title={[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜') || undefined}>
                                {[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜')}
                              </label>
                              <div className="flex items-center gap-1">
                                <div className="hidden sm:flex items-center justify-end gap-2 shrink-0 min-w-[42rem]">
                                  <div className="w-16" />
                                  <div className="flex items-baseline gap-1 text-sm text-zinc-100 flex-wrap w-[14rem] min-w-[14rem]" title="ゴルド・EXPの加減算設定">
                                    <span className="w-9 text-right shrink-0">{getHabitPointsExpParts(parent).g}</span>
                                    {(getHabitPointsExpParts(parent).body !== 0 || getHabitPointsExpParts(parent).mind !== 0 || getHabitPointsExpParts(parent).spirit !== 0) && (<><span className="shrink-0">｜</span><ExpWithIcons body={getHabitPointsExpParts(parent).body} mind={getHabitPointsExpParts(parent).mind} spirit={getHabitPointsExpParts(parent).spirit} signed /></>)}
                                  </div>
                                  <div className="flex items-center shrink-0 ml-3">
                                    <div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                                      <button type="button" onClick={(e) => { e.stopPropagation(); toggleExcludeWeekends(parent.id); }} disabled={isConfirmed} title="土日祝は任意（進捗に影響しません）" className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}>週末除外</button>
                                    </div>
                                    <div className="w-[5.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                                      <button type="button" onClick={(e) => { e.stopPropagation(); toggleExcludeFromComplete(parent.id); }} disabled={isConfirmed} title="Completeボーナス対象外" className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}>Comp対象外</button>
                                    </div>
                                  </div>
                                  <div className="flex items-baseline gap-1 text-[17px] font-bold whitespace-nowrap w-[13rem] min-w-[13rem] justify-end shrink-0 text-cyan-400" title="チェック時に加算・減算される数値">
                                    {(() => { const { g, body, mind, spirit } = getCheckTimeDeltaParts({ ...parent, checked: parentChecked }); const hasExp = body !== 0 || mind !== 0 || spirit !== 0; if (!g && !hasExp) return null; return (<>{g && <span className="shrink-0">{g}</span>}{g && hasExp && <span className="shrink-0">｜</span>}{hasExp && <ExpWithIcons body={body} mind={mind} spirit={spirit} signed />}</>); })()}
                                  </div>
                                </div>
                                <button type="button" className="sm:hidden p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors" onClick={() => setExpandedHabitId(expandedHabitId === parent.id ? null : parent.id)} aria-label="詳細を表示" aria-expanded={expandedHabitId === parent.id}>
                                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedHabitId === parent.id ? 'rotate-180' : ''}`} />
                                </button>
                              </div>
                            </div>
                            {expandedHabitId === parent.id && (
                              <div className="sm:hidden pl-7 pb-2">
                                <HabitMobileDetail habit={parent} isConfirmed={isConfirmed} onToggleExcludeWeekends={toggleExcludeWeekends} onToggleExcludeFromComplete={toggleExcludeFromComplete} />
                              </div>
                            )}
                          </>
                        )}
                        {/* 子習慣行 */}
                        {children.map((child) => (
                          <React.Fragment key={child.id}>
                            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-base w-full pl-6">
                              <button
                                id={`habit-${child.id}`}
                                onClick={() => !isConfirmed && toggleCheck(child.id)}
                                onKeyDown={(e) => { if (isConfirmed) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCheck(child.id); } }}
                                aria-label={`${child.habit_name}を${child.checked ? '未完了' : '完了'}にする`}
                                aria-checked={child.checked}
                                aria-disabled={isConfirmed}
                                role="checkbox"
                                tabIndex={isConfirmed ? -1 : 0}
                                disabled={isConfirmed}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${child.checked ? 'bg-cyan-500 border-cyan-500' : 'bg-transparent border-zinc-600 hover:border-zinc-400'} ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                {child.checked && <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path d="M5 13l4 4L19 7"></path></svg>}
                              </button>
                              <label htmlFor={`habit-${child.id}`} className={`block text-[calc(1em-2px)] truncate min-w-0 ${isConfirmed ? 'cursor-default text-zinc-500' : 'cursor-pointer'} ${child.checked ? 'text-zinc-100' : 'text-zinc-400'}`}>
                                {[child.habit_name, child.description?.trim()].filter(Boolean).join('｜')}
                              </label>
                              <div className="flex items-center gap-1">
                                <div className="hidden sm:flex items-center justify-end gap-2 shrink-0 min-w-[42rem]">
                                  <div className="w-16" />
                                  <div className="flex items-baseline gap-1 text-sm text-zinc-100 flex-wrap w-[14rem] min-w-[14rem]" title="ゴルド・EXPの加減算設定">
                                    <span className="w-9 text-right shrink-0">{getHabitPointsExpParts(child).g}</span>
                                    {(getHabitPointsExpParts(child).body !== 0 || getHabitPointsExpParts(child).mind !== 0 || getHabitPointsExpParts(child).spirit !== 0) && (<><span className="shrink-0">｜</span><ExpWithIcons body={getHabitPointsExpParts(child).body} mind={getHabitPointsExpParts(child).mind} spirit={getHabitPointsExpParts(child).spirit} signed /></>)}
                                  </div>
                                  <div className="flex items-center shrink-0 ml-3">
                                    <div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                                      <button type="button" onClick={(e) => { e.stopPropagation(); toggleExcludeWeekends(child.id); }} disabled={isConfirmed} title="土日祝は任意（進捗に影響しません）" className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${child.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}>週末除外</button>
                                    </div>
                                    <div className="w-[5.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                                      <button type="button" onClick={(e) => { e.stopPropagation(); toggleExcludeFromComplete(child.id); }} disabled={isConfirmed} title="Completeボーナス対象外" className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${child.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}>Comp対象外</button>
                                    </div>
                                  </div>
                                  <div className="flex items-baseline gap-1 text-[17px] font-bold whitespace-nowrap w-[13rem] min-w-[13rem] justify-end shrink-0 text-cyan-400" title="チェック時に加算・減算される数値">
                                    {(() => { const { g, body, mind, spirit } = getCheckTimeDeltaParts(child); const hasExp = body !== 0 || mind !== 0 || spirit !== 0; if (!g && !hasExp) return null; return (<>{g && <span className="shrink-0">{g}</span>}{g && hasExp && <span className="shrink-0">｜</span>}{hasExp && <ExpWithIcons body={body} mind={mind} spirit={spirit} signed />}</>); })()}
                                  </div>
                                </div>
                                <button type="button" className="sm:hidden p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors" onClick={() => setExpandedHabitId(expandedHabitId === child.id ? null : child.id)} aria-label="詳細を表示" aria-expanded={expandedHabitId === child.id}>
                                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedHabitId === child.id ? 'rotate-180' : ''}`} />
                                </button>
                              </div>
                            </div>
                            {expandedHabitId === child.id && (
                              <div className="sm:hidden pl-11 pb-2">
                                <HabitMobileDetail habit={child} isConfirmed={isConfirmed} onToggleExcludeWeekends={toggleExcludeWeekends} onToggleExcludeFromComplete={toggleExcludeFromComplete} />
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ボタン */}
          <div className="flex items-center justify-end gap-3 pt-2 mt-3 border-t border-zinc-800">
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleOpenModal('good')}
              variant="ghost"
              size="sm"
              aria-label="新しい良習慣を追加する"
              className="text-base text-cyan-400 hover:text-cyan-300 h-auto p-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              [+ 良習慣を追加]
            </Button>
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleOpenManagementModal}
              variant="ghost"
              size="sm"
              aria-label="習慣を管理する"
              className="text-base text-zinc-300 hover:text-zinc-200 h-auto p-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              <Settings className="w-4 h-4 mr-1" />
              習慣を管理
            </Button>
          </div>
          </div>
          </FormCard>
        )}
      </div>

      {/* 悪習慣 */}
      <div>
        <button
          onClick={() => setIsBadHabitsExpanded(!isBadHabitsExpanded)}
          className="w-full text-left mb-2 sm:mb-3 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
          aria-expanded={isBadHabitsExpanded}
          aria-controls="bad-habits-content"
        >
          <h3 className="text-base sm:text-lg font-semibold text-zinc-200 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" aria-hidden />
            悪習慣
            <span className="text-sm text-zinc-500 font-normal">({badHabits.length}件)</span>
          </h3>
          {isBadHabitsExpanded ? (
            <ChevronUp className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          )}
        </button>
        {isBadHabitsExpanded && (
          <FormCard id="bad-habits-content" className="p-3 sm:p-4 overflow-hidden">
          <div className="space-y-3 w-full min-w-0 overflow-x-auto pl-3 pt-3">
          {badTree.map(({ parent, children }) => {
            const parentChecked = isParentCompleted(parent, children);
            const hasChildren = children.length > 0;
            return (
              <div key={parent.id} className="space-y-1">
                {hasChildren ? (
                  <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-base w-full min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs px-2 py-0.5 bg-cyan-900/50 text-cyan-300 rounded shrink-0">親</span>
                      <span className="text-[calc(1em-2px)] text-zinc-400 truncate min-w-0" title={[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜') || undefined}>
                        {[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜')}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2 shrink-0 min-w-[41rem]">
                      <div className="w-16" />
                      <div className="flex items-baseline gap-1 text-sm text-zinc-100 whitespace-nowrap w-[14rem] min-w-[14rem]">
                        <span className="text-zinc-500">ー</span>
                      </div>
                      <div className="flex items-center shrink-0 ml-3">
                        <div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleExcludeWeekends(parent.id); }}
                            disabled={isConfirmed}
                            title="土日祝は任意（進捗に影響しません）"
                            className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            週末除外
                          </button>
                        </div>
                        <div className="w-[5.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleExcludeFromComplete(parent.id); }}
                            disabled={isConfirmed}
                            title="Completeボーナス対象外"
                            className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            Comp対象外
                          </button>
                        </div>
                      </div>
                      <div className="w-[13rem] min-w-[13rem]" />
                    </div>
                  </div>
                ) : (
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-base w-full">
                  <button
                    id={`habit-${parent.id}`}
                    onClick={() => !isConfirmed && toggleCheck(parent.id)}
                    onKeyDown={(e) => {
                      if (isConfirmed) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleCheck(parent.id);
                      }
                    }}
                    aria-label={`${parent.habit_name}を${parentChecked ? '未完了' : '完了'}にする`}
                    aria-checked={parentChecked}
                    aria-disabled={isConfirmed}
                    role="checkbox"
                    tabIndex={isConfirmed ? -1 : 0}
                    disabled={isConfirmed}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                      parentChecked ? 'bg-cyan-500 border-cyan-500' : 'bg-transparent border-zinc-600 hover:border-zinc-400'
                    } ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {parentChecked && (
                      <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </button>
                  <label
                    htmlFor={`habit-${parent.id}`}
                    className={`block text-[calc(1em-2px)] cursor-pointer truncate min-w-0 ${parentChecked ? 'text-zinc-100' : 'text-zinc-400'}`}
                    title={[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜') || undefined}
                  >
                    {[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜')}
                  </label>
                  <div className="flex items-center justify-end gap-2 shrink-0 min-w-[42rem]">
                    <div className="w-16" />
                    <div className="flex items-baseline gap-1 text-sm text-zinc-100 flex-wrap w-[14rem] min-w-[14rem]" title="ゴルド・EXPの加減算設定">
                      <span className="w-9 text-right shrink-0">{getHabitPointsExpParts(parent).g}</span>
                      {(getHabitPointsExpParts(parent).body !== 0 || getHabitPointsExpParts(parent).mind !== 0 || getHabitPointsExpParts(parent).spirit !== 0) && (
                        <>
                          <span className="shrink-0">｜</span>
                          <ExpWithIcons body={getHabitPointsExpParts(parent).body} mind={getHabitPointsExpParts(parent).mind} spirit={getHabitPointsExpParts(parent).spirit} signed />
                        </>
                      )}
                    </div>
                    <div className="flex items-center shrink-0 ml-3">
                      <div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleExcludeWeekends(parent.id); }}
                          disabled={isConfirmed}
                          title="土日祝は任意（進捗に影響しません）"
                          className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          週末除外
                        </button>
                      </div>
                      <div className="w-[5.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleExcludeFromComplete(parent.id); }}
                          disabled={isConfirmed}
                          title="Completeボーナス対象外"
                          className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          Comp対象外
                        </button>
                      </div>
                    </div>
                    <div className={`flex items-baseline gap-1 text-[17px] font-bold whitespace-nowrap w-[13rem] min-w-[13rem] justify-end shrink-0 ${parentChecked ? 'text-red-400' : 'text-cyan-400'}`} title="チェック時に加算・減算される数値">
                      {(() => {
                        const { g, body, mind, spirit } = getCheckTimeDeltaParts({ ...parent, checked: parentChecked });
                        const hasExp = body !== 0 || mind !== 0 || spirit !== 0;
                        if (!g && !hasExp) return null;
                        return (
                          <>
                            {g && <span className="shrink-0">{g}</span>}
                            {g && hasExp && <span className="shrink-0">｜</span>}
                            {hasExp && <ExpWithIcons body={body} mind={mind} spirit={spirit} signed />}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                )}
                {children.map((child) => (
                  <div key={child.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-base w-full pl-6">
                    <button
                      id={`habit-${child.id}`}
                      onClick={() => !isConfirmed && toggleCheck(child.id)}
                      onKeyDown={(e) => {
                        if (isConfirmed) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleCheck(child.id);
                        }
                      }}
                      aria-label={`${child.habit_name}を${child.checked ? '未完了' : '完了'}にする`}
                      aria-checked={child.checked}
                      aria-disabled={isConfirmed}
                      role="checkbox"
                      tabIndex={isConfirmed ? -1 : 0}
                      disabled={isConfirmed}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                        child.checked ? 'bg-cyan-500 border-cyan-500' : 'bg-transparent border-zinc-600 hover:border-zinc-400'
                      } ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {child.checked && (
                        <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </button>
                    <label
                      htmlFor={`habit-${child.id}`}
                      className={`block text-[calc(1em-2px)] cursor-pointer truncate min-w-0 ${child.checked ? 'text-zinc-100' : 'text-zinc-400'}`}
                      title={[child.habit_name, child.description?.trim()].filter(Boolean).join('｜') || undefined}
                    >
                      {[child.habit_name, child.description?.trim()].filter(Boolean).join('｜')}
                    </label>
                    <div className="flex items-center justify-end gap-2 shrink-0 min-w-[42rem]">
                      <div className="w-16" />
                      <div className="flex items-baseline gap-1 text-sm text-zinc-100 flex-wrap w-[14rem] min-w-[14rem]" title="ゴルド・EXPの加減算設定">
                        <span className="w-9 text-right shrink-0">{getHabitPointsExpParts(child).g}</span>
                        {(getHabitPointsExpParts(child).body !== 0 || getHabitPointsExpParts(child).mind !== 0 || getHabitPointsExpParts(child).spirit !== 0) && (
                          <>
                            <span className="shrink-0">｜</span>
                            <ExpWithIcons body={getHabitPointsExpParts(child).body} mind={getHabitPointsExpParts(child).mind} spirit={getHabitPointsExpParts(child).spirit} signed />
                          </>
                        )}
                      </div>
                      <div className="flex items-center shrink-0 ml-3">
                        <div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleExcludeWeekends(child.id); }}
                            disabled={isConfirmed}
                            title="土日祝は任意（進捗に影響しません）"
                            className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${child.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            週末除外
                          </button>
                        </div>
                        <div className="w-[5.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleExcludeFromComplete(child.id); }}
                            disabled={isConfirmed}
                            title="Completeボーナス対象外"
                            className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${child.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            Comp対象外
                          </button>
                        </div>
                      </div>
                      <div className={`flex items-baseline gap-1 text-[17px] font-bold whitespace-nowrap w-[13rem] min-w-[13rem] justify-end shrink-0 ${child.checked ? 'text-red-400' : 'text-cyan-400'}`} title="チェック時に加算・減算される数値">
                        {(() => {
                          const { g, body, mind, spirit } = getCheckTimeDeltaParts(child);
                          const hasExp = body !== 0 || mind !== 0 || spirit !== 0;
                          if (!g && !hasExp) return null;
                          return (
                            <>
                              {g && <span className="shrink-0">{g}</span>}
                              {g && hasExp && <span className="shrink-0">｜</span>}
                              {hasExp && <ExpWithIcons body={body} mind={mind} spirit={spirit} signed />}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* 低頻度エリア（悪習慣） */}
          {badLowTree.length > 0 && (
            <div className="mt-3 border-t border-zinc-700">
              <button
                type="button"
                onClick={() => setIsBadLowFreqExpanded(!isBadLowFreqExpanded)}
                className="w-full text-left py-2 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
                aria-expanded={isBadLowFreqExpanded}
              >
                <span className="text-sm text-zinc-500 flex items-center gap-1">
                  <ChevronDown className={`w-4 h-4 transition-transform ${isBadLowFreqExpanded ? 'rotate-180' : ''}`} />
                  低頻度 ({badLowHabits.length}件)
                </span>
              </button>
              {isBadLowFreqExpanded && (
                <div className="space-y-3 w-full min-w-0 overflow-x-auto pl-3 pt-3">
                  {badLowTree.map(({ parent, children }) => {
                    const parentChecked = isParentCompleted(parent, children);
                    const hasChildren = children.length > 0;
                    return (
                      <div key={parent.id} className="space-y-1">
                        {/* 親習慣行：子がいる場合は「親」ラベル（チェックなし） */}
                        {hasChildren ? (
                          <>
                            <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-base w-full min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs px-2 py-0.5 bg-cyan-900/50 text-cyan-300 rounded shrink-0">親</span>
                                <span className="text-[calc(1em-2px)] text-zinc-400 truncate min-w-0" title={[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜') || undefined}>
                                  {[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜')}
                                </span>
                                <button type="button" className="sm:hidden shrink-0 p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors" onClick={() => setExpandedHabitId(expandedHabitId === parent.id ? null : parent.id)} aria-label="詳細を表示" aria-expanded={expandedHabitId === parent.id}>
                                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedHabitId === parent.id ? 'rotate-180' : ''}`} />
                                </button>
                              </div>
                              <div className="hidden sm:flex items-center justify-end gap-2 shrink-0 min-w-[41rem]">
                                <div className="w-16" />
                                <div className="flex items-baseline gap-1 text-sm text-zinc-100 whitespace-nowrap w-[14rem] min-w-[14rem]">
                                  <span className="text-zinc-500">ー</span>
                                </div>
                                <div className="flex items-center shrink-0 ml-3">
                                  <div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleExcludeWeekends(parent.id); }} disabled={isConfirmed} title="土日祝は任意（進捗に影響しません）" className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}>週末除外</button>
                                  </div>
                                  <div className="w-[5.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleExcludeFromComplete(parent.id); }} disabled={isConfirmed} title="Completeボーナス対象外" className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}>Comp対象外</button>
                                  </div>
                                </div>
                                <div className="w-[13rem] min-w-[13rem]" />
                              </div>
                            </div>
                            {expandedHabitId === parent.id && (
                              <div className="sm:hidden pl-3 pb-2">
                                <HabitMobileDetail habit={parent} isConfirmed={isConfirmed} onToggleExcludeWeekends={toggleExcludeWeekends} onToggleExcludeFromComplete={toggleExcludeFromComplete} />
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-base w-full">
                              <button
                                id={`habit-${parent.id}`}
                                onClick={() => !isConfirmed && toggleCheck(parent.id)}
                                onKeyDown={(e) => { if (isConfirmed) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCheck(parent.id); } }}
                                aria-label={`${parent.habit_name}を${parentChecked ? '未完了' : '完了'}にする`}
                                aria-checked={parentChecked}
                                aria-disabled={isConfirmed}
                                role="checkbox"
                                tabIndex={isConfirmed ? -1 : 0}
                                disabled={isConfirmed}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${parentChecked ? 'bg-red-500 border-red-500' : 'bg-transparent border-zinc-600 hover:border-zinc-400'} ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                {parentChecked && <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path d="M5 13l4 4L19 7"></path></svg>}
                              </button>
                              <label htmlFor={`habit-${parent.id}`} className={`block text-[calc(1em-2px)] truncate min-w-0 ${isConfirmed ? 'cursor-default text-zinc-500' : 'cursor-pointer'} ${parentChecked ? 'text-zinc-100' : 'text-zinc-400'}`} title={[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜') || undefined}>
                                {[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜')}
                              </label>
                              <div className="flex items-center gap-1">
                                <div className="hidden sm:flex items-center justify-end gap-2 shrink-0 min-w-[42rem]">
                                  <div className="w-16" />
                                  <div className="flex items-baseline gap-1 text-sm text-zinc-100 flex-wrap w-[14rem] min-w-[14rem]" title="ゴルド・EXPの加減算設定">
                                    <span className="w-9 text-right shrink-0">{getHabitPointsExpParts(parent).g}</span>
                                    {(getHabitPointsExpParts(parent).body !== 0 || getHabitPointsExpParts(parent).mind !== 0 || getHabitPointsExpParts(parent).spirit !== 0) && (<><span className="shrink-0">｜</span><ExpWithIcons body={getHabitPointsExpParts(parent).body} mind={getHabitPointsExpParts(parent).mind} spirit={getHabitPointsExpParts(parent).spirit} signed /></>)}
                                  </div>
                                  <div className="flex items-center shrink-0 ml-3">
                                    <div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                                      <button type="button" onClick={(e) => { e.stopPropagation(); toggleExcludeWeekends(parent.id); }} disabled={isConfirmed} title="土日祝は任意（進捗に影響しません）" className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}>週末除外</button>
                                    </div>
                                    <div className="w-[5.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                                      <button type="button" onClick={(e) => { e.stopPropagation(); toggleExcludeFromComplete(parent.id); }} disabled={isConfirmed} title="Completeボーナス対象外" className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}>Comp対象外</button>
                                    </div>
                                  </div>
                                  <div className={`flex items-baseline gap-1 text-[17px] font-bold whitespace-nowrap w-[13rem] min-w-[13rem] justify-end shrink-0 ${parentChecked ? 'text-red-400' : 'text-cyan-400'}`} title="チェック時に加算・減算される数値">
                                    {(() => { const { g, body, mind, spirit } = getCheckTimeDeltaParts({ ...parent, checked: parentChecked }); const hasExp = body !== 0 || mind !== 0 || spirit !== 0; if (!g && !hasExp) return null; return (<>{g && <span className="shrink-0">{g}</span>}{g && hasExp && <span className="shrink-0">｜</span>}{hasExp && <ExpWithIcons body={body} mind={mind} spirit={spirit} signed />}</>); })()}
                                  </div>
                                </div>
                                <button type="button" className="sm:hidden p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors" onClick={() => setExpandedHabitId(expandedHabitId === parent.id ? null : parent.id)} aria-label="詳細を表示" aria-expanded={expandedHabitId === parent.id}>
                                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedHabitId === parent.id ? 'rotate-180' : ''}`} />
                                </button>
                              </div>
                            </div>
                            {expandedHabitId === parent.id && (
                              <div className="sm:hidden pl-7 pb-2">
                                <HabitMobileDetail habit={parent} isConfirmed={isConfirmed} onToggleExcludeWeekends={toggleExcludeWeekends} onToggleExcludeFromComplete={toggleExcludeFromComplete} />
                              </div>
                            )}
                          </>
                        )}
                        {/* 子習慣行 */}
                        {children.map((child) => (
                          <React.Fragment key={child.id}>
                            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-base w-full pl-6">
                              <button
                                id={`habit-${child.id}`}
                                onClick={() => !isConfirmed && toggleCheck(child.id)}
                                onKeyDown={(e) => { if (isConfirmed) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCheck(child.id); } }}
                                aria-label={`${child.habit_name}を${child.checked ? '未完了' : '完了'}にする`}
                                aria-checked={child.checked}
                                aria-disabled={isConfirmed}
                                role="checkbox"
                                tabIndex={isConfirmed ? -1 : 0}
                                disabled={isConfirmed}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${child.checked ? 'bg-red-500 border-red-500' : 'bg-transparent border-zinc-600 hover:border-zinc-400'} ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                {child.checked && <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path d="M5 13l4 4L19 7"></path></svg>}
                              </button>
                              <label htmlFor={`habit-${child.id}`} className={`block text-[calc(1em-2px)] truncate min-w-0 ${isConfirmed ? 'cursor-default text-zinc-500' : 'cursor-pointer'} ${child.checked ? 'text-zinc-100' : 'text-zinc-400'}`}>
                                {[child.habit_name, child.description?.trim()].filter(Boolean).join('｜')}
                              </label>
                              <div className="flex items-center gap-1">
                                <div className="hidden sm:flex items-center justify-end gap-2 shrink-0 min-w-[42rem]">
                                  <div className="w-16" />
                                  <div className="flex items-baseline gap-1 text-sm text-zinc-100 flex-wrap w-[14rem] min-w-[14rem]" title="ゴルド・EXPの加減算設定">
                                    <span className="w-9 text-right shrink-0">{getHabitPointsExpParts(child).g}</span>
                                    {(getHabitPointsExpParts(child).body !== 0 || getHabitPointsExpParts(child).mind !== 0 || getHabitPointsExpParts(child).spirit !== 0) && (<><span className="shrink-0">｜</span><ExpWithIcons body={getHabitPointsExpParts(child).body} mind={getHabitPointsExpParts(child).mind} spirit={getHabitPointsExpParts(child).spirit} signed /></>)}
                                  </div>
                                  <div className="flex items-center shrink-0 ml-3">
                                    <div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                                      <button type="button" onClick={(e) => { e.stopPropagation(); toggleExcludeWeekends(child.id); }} disabled={isConfirmed} title="土日祝は任意（進捗に影響しません）" className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${child.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}>週末除外</button>
                                    </div>
                                    <div className="w-[5.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                                      <button type="button" onClick={(e) => { e.stopPropagation(); toggleExcludeFromComplete(child.id); }} disabled={isConfirmed} title="Completeボーナス対象外" className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${child.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}>Comp対象外</button>
                                    </div>
                                  </div>
                                  <div className={`flex items-baseline gap-1 text-[17px] font-bold whitespace-nowrap w-[13rem] min-w-[13rem] justify-end shrink-0 ${child.checked ? 'text-red-400' : 'text-cyan-400'}`} title="チェック時に加算・減算される数値">
                                    {(() => { const { g, body, mind, spirit } = getCheckTimeDeltaParts(child); const hasExp = body !== 0 || mind !== 0 || spirit !== 0; if (!g && !hasExp) return null; return (<>{g && <span className="shrink-0">{g}</span>}{g && hasExp && <span className="shrink-0">｜</span>}{hasExp && <ExpWithIcons body={body} mind={mind} spirit={spirit} signed />}</>); })()}
                                  </div>
                                </div>
                                <button type="button" className="sm:hidden p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors" onClick={() => setExpandedHabitId(expandedHabitId === child.id ? null : child.id)} aria-label="詳細を表示" aria-expanded={expandedHabitId === child.id}>
                                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedHabitId === child.id ? 'rotate-180' : ''}`} />
                                </button>
                              </div>
                            </div>
                            {expandedHabitId === child.id && (
                              <div className="sm:hidden pl-11 pb-2">
                                <HabitMobileDetail habit={child} isConfirmed={isConfirmed} onToggleExcludeWeekends={toggleExcludeWeekends} onToggleExcludeFromComplete={toggleExcludeFromComplete} />
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ボタン */}
          <div className="flex items-center justify-end gap-3 pt-2 mt-3 border-t border-zinc-800">
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleOpenModal('bad')}
              variant="ghost"
              size="sm"
              aria-label="新しい悪習慣を追加する"
              className="text-base text-cyan-400 hover:text-cyan-300 h-auto p-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              [+ 悪習慣を追加]
            </Button>
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleOpenManagementModal}
              variant="ghost"
              size="sm"
              aria-label="習慣を管理する"
              className="text-base text-zinc-300 hover:text-zinc-200 h-auto p-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              <Settings className="w-4 h-4 mr-1" />
              習慣を管理
            </Button>
          </div>
          </div>
          </FormCard>
        )}
      </div>

      {/* ボーナス */}
      {bonusTree.length > 0 && (
        <div>
          <button
            onClick={() => setIsBonusExpanded(!isBonusExpanded)}
            className="w-full text-left mb-2 sm:mb-3 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
            aria-expanded={isBonusExpanded}
            aria-controls="bonus-content"
          >
            <h3 className="text-base sm:text-lg font-medium text-zinc-300">
              ボーナス
              <span className="text-sm text-zinc-500 font-normal ml-2">({bonusHabits.length}件)</span>
            </h3>
            {isBonusExpanded ? (
              <ChevronUp className="w-5 h-5 text-zinc-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            )}
          </button>
          {isBonusExpanded && (
            <FormCard id="bonus-content" className="p-3 sm:p-4">
            <div className="space-y-3 w-full min-w-0 overflow-x-auto pl-3 pt-3">
            {bonusTree.map(({ parent, children }) => {
              const parentChecked = isParentCompleted(parent, children);
              const isFirstBonus = bonusTree[0].parent.id === parent.id;
              const hasChildren = children.length > 0;
              return (
                <div key={parent.id} className="space-y-1">
                  {hasChildren ? (
                    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-base w-full min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs px-2 py-0.5 bg-cyan-900/50 text-cyan-300 rounded shrink-0">親</span>
                        <span className="text-[calc(1em-2px)] text-zinc-400 truncate min-w-0">
                          {[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜')}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2 shrink-0 min-w-[41rem]">
                        <div className="w-16" />
                        <div className="flex items-baseline gap-1 text-sm text-zinc-200 whitespace-nowrap w-[14rem] min-w-[14rem]">
                          <span className="text-zinc-500">ー</span>
                        </div>
                        <div className="flex items-center shrink-0 ml-3">
                          <div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleExcludeWeekends(parent.id); }}
                              disabled={isConfirmed}
                              title="土日祝は任意（進捗に影響しません）"
                              className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              週末除外
                            </button>
                          </div>
                          <div className="w-[5.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleExcludeFromComplete(parent.id); }}
                              disabled={isConfirmed}
                              title="Completeボーナス対象外"
                              className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              Comp対象外
                            </button>
                          </div>
                        </div>
                        <div className="w-[13rem] min-w-[13rem]" />
                      </div>
                    </div>
                  ) : (
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-base w-full">
                    <button
                      id={isFirstBonus ? `bonus-${parent.id}` : `habit-${parent.id}`}
                      onClick={() => !isConfirmed && (isFirstBonus ? toggleCompleteBonus() : toggleCheck(parent.id))}
                      onKeyDown={(e) => {
                        if (isConfirmed) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          isFirstBonus ? toggleCompleteBonus() : toggleCheck(parent.id);
                        }
                      }}
                      aria-label={`${parent.habit_name}を${parentChecked ? '未完了' : '完了'}にする`}
                      aria-checked={parentChecked}
                      aria-disabled={isConfirmed}
                      role="checkbox"
                      tabIndex={isConfirmed ? -1 : 0}
                      disabled={isConfirmed}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                        parentChecked ? 'bg-cyan-500 border-cyan-500' : 'bg-transparent border-zinc-600 hover:border-zinc-400'
                      } ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {parentChecked && (
                        <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </button>
                    <label
                      htmlFor={isFirstBonus ? `bonus-${parent.id}` : `habit-${parent.id}`}
                      className={`block text-[calc(1em-2px)] truncate min-w-0 ${isConfirmed ? 'cursor-default text-zinc-500' : 'cursor-pointer'} ${parentChecked ? 'text-zinc-100' : 'text-zinc-400'}`}
                      title={[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜') || undefined}
                    >
                      {[parent.habit_name, parent.description?.trim()].filter(Boolean).join('｜')}
                    </label>
                    <div className="flex items-center justify-end gap-2 shrink-0 min-w-[42rem]">
                      <div className="w-16" />
                      <div className="flex items-baseline gap-1 text-sm text-zinc-200 whitespace-nowrap w-[14rem] min-w-[14rem]" title="ゴルド・EXPの加減算設定">
                        <span className="w-9 text-right shrink-0">{getHabitPointsExpParts(parent).g}</span>
                        {(getHabitPointsExpParts(parent).body !== 0 || getHabitPointsExpParts(parent).mind !== 0 || getHabitPointsExpParts(parent).spirit !== 0) && (
                            <>
                              <span className="shrink-0">｜</span>
                              <span className="shrink-0">（</span>
                              <ExpWithIcons body={getHabitPointsExpParts(parent).body} mind={getHabitPointsExpParts(parent).mind} spirit={getHabitPointsExpParts(parent).spirit} signed />
                              <span className="shrink-0">）</span>
                            </>
                          )}
                      </div>
                      <div className="flex items-center shrink-0 ml-3">
                        <div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleExcludeWeekends(parent.id); }}
                            disabled={isConfirmed}
                            title="土日祝は任意（進捗に影響しません）"
                            className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            週末除外
                          </button>
                        </div>
                        <div className="w-[5.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleExcludeFromComplete(parent.id); }}
                            disabled={isConfirmed}
                            title="Completeボーナス対象外"
                            className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${parent.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            Comp対象外
                          </button>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1 text-[17px] font-bold whitespace-nowrap w-[13rem] min-w-[13rem] justify-end shrink-0 text-cyan-400" title="チェック時に加算・減算される数値">
                        {(() => {
                          const { g, body, mind, spirit } = getCheckTimeDeltaParts({ ...parent, checked: parentChecked });
                          const hasExp = body !== 0 || mind !== 0 || spirit !== 0;
                          if (!g && !hasExp) return null;
                          return (
                            <>
                              {g && <span className="shrink-0">{g}</span>}
                              {g && hasExp && <span className="shrink-0">｜</span>}
                              {hasExp && <ExpWithIcons body={body} mind={mind} spirit={spirit} signed />}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  )}
                  {children.map((child) => (
                    <div key={child.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-base w-full pl-6">
                      <button
                        id={`habit-${child.id}`}
                        onClick={() => !isConfirmed && toggleCheck(child.id)}
                        onKeyDown={(e) => {
                          if (isConfirmed) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleCheck(child.id);
                          }
                        }}
                        aria-label={`${child.habit_name}を${child.checked ? '未完了' : '完了'}にする`}
                        aria-checked={child.checked}
                        aria-disabled={isConfirmed}
                        role="checkbox"
                        tabIndex={isConfirmed ? -1 : 0}
                        disabled={isConfirmed}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                          child.checked ? 'bg-cyan-500 border-cyan-500' : 'bg-transparent border-zinc-600 hover:border-zinc-400'
                        } ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {child.checked && (
                          <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </button>
                      <label
                        htmlFor={`habit-${child.id}`}
                        className={`block text-[calc(1em-2px)] truncate min-w-0 ${isConfirmed ? 'cursor-default text-zinc-500' : 'cursor-pointer'} ${child.checked ? 'text-zinc-100' : 'text-zinc-400'}`}
                        title={[child.habit_name, child.description?.trim()].filter(Boolean).join('｜') || undefined}
                      >
                        {[child.habit_name, child.description?.trim()].filter(Boolean).join('｜')}
                      </label>
                      <div className="flex items-center justify-end gap-2 shrink-0 min-w-[42rem]">
                        <div className="w-16" />
                        <div className="flex items-baseline gap-1 text-sm text-zinc-100 flex-wrap w-[14rem] min-w-[14rem]" title="ゴルド・EXPの加減算設定">
                          <span className="shrink-0">（{getHabitPointsExpParts(parent).g}）</span>
                          {(getHabitPointsExpParts(parent).body !== 0 || getHabitPointsExpParts(parent).mind !== 0 || getHabitPointsExpParts(parent).spirit !== 0) && (
                            <>
                              <span className="shrink-0">｜</span>
                              <span className="shrink-0">（</span>
                              <ExpWithIcons body={getHabitPointsExpParts(parent).body} mind={getHabitPointsExpParts(parent).mind} spirit={getHabitPointsExpParts(parent).spirit} signed />
                              <span className="shrink-0">）</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center shrink-0 ml-3">
                          <div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleExcludeWeekends(child.id); }}
                              disabled={isConfirmed}
                              title="土日祝は任意（進捗に影響しません）"
                              className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${child.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              週末除外
                            </button>
                          </div>
                          <div className="w-[5.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleExcludeFromComplete(child.id); }}
                              disabled={isConfirmed}
                              title="Completeボーナス対象外"
                              className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${child.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              Comp対象外
                            </button>
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1 text-[17px] font-bold whitespace-nowrap w-[13rem] min-w-[13rem] justify-end shrink-0 text-cyan-400" title="チェック時に加算・減算される数値">
                          {(() => {
                            const { g, body, mind, spirit } = getCheckTimeDeltaParts(child);
                            const hasExp = body !== 0 || mind !== 0 || spirit !== 0;
                            if (!g && !hasExp) return null;
                            return (
                              <>
                                {g && <span className="shrink-0">{g}</span>}
                                {g && hasExp && <span className="shrink-0">｜</span>}
                                {hasExp && <ExpWithIcons body={body} mind={mind} spirit={spirit} signed />}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            </div>
            </FormCard>
          )}
        </div>
      )}

      {/* モーダル（習慣追加） */}
      <Modal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={
          editingHabit
            ? '習慣を編集'
            : modalFormData.habit_type === 'good'
              ? '良習慣を追加'
              : modalFormData.habit_type === 'bad'
                ? '悪習慣を追加'
                : 'ボーナスを追加'
        }
        description={editingHabit ? '習慣の内容を編集します' : '新しい習慣を追加して、日々の成長を記録しましょう'}
        footer={
          <>
            <Button
              onClick={handleSaveHabit}
              disabled={isSubmitting}
              aria-label={editingHabit ? '習慣を更新する' : '習慣を作成する'}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {isSubmitting ? (editingHabit ? '更新中...' : '作成中...') : (editingHabit ? '更新' : '作成')}
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
            {/* 習慣名 */}
            <FormInput
              id="habit_name"
              label="習慣名"
              required
              type="text"
              value={modalFormData.habit_name}
              onChange={(e) => setModalFormData((prev) => ({ ...prev, habit_name: e.target.value }))}
              placeholder="例: 筋トレ、早起き"
            />

            {/* 副見出し */}
            <div>
              <FormLabel htmlFor="habit_description" className="text-zinc-300">副見出し（任意）</FormLabel>
              <input
                id="habit_description"
                type="text"
                value={modalFormData.description}
                onChange={(e) => setModalFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="例: 胸と背中、朝6時"
                className="mt-2 w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* 説明 */}
            <div>
              <FormLabel htmlFor="habit_note" className="text-zinc-300">説明（任意）</FormLabel>
              <textarea
                id="habit_note"
                rows={3}
                value={modalFormData.note}
                onChange={(e) => setModalFormData((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="詳しい説明を記載してください。"
                className="mt-2 w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-y min-h-[80px]"
              />
            </div>

            {/* 親習慣（子習慣を設定する）スイッチ：ON だと親は見出しのみ・子だけチェック可能（ToDoのサブタスク風） */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isParentWithChildren}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setIsParentWithChildren(on);
                    if (on) {
                      setModalFormData((prev) => ({ ...prev, parent_habit_id: '' }));
                      if (modalChildRows.length === 0) addModalChildRow();
                    } else {
                      setModalChildRows([]);
                    }
                  }}
                  className="w-4 h-4 text-cyan-600 bg-zinc-800 border-zinc-700 rounded focus:ring-cyan-500"
                />
                <span className="text-zinc-300">親習慣にする（子習慣を設定する）</span>
              </label>
              <p className="text-xs text-zinc-400">
                ONにすると、親は見出しのみ表示され、子習慣だけチェックできます。各子習慣ごとにゴルド・EXPを設定できます。
              </p>
            </div>

            {/* 子習慣リスト（親習慣ありのときのみ。ToDoのサブタスク風） */}
            {isParentWithChildren && (
              <div className="space-y-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <FormLabel className="text-zinc-300">子習慣</FormLabel>
                <div className="space-y-2">
                  {modalChildRows.map((row) => (
                    <div
                      key={row.id}
                      className="space-y-2 p-2 bg-zinc-800 rounded border border-zinc-700"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          type="text"
                          value={row.habit_name}
                          onChange={(e) => updateModalChildRow(row.id, { habit_name: e.target.value })}
                          placeholder="子習慣名"
                          className="flex-1 min-w-[8rem] bg-zinc-900 border-zinc-700 text-zinc-100 text-sm"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-zinc-500 shrink-0">G</span>
                          <Input
                            type="number"
                            min={0}
                            value={row.points}
                            onChange={(e) => updateModalChildRow(row.id, { points: parseInt(e.target.value) || 0 })}
                            className="w-14 bg-zinc-900 border-zinc-700 text-zinc-100 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-exp-body shrink-0">身体</span>
                          <Input
                            type="number"
                            min={0}
                            value={row.exp_body}
                            onChange={(e) => updateModalChildRow(row.id, { exp_body: parseInt(e.target.value) || 0 })}
                            className="w-12 bg-zinc-900 border-zinc-700 text-zinc-100 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-exp-intelligence shrink-0">頭脳</span>
                          <Input
                            type="number"
                            min={0}
                            value={row.exp_mind}
                            onChange={(e) => updateModalChildRow(row.id, { exp_mind: parseInt(e.target.value) || 0 })}
                            className="w-12 bg-zinc-900 border-zinc-700 text-zinc-100 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-exp-mind shrink-0">精神</span>
                          <Input
                            type="number"
                            min={0}
                            value={row.exp_spirit}
                            onChange={(e) => updateModalChildRow(row.id, { exp_spirit: parseInt(e.target.value) || 0 })}
                            className="w-12 bg-zinc-900 border-zinc-700 text-zinc-100 text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeModalChildRow(row.id)}
                          className="text-xs text-red-400 hover:text-red-300 shrink-0 h-auto py-1"
                        >
                          削除
                        </Button>
                      </div>
                      <textarea
                        value={row.description}
                        onChange={(e) => updateModalChildRow(row.id, { description: e.target.value })}
                        placeholder="副見出し（任意）"
                        rows={2}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y min-h-[4rem]"
                      />
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addModalChildRow}
                  className="bg-zinc-800 border-zinc-600 text-cyan-400 hover:bg-zinc-700"
                >
                  + 子習慣を追加
                </Button>
              </div>
            )}

            {/* 入力タイプは当面チェックリストのみのため選択肢なし（常に checkbox） */}

            {/* ポイント・EXP（子習慣ありのときは親にはつけないので非表示） */}
            {!isParentWithChildren && (
            <>
            {/* ポイント設定をAIにおまかせ */}
            <div className="mb-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAiSuggestPoints}
                disabled={aiSuggesting || !modalFormData.habit_name.trim()}
                className="gap-2 bg-zinc-800/50 border-zinc-600 text-cyan-400 hover:bg-zinc-700 hover:text-cyan-300"
                aria-label="習慣名からポイント・EXPをAIに提案してもらう"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                {aiSuggesting ? '提案中...' : 'ポイント設定をAIにおまかせ'}
              </Button>
              <p className="text-xs text-zinc-400 mt-2">
                習慣名と種類から、ポイント・EXPを提案します。反映後も編集できます。
              </p>
              <ul className="text-xs text-zinc-400 mt-1 list-disc list-inside space-y-0.5">
                <li>良習慣はゴルド +1・EXPは、身体/頭脳/精神のどれかを +1。</li>
                <li>悪習慣はゴルド -1・EXPは、身体/頭脳/精神のどれかを -1。</li>
                <li>習慣名から、どの属性値に振るか判断します。</li>
              </ul>
            </div>

            {/* ポイント（種類に応じたラベル：加点/減点/ボーナス） */}
            <div>
              <FormLabel htmlFor="points">
                {modalFormData.habit_type === 'good' ? '加点ポイント（ゴルド）' : modalFormData.habit_type === 'bad' ? '減点ポイント（ゴルド）' : 'ボーナスポイント（ゴルド）'}
              </FormLabel>
              <input
                id="points"
                type="number"
                min="0"
                value={modalFormData.points}
                onChange={(e) => setModalFormData((prev) => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                className="mt-2 w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* 報酬設定（EXP） */}
            <FormCard variant="nested" className="p-4 space-y-3">
              <h4 className="text-base font-medium text-yellow-400 mb-3">EXP設定</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInputSmall
                  id="exp_body"
                  label="身体EXP"
                  labelClassName="text-exp-body"
                  type="number"
                  min="0"
                  value={modalFormData.exp_body}
                  onChange={(e) => setModalFormData((prev) => ({ ...prev, exp_body: parseInt(e.target.value) || 0 }))}
                />
                <FormInputSmall
                  id="exp_mind"
                  label="頭脳EXP"
                  labelClassName="text-exp-intelligence"
                  type="number"
                  min="0"
                  value={modalFormData.exp_mind}
                  onChange={(e) => setModalFormData((prev) => ({ ...prev, exp_mind: parseInt(e.target.value) || 0 }))}
                />
                <FormInputSmall
                  id="exp_spirit"
                  label="精神EXP"
                  labelClassName="text-exp-mind"
                  type="number"
                  min="0"
                  value={modalFormData.exp_spirit}
                  onChange={(e) => setModalFormData((prev) => ({ ...prev, exp_spirit: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </FormCard>
            </>
            )}

            {/* オプション設定 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="exclude_weekends"
                  checked={modalFormData.exclude_weekends}
                  onChange={(e) => setModalFormData((prev) => ({ ...prev, exclude_weekends: e.target.checked }))}
                  className="w-4 h-4 text-cyan-600 bg-zinc-800 border-zinc-700 rounded focus:ring-cyan-500"
                />
                <Label htmlFor="exclude_weekends" className="text-base text-zinc-300 cursor-pointer">
                  週末を除外する
                </Label>
              </div>
              <p className="text-xs mt-0.5 text-zinc-300">
                {modalFormData.habit_type === 'bad' ? (
                  <>
                    ユーザーの任意で、週末はマストではない悪習慣に設定します。
                    <br />
                    ONの場合、週末にチェックが入ったとしても減点されることはありません。
                  </>
                ) : (
                  <>
                    ユーザーの任意で、週末はマスト実行ではない良習慣に設定します。
                    <br />
                    ONの場合でも、週末に実行することも可能でポイントも加算されます。
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="exclude_from_complete"
                  checked={modalFormData.exclude_from_complete}
                  onChange={(e) => setModalFormData((prev) => ({ ...prev, exclude_from_complete: e.target.checked }))}
                  className="w-4 h-4 text-cyan-600 bg-zinc-800 border-zinc-700 rounded focus:ring-cyan-500"
                />
                <Label htmlFor="exclude_from_complete" className="text-base text-zinc-300 cursor-pointer">
                  Completeボーナス対象外にする
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="habit_is_low_frequency"
                  checked={modalFormData.is_low_frequency}
                  disabled={!!modalFormData.parent_habit_id}
                  onChange={(e) => setModalFormData((prev) => ({ ...prev, is_low_frequency: e.target.checked }))}
                  className="w-4 h-4 text-cyan-600 bg-zinc-800 border-zinc-700 rounded focus:ring-cyan-500 disabled:opacity-30"
                />
                <Label htmlFor="habit_is_low_frequency" className="text-base text-zinc-300 cursor-pointer">
                  低頻度エリアに表示する（日誌で折りたたみ）
                </Label>
              </div>
              <p className="text-xs mt-0.5 text-zinc-400">
                ONにすると、この習慣は日誌の「低頻度」折りたたみブロックにまとめて表示されます。親習慣をONにした場合、子習慣も同じブロックに含まれます。
              </p>
              {modalFormData.parent_habit_id ? (
                <p className="text-xs mt-1 text-zinc-500">
                  子習慣は単独で低頻度にできません。親習慣側で設定してください。
                </p>
              ) : null}
            </div>

      </Modal>

      {/* 習慣管理モーダル */}
      <Modal
        open={isManagementModalOpen}
        onOpenChange={setIsManagementModalOpen}
        title="習慣を管理"
        description="習慣の編集・削除・並び替え、および低頻度ゾーンへの出し分けができます。一覧の「高頻度／低頻度」ボタン、または各習慣の「編集」から設定を変更できます。"
        maxWidth="2xl"
      >
        <div className="space-y-6">
          <p className="text-sm text-zinc-400 rounded-lg border border-zinc-700 bg-zinc-900/40 px-3 py-2">
            <span className="text-zinc-200 font-medium">低頻度ゾーン：</span>
            各行の <span className="text-yellow-400">低頻度</span> / <span className="text-zinc-500">高頻度</span> は、日誌画面の折りたたみエリアへの振り分けです（編集モーダル内のチェックと同じ設定）。
          </p>
          {/* 良習慣（D&Dと↑↓で並び替え） */}
          <div>
            <h4 className="text-base font-medium text-cyan-400 mb-3">良習慣</h4>
            <DndContext sensors={sensors} onDragEnd={(e) => handleManagementDragEnd(e, 'good')}>
              <SortableContext items={buildManagementGroups(habits, 'good').map((g) => g.root.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {buildManagementGroups(habits, 'good').map((group, groupIndex, arr) => (
                    <SortableManagementGroup key={group.root.id} id={group.root.id}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-base text-zinc-500 w-8">{groupIndex + 1}</span>
                            <span className="flex-1 text-base text-zinc-100">{[group.root.habit_name, group.root.description?.trim()].filter(Boolean).join('｜')}</span>
                            {group.habits.length > 1 && <span className="text-xs px-2 py-0.5 bg-cyan-900/50 text-cyan-300 rounded">親</span>}
                            <span className="text-base text-zinc-400">
                              {group.habits.length > 1 ? 'ー' : `${group.root.points}G / ${group.root.exp_body + group.root.exp_mind + group.root.exp_spirit}ex`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button onClick={() => handleMoveUp(group.root)} variant="ghost" size="sm" disabled={groupIndex === 0} aria-label={`${group.root.habit_name}を上に移動する`} className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300">↑</Button>
                            <Button onClick={() => handleMoveDown(group.root)} variant="ghost" size="sm" disabled={groupIndex === arr.length - 1} aria-label={`${group.root.habit_name}を下に移動する`} className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300">↓</Button>
                            <button type="button" onClick={() => toggleIsLowFrequency(group.root.id)} title={group.root.is_low_frequency ? '低頻度（クリックで解除）' : '高頻度（クリックで低頻度に）'} className={`text-xs px-2 py-0.5 rounded h-7 transition-colors cursor-pointer ${group.root.is_low_frequency ? 'text-yellow-400 bg-yellow-900/40 hover:bg-yellow-900/60' : 'text-zinc-400 bg-zinc-700 hover:bg-zinc-600'}`}>{group.root.is_low_frequency ? '低頻度' : '高頻度'}</button>
                            <button type="button" onClick={() => toggleIsActive(group.root.id)} title={group.root.is_active !== false ? '活性中（クリックで非活性）' : '非活性（クリックで活性）'} className={`text-xs px-2 py-0.5 rounded h-7 transition-colors cursor-pointer ${group.root.is_active !== false ? 'text-green-400 bg-green-900/40 hover:bg-green-900/60' : 'text-red-400 bg-red-900/30 hover:bg-red-900/50'}`}>{group.root.is_active !== false ? '活性' : '非活性'}</button>
                            <Button onClick={() => handleOpenEditModal(group.root)} variant="ghost" size="sm" aria-label={`${group.root.habit_name}を編集する`} className="h-7 px-2 text-base text-cyan-400 hover:text-cyan-300">編集</Button>
                            {group.root.is_custom && <Button onClick={() => handleDeleteHabit(group.root)} variant="ghost" size="sm" aria-label={`${group.root.habit_name}を削除する`} className="h-7 px-2 text-base text-red-400 hover:text-red-300">削除</Button>}
                          </div>
                        </div>
                        {group.habits.slice(1).map((child) => (
                          <div key={child.id} className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded-lg ml-6">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-base text-zinc-500 w-8" aria-hidden>-</span>
                              <span className="flex-1 text-base text-zinc-100">{[child.habit_name, child.description?.trim()].filter(Boolean).join('｜')}</span>
                              <span className="text-base text-zinc-400">{child.points}G / {child.exp_body + child.exp_mind + child.exp_spirit}ex</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled
                                title="子習慣は単独で低頻度にできません（親習慣側で設定）"
                                className="text-xs px-2 py-0.5 rounded h-7 transition-colors text-zinc-500/40 bg-zinc-800/30 border border-zinc-700/40 cursor-not-allowed opacity-60"
                              >
                                {child.is_low_frequency ? '低頻度' : '高頻度'}
                              </button>
                              <button type="button" onClick={() => toggleIsActive(child.id)} title={child.is_active !== false ? '活性中（クリックで非活性）' : '非活性（クリックで活性）'} className={`text-xs px-2 py-0.5 rounded h-7 transition-colors cursor-pointer ${child.is_active !== false ? 'text-green-400 bg-green-900/40 hover:bg-green-900/60' : 'text-red-400 bg-red-900/30 hover:bg-red-900/50'}`}>{child.is_active !== false ? '活性' : '非活性'}</button>
                              <Button onClick={() => handleOpenEditModal(child)} variant="ghost" size="sm" aria-label={`${child.habit_name}を編集する`} className="h-7 px-2 text-base text-cyan-400 hover:text-cyan-300">編集</Button>
                              {child.is_custom && <Button onClick={() => handleDeleteHabit(child)} variant="ghost" size="sm" aria-label={`${child.habit_name}を削除する`} className="h-7 px-2 text-base text-red-400 hover:text-red-300">削除</Button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </SortableManagementGroup>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* 悪習慣 */}
          <div>
            <h4 className="text-base font-medium text-red-400 mb-3">悪習慣</h4>
            <DndContext sensors={sensors} onDragEnd={(e) => handleManagementDragEnd(e, 'bad')}>
              <SortableContext items={buildManagementGroups(habits, 'bad').map((g) => g.root.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {buildManagementGroups(habits, 'bad').map((group, groupIndex, arr) => (
                    <SortableManagementGroup key={group.root.id} id={group.root.id}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-base text-zinc-500 w-8">{groupIndex + 1}</span>
                            <span className="flex-1 text-base text-zinc-100">{[group.root.habit_name, group.root.description?.trim()].filter(Boolean).join('｜')}</span>
                            {group.habits.length > 1 && <span className="text-xs px-2 py-0.5 bg-cyan-900/50 text-cyan-300 rounded">親</span>}
                            <span className="text-base text-zinc-400">
                              {group.habits.length > 1 ? 'ー' : `${group.root.points}G / ${group.root.exp_body + group.root.exp_mind + group.root.exp_spirit}ex`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button onClick={() => handleMoveUp(group.root)} variant="ghost" size="sm" disabled={groupIndex === 0} aria-label={`${group.root.habit_name}を上に移動する`} className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300">↑</Button>
                            <Button onClick={() => handleMoveDown(group.root)} variant="ghost" size="sm" disabled={groupIndex === arr.length - 1} aria-label={`${group.root.habit_name}を下に移動する`} className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300">↓</Button>
                            <button type="button" onClick={() => toggleIsLowFrequency(group.root.id)} title={group.root.is_low_frequency ? '低頻度（クリックで解除）' : '高頻度（クリックで低頻度に）'} className={`text-xs px-2 py-0.5 rounded h-7 transition-colors cursor-pointer ${group.root.is_low_frequency ? 'text-yellow-400 bg-yellow-900/40 hover:bg-yellow-900/60' : 'text-zinc-400 bg-zinc-700 hover:bg-zinc-600'}`}>{group.root.is_low_frequency ? '低頻度' : '高頻度'}</button>
                            <button type="button" onClick={() => toggleIsActive(group.root.id)} title={group.root.is_active !== false ? '活性中（クリックで非活性）' : '非活性（クリックで活性）'} className={`text-xs px-2 py-0.5 rounded h-7 transition-colors cursor-pointer ${group.root.is_active !== false ? 'text-green-400 bg-green-900/40 hover:bg-green-900/60' : 'text-red-400 bg-red-900/30 hover:bg-red-900/50'}`}>{group.root.is_active !== false ? '活性' : '非活性'}</button>
                            <Button onClick={() => handleOpenEditModal(group.root)} variant="ghost" size="sm" aria-label={`${group.root.habit_name}を編集する`} className="h-7 px-2 text-base text-cyan-400 hover:text-cyan-300">編集</Button>
                            {group.root.is_custom && <Button onClick={() => handleDeleteHabit(group.root)} variant="ghost" size="sm" aria-label={`${group.root.habit_name}を削除する`} className="h-7 px-2 text-base text-red-400 hover:text-red-300">削除</Button>}
                          </div>
                        </div>
                        {group.habits.slice(1).map((child) => (
                          <div key={child.id} className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded-lg ml-6">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-base text-zinc-500 w-8" aria-hidden>-</span>
                              <span className="flex-1 text-base text-zinc-100">{[child.habit_name, child.description?.trim()].filter(Boolean).join('｜')}</span>
                              <span className="text-base text-zinc-400">{child.points}G / {child.exp_body + child.exp_mind + child.exp_spirit}ex</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled
                                title="子習慣は単独で低頻度にできません（親習慣側で設定）"
                                className="text-xs px-2 py-0.5 rounded h-7 transition-colors text-zinc-500/40 bg-zinc-800/30 border border-zinc-700/40 cursor-not-allowed opacity-60"
                              >
                                {child.is_low_frequency ? '低頻度' : '高頻度'}
                              </button>
                              <button type="button" onClick={() => toggleIsActive(child.id)} title={child.is_active !== false ? '活性中（クリックで非活性）' : '非活性（クリックで活性）'} className={`text-xs px-2 py-0.5 rounded h-7 transition-colors cursor-pointer ${child.is_active !== false ? 'text-green-400 bg-green-900/40 hover:bg-green-900/60' : 'text-red-400 bg-red-900/30 hover:bg-red-900/50'}`}>{child.is_active !== false ? '活性' : '非活性'}</button>
                              <Button onClick={() => handleOpenEditModal(child)} variant="ghost" size="sm" aria-label={`${child.habit_name}を編集する`} className="h-7 px-2 text-base text-cyan-400 hover:text-cyan-300">編集</Button>
                              {child.is_custom && <Button onClick={() => handleDeleteHabit(child)} variant="ghost" size="sm" aria-label={`${child.habit_name}を削除する`} className="h-7 px-2 text-base text-red-400 hover:text-red-300">削除</Button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </SortableManagementGroup>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* ボーナス */}
          {habits.filter((h) => h.habit_type === 'bonus').length > 0 && (
            <div>
              <h4 className="text-base font-medium text-yellow-400 mb-3">ボーナス</h4>
              <DndContext sensors={sensors} onDragEnd={(e) => handleManagementDragEnd(e, 'bonus')}>
                <SortableContext items={buildManagementGroups(habits, 'bonus').map((g) => g.root.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {buildManagementGroups(habits, 'bonus').map((group, groupIndex, arr) => (
                      <SortableManagementGroup key={group.root.id} id={group.root.id}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-base text-zinc-500 w-8">{groupIndex + 1}</span>
                              <span className="flex-1 text-base text-zinc-100">{[group.root.habit_name, group.root.description?.trim()].filter(Boolean).join('｜')}</span>
                              {group.habits.length > 1 && <span className="text-xs px-2 py-0.5 bg-cyan-900/50 text-cyan-300 rounded">親</span>}
                              <span className="text-base text-zinc-400">
                                {group.habits.length > 1 ? 'ー' : `${group.root.points}G / ${group.root.exp_body + group.root.exp_mind + group.root.exp_spirit}ex`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button onClick={() => handleMoveUp(group.root)} variant="ghost" size="sm" disabled={groupIndex === 0} aria-label={`${group.root.habit_name}を上に移動する`} className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300">↑</Button>
                              <Button onClick={() => handleMoveDown(group.root)} variant="ghost" size="sm" disabled={groupIndex === arr.length - 1} aria-label={`${group.root.habit_name}を下に移動する`} className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300">↓</Button>
                              <button type="button" onClick={() => toggleIsLowFrequency(group.root.id)} title={group.root.is_low_frequency ? '低頻度（クリックで解除）' : '高頻度（クリックで低頻度に）'} className={`text-xs px-2 py-0.5 rounded h-7 transition-colors cursor-pointer ${group.root.is_low_frequency ? 'text-yellow-400 bg-yellow-900/40 hover:bg-yellow-900/60' : 'text-zinc-400 bg-zinc-700 hover:bg-zinc-600'}`}>{group.root.is_low_frequency ? '低頻度' : '高頻度'}</button>
                            <button type="button" onClick={() => toggleIsActive(group.root.id)} title={group.root.is_active !== false ? '活性中（クリックで非活性）' : '非活性（クリックで活性）'} className={`text-xs px-2 py-0.5 rounded h-7 transition-colors cursor-pointer ${group.root.is_active !== false ? 'text-green-400 bg-green-900/40 hover:bg-green-900/60' : 'text-red-400 bg-red-900/30 hover:bg-red-900/50'}`}>{group.root.is_active !== false ? '活性' : '非活性'}</button>
                              <Button onClick={() => handleOpenEditModal(group.root)} variant="ghost" size="sm" aria-label={`${group.root.habit_name}を編集する`} className="h-7 px-2 text-base text-cyan-400 hover:text-cyan-300">編集</Button>
                              {group.root.is_custom && <Button onClick={() => handleDeleteHabit(group.root)} variant="ghost" size="sm" aria-label={`${group.root.habit_name}を削除する`} className="h-7 px-2 text-base text-red-400 hover:text-red-300">削除</Button>}
                            </div>
                          </div>
                          {group.habits.slice(1).map((child) => (
                            <div key={child.id} className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded-lg ml-6">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-base text-zinc-500 w-8" aria-hidden>-</span>
                                <span className="flex-1 text-base text-zinc-100">{[child.habit_name, child.description?.trim()].filter(Boolean).join('｜')}</span>
                                <span className="text-base text-zinc-400">{child.points}G / {child.exp_body + child.exp_mind + child.exp_spirit}ex</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled
                                  title="子習慣は単独で低頻度にできません（親習慣側で設定）"
                                  className="text-xs px-2 py-0.5 rounded h-7 transition-colors text-zinc-500/40 bg-zinc-800/30 border border-zinc-700/40 cursor-not-allowed opacity-60"
                                >
                                  {child.is_low_frequency ? '低頻度' : '高頻度'}
                                </button>
                              <button type="button" onClick={() => toggleIsActive(child.id)} title={child.is_active !== false ? '活性中（クリックで非活性）' : '非活性（クリックで活性）'} className={`text-xs px-2 py-0.5 rounded h-7 transition-colors cursor-pointer ${child.is_active !== false ? 'text-green-400 bg-green-900/40 hover:bg-green-900/60' : 'text-red-400 bg-red-900/30 hover:bg-red-900/50'}`}>{child.is_active !== false ? '活性' : '非活性'}</button>
                                <Button onClick={() => handleOpenEditModal(child)} variant="ghost" size="sm" aria-label={`${child.habit_name}を編集する`} className="h-7 px-2 text-base text-cyan-400 hover:text-cyan-300">編集</Button>
                                {child.is_custom && <Button onClick={() => handleDeleteHabit(child)} variant="ghost" size="sm" aria-label={`${child.habit_name}を削除する`} className="h-7 px-2 text-base text-red-400 hover:text-red-300">削除</Button>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </SortableManagementGroup>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// React.memoでメモ化（propsが変わったときだけ再レンダリング）
export default memo(HabitList);
