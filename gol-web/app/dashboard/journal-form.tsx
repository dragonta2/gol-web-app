'use client';

import { useState, useMemo, memo, useEffect, useRef, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRouterRefresh } from '@/contexts/router-refresh-context';
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
import type { ScoreBreakdown } from '@/lib/score-calculator';
import { applyAiTextLineBreaks, insertBlankLineEveryTwoLines, isSubmitShortcut } from '@/lib/utils';
import { useSpeech, SPEECH_RATES } from '@/lib/use-speech';
import {
  STORAGE_AI_PERSONALITY_TYPE,
  DEFAULT_PERSONALITY_TYPE_ID,
  isValidPersonalityTypeId,
} from '@/lib/ai/personality-types';
import { Edit, MessageSquare, Gift, Save, Bot, ChevronDown, ChevronUp, Settings, Check, Unlock, Volume2, VolumeX } from 'lucide-react';
import { ExpWithIcons } from '@/components/exp-with-icons';

/** 権利の利用回数上限（スライダー・＋ボタン用） */
const MAX_RIGHT_COUNT = 99;

interface Right {
  id: string;
  code: string;
  name: string;
  points: number;
  unit?: string;
  count: number;
  is_active?: boolean;
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
  /** 1日分のスコア内訳（ToDo・習慣・AI・権利ごと） */
  scoreBreakdown?: ScoreBreakdown | null;
  /** 日誌・感想の現在値（AI判定実行時にここから取得。JournalImpressionSections が更新） */
  journalTextsRef?: React.MutableRefObject<{ journalText: string; impressionText: string }>;
}

interface AIJudgmentResult {
  condition_body: number;
  condition_mood: number;
  reasoning: string;
}

