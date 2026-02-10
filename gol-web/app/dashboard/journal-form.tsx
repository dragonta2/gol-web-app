'use client';

import { useState, useMemo, memo, useEffect, useRef, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormInput, FormTextarea } from '@/components/ui/form-input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { fetchWithRetry } from '@/lib/api-retry';
import { RIGHT_COLUMNS_BY_INDEX } from '@/lib/rights';
import type { DailyLog } from '@/lib/types';
import { applyAiTextLineBreaks } from '@/lib/utils';
import {
  STORAGE_AI_PERSONALITY_TYPE,
  STORAGE_AI_STRICT_COACH_ENABLED,
  DEFAULT_PERSONALITY_TYPE_ID,
  DEFAULT_STRICT_COACH_ENABLED,
  isValidPersonalityTypeId,
} from '@/lib/ai/personality-types';
import { Edit, MessageSquare, Gift, Save, Bot, ChevronDown, ChevronUp, Settings, Check, Unlock } from 'lucide-react';

interface Right {
  id: string;
  code: string;
  name: string;
  points: number;
  unit?: string;
  count: number;
}

export type JournalFormExpandedStates = {
  journal: boolean;
  impression: boolean;
  rights: boolean;
  ai: boolean;
};

interface JournalFormProps {
  dailyLogId: string | null;
  dailyLog: DailyLog | null;
  logDate?: string; // 選択された日付（YYYY-MM-DD形式）
  expandedStates?: JournalFormExpandedStates;
  onExpandedStateChange?: (state: Partial<JournalFormExpandedStates>) => void;
  /** ユーザー表示名（あらすじ・アドバイス内の名前をボールド表示するために使用） */
  userName?: string;
  /** 管理者またはテストアカウント（再生成回数リセットボタン表示用） */
  isAdmin?: boolean;
}

interface AIJudgmentResult {
  condition_body: number;
  condition_mood: number;
  reasoning: string;
}