function JournalForm({ dailyLogId, dailyLog, logDate, expandedStates, onExpandedStateChange, userName = '', isAdmin = false, scoreBreakdown, journalTextsRef }: JournalFormProps) {
  const router = useRouter();
  const { refresh } = useRouterRefresh();
  const supabase = createClient();

  // 日誌本文と一言感想の最大文字数（バリデーション用）
  const journalMaxLength = 3000;
  const impressionMaxLength = 3000;

  // アコーディオンの開閉状態を管理（外部制御があればそれを使用、なければ内部状態）
  const [internalJournalExpanded, setInternalJournalExpanded] = useState(true);
  const [internalImpressionExpanded, setInternalImpressionExpanded] = useState(true);
  const [internalRightsExpanded, setInternalRightsExpanded] = useState(true);
  const [internalAiExpanded, setInternalAiExpanded] = useState(true);
  const [isStoryExpanded, setIsStoryExpanded] = useState(true);
  const [isAdviceExpanded, setIsAdviceExpanded] = useState(true);

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

  /** AI作成文章の表示（改行ルール＋ユーザー名をボールド）。blankEveryTwoLines: 2行ごとに空行（あらすじ・コーチング用）。連続改行は \n{3,} を \n\n に揃える（空行は最大1つ）。 */
  const renderAiText = (text: string, options?: { blankEveryTwoLines?: boolean }) => {
    let formatted = applyAiTextLineBreaks(text);
    if (options?.blankEveryTwoLines) formatted = insertBlankLineEveryTwoLines(formatted);
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
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

  // 編集可能かどうか（未確定のときのみ。確定したら当日も含め編集不可）
  const isEditable = !isConfirmed;

  // 権利設定を取得（配列形式）
  const [rightsList, setRightsList] = useState<Array<{ code: string; name: string; points: number; unit: string; is_active?: boolean }>>([]);

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
        is_active: r.is_active,
        count: r.is_active === false ? 0 : ((dailyLog as unknown as Record<string, number>)?.[RIGHT_COLUMNS_BY_INDEX[index]] ?? 0),
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

  // AI判定結果（総評は dailyLog.ai_reasoning から永続化されており、ページ遷移・確定後も表示）
  const [aiJudgmentResult, setAIJudgmentResult] = useState<AIJudgmentResult | null>(
    dailyLog && dailyLog.ai_condition_body !== null && dailyLog.ai_condition_mood !== null
      ? {
          condition_body: dailyLog.ai_condition_body,
          condition_mood: dailyLog.ai_condition_mood,
          reasoning: dailyLog.ai_reasoning ?? '',
        }
      : null
  );
  const [isJudging, setIsJudging] = useState(false);
  const [isResettingBatchCount, setIsResettingBatchCount] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // AIアドバイス（弛緩・緊張）
  const [aiAdvice, setAIAdvice] = useState<string | null>(dailyLog?.ai_advice || null);
  const [aiAdviceTension, setAIAdviceTension] = useState<string | null>(dailyLog?.ai_advice_tension ?? null);

  // 音声読み上げ
  const { speakingTarget, speak, speechRate, setSpeechRate } = useSpeech((msg) => toast.error(msg));

  // AIあらすじ（統合・ai_story_past）
  const [aiStoryPast, setAIStoryPast] = useState<string | null>(dailyLog?.ai_story_past || null);
  // 一括生成直後は router.refresh で渡る dailyLog がまだ古いことがあるため、その1回は上書きしない
  const skipNextAiStorySyncRef = useRef(false);
  const skipNextAiJudgmentSyncRef = useRef(false);

  // 日誌が変わったらあらすじを同期（一括生成直後はスキップ）
  useEffect(() => {
    if (skipNextAiStorySyncRef.current) {
      skipNextAiStorySyncRef.current = false;
      return;
    }
    setAIStoryPast(dailyLog?.ai_story_past ?? null);
  }, [dailyLog?.id, dailyLog?.ai_story_past]);

  // 日誌が変わったらコーチング文を同期
  useEffect(() => {
    setAIAdvice(dailyLog?.ai_advice ?? null);
    setAIAdviceTension(dailyLog?.ai_advice_tension ?? null);
  }, [dailyLog?.id, dailyLog?.ai_advice, dailyLog?.ai_advice_tension]);

  // 日誌が変わったらAI判定結果（総評含む）を同期。ページ遷移・確定後も永続表示するため dailyLog から復元
  useEffect(() => {
    if (skipNextAiJudgmentSyncRef.current) {
      skipNextAiJudgmentSyncRef.current = false;
      return;
    }
    if (
      dailyLog &&
      dailyLog.ai_condition_body !== null &&
      dailyLog.ai_condition_mood !== null
    ) {
      setAIJudgmentResult({
        condition_body: dailyLog.ai_condition_body,
        condition_mood: dailyLog.ai_condition_mood,
        reasoning: dailyLog.ai_reasoning ?? '',
      });
    } else {
      setAIJudgmentResult(null);
    }
  }, [
    dailyLog?.id,
    dailyLog?.ai_condition_body,
    dailyLog?.ai_condition_mood,
    dailyLog?.ai_reasoning,
  ]);

  // 権利の回数更新（上限なし・使用単位は自由記述のため）
  const updateRightCount = (rightId: string, newCount: number) => {
    setRights(rights.map((right) =>
      right.id === rightId ? { ...right, count: Math.max(0, Math.min(MAX_RIGHT_COUNT, newCount)) } : right
    ));
  };

  // 日誌保存ハンドラー（権利＋日誌本文・一言感想。本文・感想は ref の最新値もまとめて保存）
  const handleSave = async () => {
    if (!dailyLogId) {
      toast.error('日誌IDが取得できませんでした', {
        description: 'ページをリロードしてください',
      });
      return;
    }

    try {
      const countByIndex = RIGHT_COLUMNS_BY_INDEX.map((_, i) => rights[i]?.count ?? 0);
      const updatePayload: Record<string, number | string> = {};
      RIGHT_COLUMNS_BY_INDEX.forEach((col, i) => {
        updatePayload[col] = countByIndex[i];
      });
      if (journalTextsRef?.current) {
        updatePayload.journal_text = journalTextsRef.current.journalText;
        updatePayload.one_line_comment = journalTextsRef.current.impressionText;
      }

      const { error } = await supabase
        .from('daily_logs')
        .update(updatePayload)
        .eq('id', dailyLogId);

      if (error) {
        console.error('Error saving journal:', error);
        toast.error('日誌の保存に失敗しました', {
          description: error.message || 'データベースエラーが発生しました',
        });
      } else {
        toast.success('日誌を保存しました');
        refresh();
      }
    } catch (error) {
      console.error('Error saving journal:', error);
      toast.error('日誌の保存に失敗しました', {
        description: error instanceof Error ? error.message : '予期しないエラーが発生しました',
      });
    }
  };

  // 日誌を確定する（スコアを profiles に反映してから is_confirmed = true）
  const handleConfirm = async () => {
    if (!dailyLogId) {
      toast.error('日誌IDが取得できませんでした');
      return;
    }

    setIsConfirming(true);
    try {
      const res = await fetch('/api/daily-logs/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyLogId }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || '日誌の確定に失敗しました', {
          description: typeof data.details === 'string' ? data.details : undefined,
        });
        return;
      }
      toast.success('日誌を確定しました');
      refresh();
    } catch (error) {
      console.error('Error confirming journal:', error);
      toast.error('日誌の確定に失敗しました');
    } finally {
      setIsConfirming(false);
    }
  };

  // 日誌の確定を取り消す（適用済みスコアを profiles から差し引き is_confirmed = false）
  const handleUnconfirm = async () => {
    if (!dailyLogId) {
      toast.error('日誌IDが取得できませんでした');
      return;
    }

    try {
      const res = await fetch('/api/daily-logs/unconfirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyLogId }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || '確定の取り消しに失敗しました', {
          description: typeof data.details === 'string' ? data.details : undefined,
        });
        return;
      }
      toast.success('確定を取り消しました');
      refresh();
    } catch (error) {
      console.error('Error unconfirming journal:', error);
      toast.error('確定の取り消しに失敗しました');
    }
  };

  // AI一括生成（判定＋あらすじ＋アドバイス）。日誌ごと2回まで。
  const handleBatchRun = async () => {
    if (!dailyLogId) {
      toast.error('日誌IDが取得できませんでした', {
        description: 'ページをリロードしてください',
      });
      return;
    }

    // 入力欄の現在値（ref）を優先。未設定時はサーバー由来の dailyLog を使用
    const currentJournalText = journalTextsRef?.current?.journalText ?? dailyLog?.journal_text ?? '';
    const currentImpressionText = journalTextsRef?.current?.impressionText ?? dailyLog?.one_line_comment ?? '';

    if (!currentJournalText.trim()) {
      toast.error('日誌を記入してください。');
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
      toast.error('再生成回数は2回までです。');
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
          }),
        },
        { maxRetries: 2, initialDelay: 2000, maxDelay: 15000 }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 429 && data.code === 'BATCH_LIMIT_EXCEEDED') {
          toast.error(data.error || '再生成回数は2回までです。');
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
      skipNextAiJudgmentSyncRef.current = true;
      setAIStoryPast(data.story ?? null);
      setAIAdvice(data.adviceRelax ?? null);
      setAIAdviceTension(data.adviceTension ?? null);

      toast.success('AI判定・あらすじ・アドバイスを生成しました', {
        description: data._debug_nickname_used != null
          ? `体調: ${data.condition_body}点 / 気分: ${data.condition_mood}点　表示名: ${data._debug_nickname_used}`
          : `体調: ${data.condition_body}点 / 気分: ${data.condition_mood}点`,
      });
      refresh();
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
      refresh();
    } catch {
      toast.error('リセットに失敗しました');
    } finally {
      setIsResettingBatchCount(false);
    }
  };

  // 合計消費ポイント計算
  const totalPoints = rights.reduce((sum, right) => sum + (right.points * right.count), 0);

  // 獲得スコア表示用の計算（IIFEをuseMemoに変換）
  const scoreDisplay = useMemo(() => {
    if (!scoreBreakdown) return null;
    const displayRightsDelta = -totalPoints;
    const adjustedTotalPoints = scoreBreakdown.total.points_delta - scoreBreakdown.rights.points_delta + displayRightsDelta;
    const pointsAdd = scoreBreakdown.todo.points_delta + scoreBreakdown.habits_good.points_delta + scoreBreakdown.ai.points_delta;
    const pointsSub = Math.abs(scoreBreakdown.habits_bad.points_delta) + totalPoints;
    const expBodyAdd = scoreBreakdown.todo.exp_body_delta + scoreBreakdown.habits_good.exp_body_delta + scoreBreakdown.ai.exp_body_delta;
    const expBodySub = Math.abs(Math.min(0, scoreBreakdown.habits_bad.exp_body_delta));
    const expMindAdd = scoreBreakdown.todo.exp_mind_delta + scoreBreakdown.habits_good.exp_mind_delta + scoreBreakdown.ai.exp_mind_delta;
    const expMindSub = Math.abs(Math.min(0, scoreBreakdown.habits_bad.exp_mind_delta));
    const expSpiritAdd = scoreBreakdown.todo.exp_spirit_delta + scoreBreakdown.habits_good.exp_spirit_delta + scoreBreakdown.ai.exp_spirit_delta;
    const expSpiritSub = Math.abs(Math.min(0, scoreBreakdown.habits_bad.exp_spirit_delta));
    const hasAnyExp = scoreBreakdown.total.exp_body_delta !== 0 || scoreBreakdown.total.exp_mind_delta !== 0 || scoreBreakdown.total.exp_spirit_delta !== 0;
    return { adjustedTotalPoints, pointsAdd, pointsSub, expBodyAdd, expBodySub, expMindAdd, expMindSub, expSpiritAdd, expSpiritSub, hasAnyExp };
  }, [scoreBreakdown, totalPoints]);

  return (
    <div
      className="space-y-4 sm:space-y-6 lg:space-y-8"
      onKeyDown={(e) => {
        if (!isSubmitShortcut(e)) return
        if (!isEditable) return
        e.preventDefault()
        handleSave()
      }}
    >
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
              <Gift className="w-7 h-7 sm:w-8 sm:h-8 text-gold" />
              <span>本日の利用ゴルド</span>
            </h3>
            {isRightsExpanded ? (
              <ChevronUp className="w-6 h-6 text-zinc-300 shrink-0" />
            ) : (
              <ChevronDown className="w-6 h-6 text-cyan-400 shrink-0" />
            )}
          </button>
          {isRightsExpanded && (
            <div id="rights-content" className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 sm:p-4 space-y-3">
              <ul className="list-none space-y-3 pl-0">
              {rights.filter((right) => right.is_active !== false).map((right) => (
                <li key={right.id} className="flex flex-wrap items-center gap-2 text-base sm:flex-nowrap">
                  <span className="text-zinc-400 shrink-0" aria-hidden>-</span>
                  {/* 権利名・使用単位 */}
                  <span className={`flex-1 min-w-0 ${right.count > 0 ? 'text-zinc-50' : 'text-zinc-300'}`}>
                    権利{right.code}｜{right.name}
                    {right.unit && <span className="text-zinc-400 text-sm ml-1">（{right.unit}）</span>}
                  </span>

                  {/* 1回あたりの利用ポイント */}
                  <span className="text-zinc-100 text-sm whitespace-nowrap">- {right.points}G/1回</span>

                  {/* ポイント表示（数字を大きく） */}
                  <span className="text-lg text-red-400 font-medium whitespace-nowrap min-w-16 text-right tabular-nums">
                    {right.count > 0 ? `- ${right.points * right.count}G` : ''}
                  </span>

                  {/* モバイル：スライダー＋数値表示（押しやすい大きめつまみ・数字大きく） */}
                  <div className="flex sm:hidden items-center gap-3 w-full min-w-0 mt-1 pl-6">
                    <input
                      type="range"
                      min={0}
                      max={MAX_RIGHT_COUNT}
                      value={right.count}
                      onChange={(e) => updateRightCount(right.id, parseInt(e.target.value, 10) || 0)}
                      disabled={!isEditable}
                      className="rights-count-range flex-1 min-w-0 h-10 accent-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      aria-label={`権利${right.code}の利用回数`}
                    />
                    <span className="text-xl font-semibold tabular-nums w-10 text-right text-zinc-50 shrink-0" aria-hidden>
                      {right.count}
                    </span>
                  </div>

                  {/* デスクトップ：［－］［数値］［＋］ブロック（横幅控えめ・数字は上下左右中央） */}
                  <div className="hidden sm:flex items-stretch border border-zinc-600 rounded-lg overflow-hidden shrink-0 bg-zinc-800">
                    <button
                      type="button"
                      onClick={() => updateRightCount(right.id, right.count - 1)}
                      disabled={!isEditable || right.count <= 0}
                      className="min-w-[36px] min-h-[44px] flex items-center justify-center text-lg font-bold text-zinc-300 hover:bg-zinc-700 hover:text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      aria-label={`権利${right.code}を1減らす`}
                    >
                      −
                    </button>
                    <Input
                      type="number"
                      min={0}
                      max={MAX_RIGHT_COUNT}
                      value={right.count}
                      onChange={(e) => updateRightCount(right.id, parseInt(e.target.value, 10) || 0)}
                      disabled={!isEditable}
                      className="rights-count-input w-14 h-11 bg-zinc-800 border-0 border-x border-zinc-600 text-zinc-50 text-xl font-semibold tabular-nums focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-none py-0 px-3 box-border text-center"
                      style={{
                        textAlign: 'center',
                        lineHeight: '2.75rem',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => updateRightCount(right.id, right.count + 1)}
                      disabled={!isEditable || right.count >= MAX_RIGHT_COUNT}
                      className="min-w-[36px] min-h-[44px] flex items-center justify-center text-lg font-bold text-zinc-300 hover:bg-zinc-700 hover:text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      aria-label={`権利${right.code}を1増やす`}
                    >
                      ＋
                    </button>
                  </div>
                </li>
              ))}
              </ul>

              {/* 合計ポイント */}
              {totalPoints > 0 && (
                <div className="pt-3 mt-3 border-t border-zinc-800 text-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-200 font-medium">本日消費ゴルド合計</span>
                    <span className="text-red-400 font-bold">- {totalPoints}G</span>
                  </div>
                </div>
              )}

              {/* 権利設定へのリンク */}
              <div className="pt-3 mt-3 border-t border-zinc-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const hasUnsaved = rights.some((r, i) => {
                      const saved = (dailyLog as unknown as Record<string, number>)?.[RIGHT_COLUMNS_BY_INDEX[i]] ?? 0;
                      return r.count !== saved;
                    });
                    if (hasUnsaved) {
                      const ok = window.confirm('権利の入力内容が未保存です。\n設定に移動すると入力内容がリセットされます。移動しますか？');
                      if (!ok) return;
                    }
                    const date = logDate || dailyLog?.log_date;
                    router.push(date ? `/settings/rights?returnDate=${date}` : '/settings/rights');
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  <Settings className="w-4 h-4" />
                  権利設定
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 日誌を保存ボタン・確定ボタン（確定は初回AI判定実行まで無効） */}
      {isEditable && (
        <div className="flex flex-col items-center gap-2">
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
                disabled={
                  isConfirming ||
                  (!aiJudgmentResult &&
                    !(dailyLog && dailyLog.ai_condition_body != null && dailyLog.ai_condition_mood != null))
                }
                aria-label="日誌を確定する"
                aria-busy={isConfirming}
                title={
                  !aiJudgmentResult &&
                  !(dailyLog && dailyLog.ai_condition_body != null && dailyLog.ai_condition_mood != null)
                    ? 'AI判定を実行してから確定できます'
                    : undefined
                }
                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:pointer-events-none"
                size="lg"
              >
                <Check className="w-4 h-4 mr-1" />
                確定
              </Button>
            )}
          </div>
          {!isConfirmed && (
            <p className="text-zinc-400 text-xs text-center">
              {isConfirming ? '確定処理中…' : 'AI判定を実行するまで確定できません'}
            </p>
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
              <ChevronDown className="w-6 h-6 text-cyan-400 shrink-0" />
            )}
          </button>
          {isAiExpanded && (
            <div id="ai-content" className="space-y-6">
              {/* AI一括生成（判定＋あらすじ＋アドバイス）。日誌ごと2回まで。 */}
        {isEditable && (
          <div className="text-center space-y-2">
            <Button
              onClick={handleBatchRun}
              disabled={isJudging || (dailyLog?.ai_batch_run_count ?? 0) >= 2}
              aria-label={aiJudgmentResult || aiStoryPast || aiAdvice || aiAdviceTension ? 'AIを再生成する' : 'AI判定を実行する'}
              aria-busy={isJudging}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              size="lg"
            >
              <Bot className="w-4 h-4 mr-1.5" />
              {isJudging ? '生成中...' : (aiJudgmentResult || aiStoryPast || aiAdvice || aiAdviceTension ? '再生成' : 'AI判定を実行')}
            </Button>
            <p className="text-zinc-500 text-xs">再生成回数は2回まで</p>
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
              <div>
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                  <h4 className="text-base font-medium text-cyan-400">総評</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {SPEECH_RATES.map(({ label, rate }) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setSpeechRate(rate)}
                          className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${speechRate === rate ? 'bg-cyan-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => speak(aiJudgmentResult.reasoning, 'reasoning')}
                      className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-cyan-400 transition-colors"
                      aria-label={speakingTarget === 'reasoning' ? '読み上げを停止' : '総評を音声で読み上げ'}
                    >
                      {speakingTarget === 'reasoning' ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      <span className="hidden sm:inline">{speakingTarget === 'reasoning' ? '停止' : '読み上げ'}</span>
                    </button>
                  </div>
                </div>
                <div className="text-base text-zinc-300 bg-zinc-900 rounded p-3">
                  {aiJudgmentResult.reasoning}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* 獲得スコア（内訳・総計）。ToDo・習慣・悪習慣・AI・権利を含む。権利消費は「本日消費ゴルド合計」と整合させるためクライアントの totalPoints を使用 */}
        {scoreBreakdown && scoreDisplay && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-2">
            <h3 className="text-lg font-medium text-cyan-400">獲得スコア</h3>
            <p className="text-zinc-300 text-xs">日誌確定後にスコアは獲得されます</p>
            <div className="text-base space-y-2 text-zinc-300">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="shrink-0">ToDo:</span>
                <span className="inline-flex flex-wrap items-center gap-x-[15px] gap-y-0.5 text-[17px]">
                  <span className={`font-medium shrink-0 ${scoreBreakdown.todo.points_delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>{scoreBreakdown.todo.points_delta >= 0 ? '+' : '-'} {Math.abs(scoreBreakdown.todo.points_delta)}G</span>
                  <ExpWithIcons body={scoreBreakdown.todo.exp_body_delta} mind={scoreBreakdown.todo.exp_mind_delta} spirit={scoreBreakdown.todo.exp_spirit_delta} signed />
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="shrink-0">良習慣:</span>
                <span className="inline-flex flex-wrap items-center gap-x-[15px] gap-y-0.5 text-[17px]">
                  <span className="text-green-400 font-medium shrink-0">+ {scoreBreakdown.habits_good.points_delta}G</span>
                  <ExpWithIcons body={scoreBreakdown.habits_good.exp_body_delta} mind={scoreBreakdown.habits_good.exp_mind_delta} spirit={scoreBreakdown.habits_good.exp_spirit_delta} />
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="shrink-0">AI判定:</span>
                <span className="inline-flex flex-wrap items-center gap-x-[15px] gap-y-0.5 text-[17px]">
                  <span className="text-purple-400 font-medium shrink-0">+ {scoreBreakdown.ai.points_delta}G</span>
                  <ExpWithIcons body={scoreBreakdown.ai.exp_body_delta} mind={scoreBreakdown.ai.exp_mind_delta} spirit={scoreBreakdown.ai.exp_spirit_delta} />
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="shrink-0">悪習慣（マイナス）:</span>
                <span className="inline-flex flex-wrap items-center gap-x-[15px] gap-y-0.5 text-[17px]">
                  <span className="text-red-400 font-medium shrink-0">- {Math.abs(scoreBreakdown.habits_bad.points_delta)}G</span>
                  <ExpWithIcons body={scoreBreakdown.habits_bad.exp_body_delta} mind={scoreBreakdown.habits_bad.exp_mind_delta} spirit={scoreBreakdown.habits_bad.exp_spirit_delta} signed />
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="shrink-0">権利消費（マイナス）:</span>
                <span className="text-[17px]">
                  <span className="text-orange-400 font-medium">- {totalPoints}G</span>
                </span>
              </div>
            </div>
            {/* 総加算 − 総減算 = 今回の獲得 */}
            <div className="pt-3 mt-3 border-t border-zinc-600 text-base space-y-1.5">
              <div className="text-zinc-300">
                <span className="text-zinc-300">総加算ゴルド</span>
                <span className="text-green-400 font-medium mx-1">+ {scoreDisplay.pointsAdd}G</span>
                <span className="text-zinc-500 mx-1">−</span>
                <span className="text-zinc-300">総減算ゴルド</span>
                <span className="text-red-400 font-medium mx-1">- {scoreDisplay.pointsSub}G</span>
                <span className="text-zinc-500 mx-1">=</span>
                <span className="inline-flex items-center text-[18px]">
                  <span className="text-zinc-300 font-bold">今回の獲得ゴルド</span>
                  <span className={`font-bold ml-1 ${scoreDisplay.adjustedTotalPoints >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {scoreDisplay.adjustedTotalPoints >= 0 ? '+' : '-'} {Math.abs(scoreDisplay.adjustedTotalPoints)}G
                  </span>
                </span>
              </div>
              {scoreDisplay.hasAnyExp && (
                <div className="text-zinc-300 text-base flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-zinc-300 shrink-0">総加算EXP</span>
                  <span className="text-cyan-400">
                    <ExpWithIcons body={scoreDisplay.expBodyAdd} mind={scoreDisplay.expMindAdd} spirit={scoreDisplay.expSpiritAdd} />
                  </span>
                  <span className="text-zinc-500 shrink-0">−</span>
                  <span className="text-zinc-300 shrink-0">総減算EXP</span>
                  <span className="text-cyan-400">
                    <ExpWithIcons body={scoreDisplay.expBodySub} mind={scoreDisplay.expMindSub} spirit={scoreDisplay.expSpiritSub} minus />
                  </span>
                  <span className="text-zinc-500 shrink-0">=</span>
                  <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[18px] font-bold shrink-0">
                    <span className="text-zinc-300">今回の獲得EXP</span>
                    <span className="text-cyan-400">
                      <ExpWithIcons
                        body={scoreBreakdown.total.exp_body_delta}
                        mind={scoreBreakdown.total.exp_mind_delta}
                        spirit={scoreBreakdown.total.exp_spirit_delta}
                        signed
                      />
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AIあらすじ（一括生成で判定・あらすじ・アドバイスをまとめて生成）・アコーディオン */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setIsStoryExpanded(!isStoryExpanded)}
            className="w-full flex items-center justify-between gap-2 hover:opacity-80 transition-opacity text-left"
            aria-expanded={isStoryExpanded}
            aria-controls="ai-story-content"
          >
            <h3 className="text-xl font-medium text-cyan-400">あらすじ</h3>
            {isStoryExpanded ? (
              <ChevronUp className="w-5 h-5 text-zinc-400 shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-cyan-400 shrink-0" />
            )}
          </button>
          {isStoryExpanded && (
            <div id="ai-story-content" className="space-y-3">
              {isJudging ? (
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <Skeleton className="h-4 w-full mb-2 bg-zinc-700" />
                  <Skeleton className="h-4 w-full mb-2 bg-zinc-700" />
                  <Skeleton className="h-4 w-full mb-2 bg-zinc-700" />
                  <Skeleton className="h-4 w-3/4 bg-zinc-700" />
                </div>
              ) : aiStoryPast ? (
                <>
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <p className="text-zinc-300 whitespace-pre-wrap">{renderAiText(aiStoryPast, { blankEveryTwoLines: true })}</p>
                  </div>
                  <div className="mt-1.5 flex items-center justify-end gap-3 flex-wrap" aria-live="polite">
                    <div className="flex items-center gap-1">
                      {SPEECH_RATES.map(({ label, rate }) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setSpeechRate(rate)}
                          className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${speechRate === rate ? 'bg-cyan-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => speak(aiStoryPast, 'story')}
                      className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-cyan-400 transition-colors"
                      aria-label={speakingTarget === 'story' ? '読み上げを停止' : 'あらすじを音声で読み上げ'}
                    >
                      {speakingTarget === 'story' ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      <span className="hidden sm:inline">{speakingTarget === 'story' ? '停止' : '読み上げ'}</span>
                    </button>
                    <span className="text-xs text-zinc-600">{(aiStoryPast ?? '').length}文字</span>
                  </div>
                </>
              ) : (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <p className="text-zinc-500 text-sm">未生成</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* コーチング アドバイス（弛緩・緊張・一括生成）・アコーディオン */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setIsAdviceExpanded(!isAdviceExpanded)}
            className="w-full flex items-center justify-between gap-2 hover:opacity-80 transition-opacity text-left"
            aria-expanded={isAdviceExpanded}
            aria-controls="ai-advice-content"
          >
            <h3 className="text-lg font-medium text-cyan-400">コーチング アドバイス</h3>
            {isAdviceExpanded ? (
              <ChevronUp className="w-5 h-5 text-zinc-400 shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-cyan-400 shrink-0" />
            )}
          </button>
          {isAdviceExpanded && (
            <div id="ai-advice-content" className="space-y-6">
              <div>
                <p className="text-base font-medium text-zinc-200 mb-2">弛緩のコーチング</p>
                {isJudging ? (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <Skeleton className="h-4 w-full mb-2 bg-zinc-700" />
                    <Skeleton className="h-4 w-3/4 bg-zinc-700" />
                  </div>
                ) : aiAdvice ? (
                  <>
                    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                      <p className="text-zinc-300 whitespace-pre-wrap">{renderAiText(aiAdvice, { blankEveryTwoLines: true })}</p>
                    </div>
                    <div className="mt-1.5 flex items-center justify-end gap-3 flex-wrap" aria-live="polite">
                      <div className="flex items-center gap-1">
                        {SPEECH_RATES.map(({ label, rate }) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setSpeechRate(rate)}
                            className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${speechRate === rate ? 'bg-cyan-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => speak(aiAdvice, 'adviceRelax')}
                        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-cyan-400 transition-colors"
                        aria-label={speakingTarget === 'adviceRelax' ? '読み上げを停止' : '弛緩コーチングを音声で読み上げ'}
                      >
                        {speakingTarget === 'adviceRelax' ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        <span className="hidden sm:inline">{speakingTarget === 'adviceRelax' ? '停止' : '読み上げ'}</span>
                      </button>
                      <span className="text-xs text-zinc-600">{(aiAdvice ?? '').length}文字</span>
                    </div>
                  </>
                ) : (
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                    <p className="text-zinc-500 text-sm">未生成（上の「AI判定を実行」で一括生成）</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-base font-medium text-zinc-200 mb-2">緊張のコーチング</p>
                {isJudging ? (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <Skeleton className="h-4 w-full mb-2 bg-zinc-700" />
                    <Skeleton className="h-4 w-3/4 bg-zinc-700" />
                  </div>
                ) : aiAdviceTension ? (
                  <>
                    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                      <p className="text-zinc-300 whitespace-pre-wrap">{renderAiText(aiAdviceTension, { blankEveryTwoLines: true })}</p>
                    </div>
                    <div className="mt-1.5 flex items-center justify-end gap-3 flex-wrap" aria-live="polite">
                      <div className="flex items-center gap-1">
                        {SPEECH_RATES.map(({ label, rate }) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setSpeechRate(rate)}
                            className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${speechRate === rate ? 'bg-cyan-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => speak(aiAdviceTension, 'adviceTension')}
                        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-cyan-400 transition-colors"
                        aria-label={speakingTarget === 'adviceTension' ? '読み上げを停止' : '緊張コーチングを音声で読み上げ'}
                      >
                        {speakingTarget === 'adviceTension' ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        <span className="hidden sm:inline">{speakingTarget === 'adviceTension' ? '停止' : '読み上げ'}</span>
                      </button>
                      <span className="text-xs text-zinc-600">{(aiAdviceTension ?? '').length}文字</span>
                    </div>
                  </>
                ) : (
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                    <p className="text-zinc-500 text-sm">未生成（上の「AI判定を実行」で一括生成）</p>
                  </div>
                )}
              </div>
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