function JournalForm({ dailyLogId, dailyLog, logDate, expandedStates, onExpandedStateChange, userName = '', isAdmin = false }: JournalFormProps) {
  const router = useRouter();
  const supabase = createClient();

  // 日誌本文と一言感想の最大文字数（バリデーション用）
  const journalMaxLength = 3000;
  const impressionMaxLength = 500;

  // アコーディオンの開閉状態を管理（外部制御があればそれを使用、なければ内部状態）
  const [internalJournalExpanded, setInternalJournalExpanded] = useState(true);
  const [internalImpressionExpanded, setInternalImpressionExpanded] = useState(true);
  const [internalRightsExpanded, setInternalRightsExpanded] = useState(true);
  const [internalAiExpanded, setInternalAiExpanded] = useState(true);

  const isJournalExpanded = expandedStates?.journal ?? internalJournalExpanded;
  const isImpressionExpanded = expandedStates?.impression ?? internalImpressionExpanded;
  const isRightsExpanded = expandedStates?.rights ?? internalRightsExpanded;
  const isAiExpanded = expandedStates?.ai ?? internalAiExpanded;

  const setIsJournalExpanded = (value: boolean) => {
    if (onExpandedStateChange) {
      onExpandedStateChange({ ...expandedStates, journal: value });
    } else {
      setInternalJournalExpanded(value);
    }
  };

  const setIsImpressionExpanded = (value: boolean) => {
    if (onExpandedStateChange) {
      onExpandedStateChange({ ...expandedStates, impression: value });
    } else {
      setInternalImpressionExpanded(value);
    }
  };

  const setIsRightsExpanded = (value: boolean) => {
    if (onExpandedStateChange) {
      onExpandedStateChange({ ...expandedStates, rights: value });
    } else {
      setInternalRightsExpanded(value);
    }
  };

  const setIsAiExpanded = (value: boolean) => {
    if (onExpandedStateChange) {
      onExpandedStateChange({ ...expandedStates, ai: value });
    } else {
      setInternalAiExpanded(value);
    }
  };

  // expandedStatesが外部から変更された場合、内部状態を同期
  useEffect(() => {
    if (expandedStates) {
      if (expandedStates.journal !== undefined) {
        setInternalJournalExpanded(expandedStates.journal);
      }
      if (expandedStates.impression !== undefined) {
        setInternalImpressionExpanded(expandedStates.impression);
      }
      if (expandedStates.rights !== undefined) {
        setInternalRightsExpanded(expandedStates.rights);
      }
      if (expandedStates.ai !== undefined) {
        setInternalAiExpanded(expandedStates.ai);
      }
    }
  }, [expandedStates]);

  // 選択された日付が今日より過去かどうかを判定
  const isPastDate = (() => {
    if (!logDate && !dailyLog?.log_date) return false;
    const selectedDate = logDate || dailyLog?.log_date;
    if (!selectedDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(selectedDate);
    targetDate.setHours(0, 0, 0, 0);
    
    return targetDate < today;
  })();

  // 選択された日付が今日かどうかを判定
  const isToday = (() => {
    if (!logDate && !dailyLog?.log_date) return true; // デフォルトは今日
    const selectedDate = logDate || dailyLog?.log_date;
    if (!selectedDate) return true;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(selectedDate);
    targetDate.setHours(0, 0, 0, 0);
    
    return targetDate.getTime() === today.getTime();
  })();

  // 日誌が確定済みかどうか
  const isConfirmed = dailyLog?.is_confirmed ?? false;

  /** 「これからの冒険」本文から、AIが付けた見出し行（あらすじ：これからの冒険）を除く */
  const stripFutureAdventureHeading = (text: string) => {
    return text
      .split('\n')
      .filter((line) => {
        const t = line.replace(/\*\*/g, '').trim();
        return !/^あらすじ[：:]\s*これからの冒険\s*$/.test(t) && t !== 'これからの冒険';
      })
      .join('\n')
      .trim();
  };

  /** AI作成文章の表示（改行ルール＋ユーザー名をボールド） */
  const renderAiText = (text: string) => {
    const formatted = applyAiTextLineBreaks(text);
    if (!userName) return formatted;
    const parts = formatted.split(userName);
    if (parts.length <= 1) return formatted;
    return parts.map((part, i) => (
      <Fragment key={i}>
        {part}
        {i < parts.length - 1 ? <strong>{userName}</strong> : null}
      </Fragment>
    ));
  };

  // 編集可能かどうか（当日 OR 未確定の過去）
  const isEditable = isToday || (isPastDate && !isConfirmed);

  // 権利設定を取得（配列形式）
  const [rightsList, setRightsList] = useState<Array<{ code: string; name: string; points: number; unit: string }>>([]);

  useEffect(() => {
    const fetchRights = async () => {
      try {
        const res = await fetch('/api/settings/rights');
        const result = await res.json();
        if (res.ok && Array.isArray(result.rights)) {
          setRightsList(result.rights);
        }
      } catch (error) {
        console.error('権利設定取得エラー:', error);
      }
    };
    fetchRights();
  }, []);

  // 配列の並び順で daily_logs の権利カラムにマッピング（権利記号はアルファベットのみ、最大24件）

  // dailyLogから初期値を計算（useMemoでキャッシュ）。id は配列順で安定化（コードはユーザーが変えうるため）
  const initialValues = useMemo(() => {
    return {
      rights: rightsList.map((r, index) => ({
        id: `right-${index}`,
        code: r.code,
        name: r.name,
        points: r.points,
        unit: r.unit,
        count: (dailyLog as any)?.[RIGHT_COLUMNS_BY_INDEX[index]] ?? 0,
      })) as Right[],
    };
  }, [dailyLog, rightsList]);

  // 日誌の本文と一言感想は新しいコンポーネント（JournalImpressionSections）で管理されるため、
  // ここではdailyLogから取得する（AI判定や保存処理で使用）
  const journalText = dailyLog?.journal_text || '';
  const impressionText = dailyLog?.one_line_comment || '';

  // 利用ポイント（権利）
  const [rights, setRights] = useState<Right[]>(initialValues.rights);

  // 権利設定または日誌が変わったら rights を同期
  useEffect(() => {
    setRights(initialValues.rights);
  }, [initialValues.rights.length, dailyLog?.id, rightsList.length]);

  // AI判定結果
  const [aiJudgmentResult, setAIJudgmentResult] = useState<AIJudgmentResult | null>(
    dailyLog && dailyLog.ai_condition_body !== null && dailyLog.ai_condition_mood !== null
      ? {
          condition_body: dailyLog.ai_condition_body,
          condition_mood: dailyLog.ai_condition_mood,
          reasoning: '',
        }
      : null
  );
  const [isJudging, setIsJudging] = useState(false);
  const [isResettingBatchCount, setIsResettingBatchCount] = useState(false);

  // AIアドバイス
  const [aiAdvice, setAIAdvice] = useState<string | null>(dailyLog?.ai_advice || null);

  // AIあらすじ（これまでの冒険 / これからの冒険）
  const [aiStoryPast, setAIStoryPast] = useState<string | null>(dailyLog?.ai_story_past || null);
  const [aiStoryFuture, setAIStoryFuture] = useState<string | null>(dailyLog?.ai_story_future ?? null);
  // 一括生成直後は router.refresh で渡る dailyLog がまだ古いことがあるため、その1回は上書きしない
  const skipNextAiStorySyncRef = useRef(false);

  // 日誌が変わったらあらすじを同期（一括生成直後はスキップ）
  useEffect(() => {
    if (skipNextAiStorySyncRef.current) {
      skipNextAiStorySyncRef.current = false;
      return;
    }
    setAIStoryPast(dailyLog?.ai_story_past ?? null);
    setAIStoryFuture(dailyLog?.ai_story_future ?? null);
  }, [dailyLog?.id, dailyLog?.ai_story_past, dailyLog?.ai_story_future]);

  // 権利の回数更新（上限なし・使用単位は自由記述のため）
  const updateRightCount = (rightId: string, newCount: number) => {
    setRights(rights.map((right) =>
      right.id === rightId ? { ...right, count: Math.max(0, newCount) } : right
    ));
  };

  // 日誌保存ハンドラー（権利の保存のみ。日誌本文と一言感想はJournalImpressionSectionsで自動保存される）
  const handleSave = async () => {
    if (!dailyLogId) {
      toast.error('日誌IDが取得できませんでした', {
        description: 'ページをリロードしてください',
      });
      return;
    }

    try {
      const countByIndex = RIGHT_COLUMNS_BY_INDEX.map((_, i) => rights[i]?.count ?? 0);
      const updatePayload: Record<string, number> = {};
      RIGHT_COLUMNS_BY_INDEX.forEach((col, i) => {
        updatePayload[col] = countByIndex[i];
      });

      const { error } = await supabase
        .from('daily_logs')
        .update({
          // journal_textとone_line_commentはJournalImpressionSectionsで自動保存されるため、ここでは更新しない
          ...updatePayload,
        })
        .eq('id', dailyLogId);

      if (error) {
        console.error('Error saving journal:', error);
        toast.error('日誌の保存に失敗しました', {
          description: error.message || 'データベースエラーが発生しました',
        });
      } else {
        toast.success('日誌を保存しました');
      }
    } catch (error) {
      console.error('Error saving journal:', error);
      toast.error('日誌の保存に失敗しました', {
        description: error instanceof Error ? error.message : '予期しないエラーが発生しました',
      });
    }
  };

  // 日誌を確定する
  const handleConfirm = async () => {
    if (!dailyLogId) {
      toast.error('日誌IDが取得できませんでした');
      return;
    }

    try {
      const { error } = await supabase
        .from('daily_logs')
        .update({ is_confirmed: true })
        .eq('id', dailyLogId);

      if (error) {
        console.error('Error confirming journal:', error);
        toast.error('日誌の確定に失敗しました');
      } else {
        toast.success('日誌を確定しました');
        router.refresh();
      }
    } catch (error) {
      console.error('Error confirming journal:', error);
      toast.error('日誌の確定に失敗しました');
    }
  };

  // 日誌の確定を取り消す（全日誌で可能）
  const handleUnconfirm = async () => {
    if (!dailyLogId) {
      toast.error('日誌IDが取得できませんでした');
      return;
    }

    try {
      const { error } = await supabase
        .from('daily_logs')
        .update({ is_confirmed: false })
        .eq('id', dailyLogId);

      if (error) {
        console.error('Error unconfirming journal:', error);
        toast.error('確定の取り消しに失敗しました');
      } else {
        toast.success('確定を取り消しました');
        router.refresh();
      }
    } catch (error) {
      console.error('Error unconfirming journal:', error);
      toast.error('確定の取り消しに失敗しました');
    }
  };

  // AI一括生成（判定＋あらすじ＋アドバイス）。1日2回まで。
  const handleBatchRun = async () => {
    if (!dailyLogId) {
      toast.error('日誌IDが取得できませんでした', {
        description: 'ページをリロードしてください',
      });
      return;
    }

    const currentJournalText = dailyLog?.journal_text || '';
    const currentImpressionText = dailyLog?.one_line_comment || '';

    if (!currentJournalText.trim() && !currentImpressionText.trim()) {
      toast.error('日誌本文または一言感想を入力してください');
      return;
    }
    if (currentJournalText.length > journalMaxLength) {
      toast.error(`日誌本文は${journalMaxLength}文字以内で入力してください`);
      return;
    }
    if (currentImpressionText.length > impressionMaxLength) {
      toast.error(`一言感想は${impressionMaxLength}文字以内で入力してください`);
      return;
    }

    const runCount = dailyLog?.ai_batch_run_count ?? 0;
    if (runCount >= 2) {
      toast.error('本日の再生成は2回までです。明日またお試しください。');
      return;
    }

    setIsJudging(true);
    try {
      const response = await fetchWithRetry(
        '/api/ai/batch',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dailyLogId,
            journalText: currentJournalText,
            impressionText: currentImpressionText,
            displayName: userName?.trim() || undefined,
            storyWorldId: (typeof window !== 'undefined' && localStorage.getItem('gol-story-world')) || 'ghost',
            personalityTypeId:
              typeof window === 'undefined'
                ? DEFAULT_PERSONALITY_TYPE_ID
                : isValidPersonalityTypeId(localStorage.getItem(STORAGE_AI_PERSONALITY_TYPE))
                  ? localStorage.getItem(STORAGE_AI_PERSONALITY_TYPE)
                  : DEFAULT_PERSONALITY_TYPE_ID,
            strictCoachEnabled:
              typeof window !== 'undefined'
                ? localStorage.getItem(STORAGE_AI_STRICT_COACH_ENABLED) !== 'false'
                : DEFAULT_STRICT_COACH_ENABLED,
          }),
        },
        { maxRetries: 2, initialDelay: 2000, maxDelay: 15000 }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 429 && data.code === 'BATCH_LIMIT_EXCEEDED') {
          toast.error(data.error || '本日の再生成は2回までです。');
          return;
        }
        throw new Error(data.error || data.details || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setAIJudgmentResult({
        condition_body: data.condition_body,
        condition_mood: data.condition_mood,
        reasoning: data.reasoning ?? '',
      });
      skipNextAiStorySyncRef.current = true;
      setAIStoryPast(data.storyPast ?? null);
      setAIStoryFuture(data.storyFuture ?? null);
      setAIAdvice(data.advice ?? null);

      toast.success('AI判定・あらすじ・アドバイスを生成しました', {
        description: data._debug_nickname_used != null
          ? `体調: ${data.condition_body}点 / 気分: ${data.condition_mood}点　表示名: ${data._debug_nickname_used}`
          : `体調: ${data.condition_body}点 / 気分: ${data.condition_mood}点`,
      });
      router.refresh();
    } catch (error) {
      console.error('AI一括生成エラー:', error);
      let message = '予期しないエラーが発生しました';
      if (error instanceof Error) {
        message = error.message;
      } else if (error && typeof (error as Response).json === 'function') {
        // fetchWithRetry が 4xx/5xx のときに Response を throw している場合
        try {
          const data = await (error as Response).json().catch(() => ({}));
          const body = data as { error?: string; details?: string };
          message = body.error || body.details || `HTTP ${(error as Response).status}`;
        } catch {
          message = `HTTP ${(error as Response).status}`;
        }
      }
      toast.error('AI一括生成に失敗しました', {
        description: message,
        duration: 10000,
      });
    } finally {
      setIsJudging(false);
    }
  };

  // 再生成回数リセット（管理者・テストアカウントのみ）
  const handleResetBatchCount = async () => {
    if (!dailyLogId || !isAdmin) return;
    setIsResettingBatchCount(true);
    try {
      const res = await fetch('/api/ai/batch-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dailyLogId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'リセットに失敗しました');
        return;
      }
      toast.success('再生成回数をリセットしました');
      router.refresh();
    } catch {
      toast.error('リセットに失敗しました');
    } finally {
      setIsResettingBatchCount(false);
    }
  };

  // 合計消費ポイント計算
  const totalPoints = rights.reduce((sum, right) => sum + (right.points * right.count), 0);

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* 本日の利用ポイント（過去の日付で日誌が存在する場合のみ表示） */}
      {(!isPastDate || dailyLog) && (
        <div>
          <button
            onClick={() => setIsRightsExpanded(!isRightsExpanded)}
            className="w-full text-left mb-2 sm:mb-3 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
            aria-expanded={isRightsExpanded}
            aria-controls="rights-content"
          >
            <h3 className="text-xl sm:text-2xl font-medium text-zinc-200 flex items-center gap-2">
              <Gift className="w-7 h-7 sm:w-8 sm:h-8" />
              <span>本日の利用ゴルド</span>
            </h3>
            {isRightsExpanded ? (
              <ChevronUp className="w-6 h-6 text-zinc-300 shrink-0" />
            ) : (
              <ChevronDown className="w-6 h-6 text-zinc-300 shrink-0" />
            )}
          </button>
          {isRightsExpanded && (
            <div id="rights-content" className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 sm:p-4 space-y-3">
              {rights.map((right) => (
                <div key={right.id} className="flex items-center gap-3 text-base">
                  {/* 権利名・使用単位 */}
                  <span className={`flex-1 min-w-0 ${right.count > 0 ? 'text-zinc-50' : 'text-zinc-300'}`}>
                    権利{right.code}｜{right.name}
                    {right.unit && <span className="text-zinc-400 text-sm ml-1">（{right.unit}）</span>}
                  </span>

                  {/* 1回あたりの利用ポイント（スピナーのすぐ左） */}
                  <span className="text-zinc-500 text-sm whitespace-nowrap">1回あたり -{right.points}G</span>

                  {/* ポイント表示（スピナーの左） */}
                  <span className="text-base text-red-400 font-medium whitespace-nowrap min-w-14 text-right">
                    {right.count > 0 ? `-${right.points * right.count}G` : ''}
                  </span>

                  {/* 数値入力（一番右端） */}
                  <Input
                    type="number"
                    min="0"
                    value={right.count}
                    onChange={(e) => updateRightCount(right.id, parseInt(e.target.value) || 0)}
                    disabled={!isEditable}
                    className="w-16 px-2 py-1 bg-zinc-800 border-zinc-600 text-zinc-50 text-center text-base focus:border-red-500 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                  />
                </div>
              ))}

              {/* 合計ポイント */}
              {totalPoints > 0 && (
                <div className="pt-3 mt-3 border-t border-zinc-800 text-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-200 font-medium">本日消費ゴルド合計</span>
                    <span className="text-red-400 font-bold">-{totalPoints}G</span>
                  </div>
                </div>
              )}

              {/* 権利設定へのリンク */}
              <div className="pt-3 mt-3 border-t border-zinc-800 flex justify-end">
                <Link
                  href="/settings/rights"
                  className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  <Settings className="w-4 h-4" />
                  権利設定
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 日誌を保存ボタン・確定ボタン */}
      {isEditable && (
        <div className="flex justify-center gap-3">
          <Button
            onClick={handleSave}
            aria-label="日誌を保存する"
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
            size="lg"
          >
            <Save className="w-4 h-4 mr-1" />
            日誌を保存
          </Button>
          {!isConfirmed && (
            <Button
              onClick={handleConfirm}
              aria-label="日誌を確定する"
              className="bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <Check className="w-4 h-4 mr-1" />
              確定
            </Button>
          )}
        </div>
      )}

      {/* 確定取り消しボタン（確定済みの日誌ならいつでも可能） */}
      {isConfirmed && (
        <div className="flex justify-center">
          <Button
            onClick={handleUnconfirm}
            aria-label="確定を取り消す"
            className="bg-zinc-600 text-white hover:bg-zinc-500 border border-zinc-500"
            size="lg"
          >
            <Unlock className="w-4 h-4 mr-1" />
            確定を取り消す
          </Button>
        </div>
      )}

      {/* AI判定エリア（過去の日付で日誌が存在する場合のみ表示） */}
      {(!isPastDate || dailyLog) && (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg space-y-6">
          <button
            onClick={() => setIsAiExpanded(!isAiExpanded)}
            className="w-full text-left mb-4 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
            aria-expanded={isAiExpanded}
            aria-controls="ai-content"
          >
            <h2 className="text-xl font-semibold text-cyan-400 flex items-center gap-2">
              <Bot className="w-7 h-7 sm:w-8 sm:h-8" />
              <span>AI判定</span>
            </h2>
            {isAiExpanded ? (
              <ChevronUp className="w-6 h-6 text-zinc-400 shrink-0" />
            ) : (
              <ChevronDown className="w-6 h-6 text-zinc-400 shrink-0" />
            )}
          </button>
          {isAiExpanded && (
            <div id="ai-content" className="space-y-6">
              {/* AI一括生成（判定＋あらすじ＋アドバイス）。1日2回まで。 */}
        {isEditable && (
          <div className="text-center space-y-2">
            <Button
              onClick={handleBatchRun}
              disabled={isJudging || (dailyLog?.ai_batch_run_count ?? 0) >= 2}
              aria-label={aiJudgmentResult || aiStoryPast || aiAdvice ? 'AIを再生成する' : 'AI判定を実行する'}
              aria-busy={isJudging}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              size="lg"
            >
              <Bot className="w-4 h-4 mr-1.5" />
              {isJudging ? '生成中...' : (aiJudgmentResult || aiStoryPast || aiAdvice ? '再生成' : 'AI判定を実行')}
            </Button>
            <p className="text-zinc-500 text-xs">再生成は1日2回までです</p>
            {isAdmin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetBatchCount}
                disabled={isResettingBatchCount || !dailyLogId}
                className="mt-2 bg-zinc-600 border-zinc-500 text-zinc-200 hover:bg-zinc-500 hover:text-zinc-100 text-xs"
              >
                {isResettingBatchCount ? 'リセット中...' : '再生成回数をリセット（管理者用）'}
              </Button>
            )}
          </div>
        )}
        {!isEditable && (
          <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
            <p className="text-zinc-400 text-sm">確定済みの日誌ではAI判定を実行できません</p>
          </div>
        )}

        {/* AI判定結果表示（一括生成のローディング時も同じスケルトン） */}
        {isJudging ? (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-medium text-cyan-400">判定結果</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-4 w-20 mb-2 bg-zinc-700" />
                <Skeleton className="h-8 w-24 bg-zinc-700" />
              </div>
              <div>
                <Skeleton className="h-4 w-20 mb-2 bg-zinc-700" />
                <Skeleton className="h-8 w-24 bg-zinc-700" />
              </div>
            </div>
            <Skeleton className="h-20 w-full bg-zinc-700" />
            <Skeleton className="h-12 w-full bg-zinc-700" />
          </div>
        ) : aiJudgmentResult ? (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-medium text-cyan-400">判定結果</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-lg text-zinc-400 mb-1">体調スコア</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {aiJudgmentResult.condition_body}
                  <span className="text-lg text-zinc-500">/100</span>
                </div>
              </div>
              <div>
                <div className="text-lg text-zinc-400 mb-1">気分スコア</div>
                <div className="text-2xl font-bold text-purple-400">
                  {aiJudgmentResult.condition_mood}
                  <span className="text-lg text-zinc-500">/100</span>
                </div>
              </div>
            </div>
            {aiJudgmentResult.reasoning && (
              <div className="text-lg text-zinc-300 bg-zinc-900 rounded p-3">
                {aiJudgmentResult.reasoning}
              </div>
            )}
            {dailyLog?.ai_points_earned !== null && dailyLog?.ai_points_earned !== undefined && (
              <div className="text-base text-zinc-300">
                <div>獲得ゴルド: <span className="text-yellow-400 font-medium">+{dailyLog.ai_points_earned}G</span></div>
                <div>獲得EXP: 身体+{dailyLog.ai_exp_body || 0} 頭脳+{dailyLog.ai_exp_mind || 0} 精神+{dailyLog.ai_exp_spirit || 0}</div>
              </div>
            )}
          </div>
        ) : null}

        {/* AIあらすじ（一括生成で判定・あらすじ・アドバイスをまとめて生成） */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-cyan-400">あらすじ</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-white mb-1">これまでの冒険</p>
              {isJudging ? (
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <Skeleton className="h-4 w-full mb-2 bg-zinc-700" />
                  <Skeleton className="h-4 w-full mb-2 bg-zinc-700" />
                  <Skeleton className="h-4 w-full mb-2 bg-zinc-700" />
                  <Skeleton className="h-4 w-3/4 bg-zinc-700" />
                </div>
              ) : aiStoryPast ? (
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <p className="text-zinc-300 whitespace-pre-wrap">{renderAiText(aiStoryPast)}</p>
                </div>
              ) : (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <p className="text-zinc-500 text-sm">未生成</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-1">これからの冒険</p>
              {aiStoryFuture ? (
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <p className="text-zinc-300 whitespace-pre-wrap">{renderAiText(stripFutureAdventureHeading(aiStoryFuture))}</p>
                </div>
              ) : (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <p className="text-zinc-500 text-sm">未生成</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 辛口コーチング アドバイス（一括生成で生成） */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-cyan-400">辛口コーチング アドバイス</h3>
          {isJudging ? (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <Skeleton className="h-4 w-full mb-2 bg-zinc-700" />
              <Skeleton className="h-4 w-full mb-2 bg-zinc-700" />
              <Skeleton className="h-4 w-3/4 bg-zinc-700" />
            </div>
          ) : aiAdvice ? (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <p className="text-zinc-300 whitespace-pre-wrap">{renderAiText(aiAdvice)}</p>
            </div>
          ) : (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <p className="text-zinc-500 text-sm">未生成（上の「AI判定を実行」で一括生成）</p>
            </div>
          )}
        </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// React.memoでメモ化（propsが変わったときだけ再レンダリング）
export default memo(JournalForm);
