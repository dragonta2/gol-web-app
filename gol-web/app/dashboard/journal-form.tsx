'use client';

import { useState, useMemo, memo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormInput, FormTextarea } from '@/components/ui/form-input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { fetchWithRetry } from '@/lib/api-retry';
import type { DailyLog } from '@/lib/types';
import { Edit, MessageSquare, Gift, Save, Bot, ChevronDown, ChevronUp } from 'lucide-react';

interface Right {
  id: string;
  code: string;
  name: string;
  points: number;
  maxCount?: number;
  count: number;
}

interface JournalFormProps {
  dailyLogId: string | null;
  dailyLog: DailyLog | null;
  logDate?: string; // 選択された日付（YYYY-MM-DD形式）
}

interface AIJudgmentResult {
  condition_body: number;
  condition_mood: number;
  reasoning: string;
}

interface AIAdviceResult {
  advice: string;
}

interface AIStoryResult {
  story: string;
}

function JournalForm({ dailyLogId, dailyLog, logDate, expandedStates, onExpandedStateChange }: JournalFormProps) {
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

  // 権利設定を取得
  const [rightsConfig, setRightsConfig] = useState<Record<string, { points: number; name: string; maxCount?: number }>>({
    A: { points: 5, name: 'TVゲーム2時間' },
    B: { points: 4, name: 'お酒4杯まで' },
    C: { points: 1, name: '食事時動画1時間毎', maxCount: 10 },
    D: { points: 0, name: '睡眠導入剤' },
    E: { points: 3, name: '朝食 or 昼食を食べる', maxCount: 3 },
    F: { points: 10, name: 'EMKF' },
    O: { points: 5, name: 'ON (PLN以外)' },
    U: { points: 1, name: '宇都宮ダンス' },
    X: { points: 10, name: 'PLN動画 & ON 1時間' },
  });

  // 権利設定をAPIから取得
  useEffect(() => {
    const fetchRightsConfig = async () => {
      try {
        const response = await fetch('/api/settings/rights');
        const result = await response.json();
        if (response.ok && result.rightsConfig) {
          setRightsConfig(result.rightsConfig);
        }
      } catch (error) {
        console.error('権利設定取得エラー:', error);
        // エラー時はデフォルト値のまま
      }
    };
    fetchRightsConfig();
  }, []);

  // dailyLogから初期値を計算（useMemoでキャッシュ）
  const initialValues = useMemo(() => {
    const rightsMapping: Record<string, string> = {
      A: 'right_a_count',
      B: 'right_b_count',
      C: 'right_c_count',
      D: 'right_d_count',
      E: 'right_e_count',
      F: 'right_f_count',
      O: 'right_o_count',
      U: 'right_u_count',
      X: 'right_x_count',
    };

    return {
      rights: Object.entries(rightsMapping).map(([code, countKey], index) => {
        const config = rightsConfig[code] || { points: 0, name: `権利${code}` };
        return {
          id: String(index + 1),
          code,
          name: config.name,
          points: config.points,
          maxCount: config.maxCount,
          count: (dailyLog as any)?.[countKey] || 0,
        } as Right;
      }),
    };
  }, [dailyLog, rightsConfig]);

  // 日誌の本文と一言感想は新しいコンポーネント（JournalImpressionSections）で管理されるため、
  // ここではdailyLogから取得する（AI判定や保存処理で使用）
  const journalText = dailyLog?.journal_text || '';
  const impressionText = dailyLog?.one_line_comment || '';

  // 利用ポイント（権利）
  const [rights, setRights] = useState<Right[]>(initialValues.rights);

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

  // AIアドバイス
  const [aiAdvice, setAIAdvice] = useState<string | null>(dailyLog?.ai_advice || null);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);

  // AIあらすじ
  const [aiStory, setAIStory] = useState<string | null>(dailyLog?.ai_story_past || null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  // 権利の回数更新
  const updateRightCount = (rightId: string, newCount: number) => {
    setRights(rights.map(right => {
      if (right.id === rightId) {
        const maxCount = right.maxCount || 99; // 上限設定（デフォルト99）
        return { ...right, count: Math.max(0, Math.min(newCount, maxCount)) };
      }
      return right;
    }));
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
      const { error } = await supabase
        .from('daily_logs')
        .update({
          // journal_textとone_line_commentはJournalImpressionSectionsで自動保存されるため、ここでは更新しない
          right_a_count: rights.find(r => r.code === 'A')?.count || 0,
          right_b_count: rights.find(r => r.code === 'B')?.count || 0,
          right_c_count: rights.find(r => r.code === 'C')?.count || 0,
          right_d_count: rights.find(r => r.code === 'D')?.count || 0,
          right_e_count: rights.find(r => r.code === 'E')?.count || 0,
          right_f_count: rights.find(r => r.code === 'F')?.count || 0,
          right_o_count: rights.find(r => r.code === 'O')?.count || 0,
          right_u_count: rights.find(r => r.code === 'U')?.count || 0,
          right_x_count: rights.find(r => r.code === 'X')?.count || 0,
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

  // ポイント/EXP自動計算ロジック
  const calculatePointsAndExp = (conditionBody: number, conditionMood: number) => {
    // 体調スコアと気分スコアの平均からポイントとEXPを計算
    const averageScore = (conditionBody + conditionMood) / 2;

    // ポイント計算（0-100点 → 0-50ポイント）
    const points = Math.round(averageScore / 2);

    // EXP計算（体調スコア → 身体EXP、気分スコア → 精神EXP、平均 → 頭脳EXP）
    const expBody = Math.round(conditionBody / 10);
    const expMind = Math.round(averageScore / 10);
    const expSpirit = Math.round(conditionMood / 10);

    return {
      points,
      exp_body: expBody,
      exp_mind: expMind,
      exp_spirit: expSpirit,
    };
  };

  // AI判定実行ハンドラー（dailyLogから最新の値を取得）
  const handleAIJudgment = async () => {
    if (!dailyLogId) {
      toast.error('日誌IDが取得できませんでした', {
        description: 'ページをリロードしてください',
      });
      return;
    }

    // dailyLogから最新の値を取得（新しいコンポーネントで保存された値）
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

    setIsJudging(true);
    try {
      // AI判定APIを呼び出し（リトライ機能付き）
      const response = await fetchWithRetry(
        '/api/ai/judgment',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            journalText: currentJournalText,
            impressionText: currentImpressionText,
          }),
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
        }
      );

      const result: AIJudgmentResult = await response.json();
      setAIJudgmentResult(result);

      // ポイント/EXPを計算
      const { points, exp_body, exp_mind, exp_spirit } = calculatePointsAndExp(
        result.condition_body,
        result.condition_mood
      );

      // daily_logsにAI判定結果を保存
      const { error } = await supabase
        .from('daily_logs')
        .update({
          ai_condition_body: result.condition_body,
          ai_condition_mood: result.condition_mood,
          ai_points_earned: points,
          ai_exp_body: exp_body,
          ai_exp_mind: exp_mind,
          ai_exp_spirit: exp_spirit,
        })
        .eq('id', dailyLogId);

      if (error) {
        console.error('AI判定結果の保存エラー:', error);
        toast.error('AI判定結果の保存に失敗しました', {
          description: error.message || 'データベースエラーが発生しました',
        });
        return;
      }

      toast.success('AI判定が完了しました', {
        description: `体調: ${result.condition_body}点 / 気分: ${result.condition_mood}点`,
      });

      // profilesテーブルのポイント/EXPを更新
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!authError && user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('points, exp_body, exp_mind, exp_spirit')
          .eq('id', user.id)
          .single();

        if (!profileError && profile) {
          await supabase
            .from('profiles')
            .update({
              points: profile.points + points,
              exp_body: profile.exp_body + exp_body,
              exp_mind: profile.exp_mind + exp_mind,
              exp_spirit: profile.exp_spirit + exp_spirit,
            })
            .eq('id', user.id);
        }
      }

      // ページをリフレッシュして最新データを取得
      router.refresh();
    } catch (error) {
      console.error('AI判定エラー:', error);
      // エラーレスポンスから詳細を取得
      let errorMessage = '予期しないエラーが発生しました';
      let errorDetails = '';
      
      if (error instanceof Response) {
        try {
          const errorData = await error.json();
          errorMessage = errorData.error || `HTTP ${error.status}: ${error.statusText}`;
          errorDetails = errorData.details || errorData.message || '';
          
          // 環境変数エラーの場合、より詳細なメッセージを表示
          if (errorData.code === 'MISSING_API_KEY') {
            errorMessage = 'OpenAI APIキーが設定されていません';
            errorDetails = '.env.localファイルにOPENAI_API_KEYを設定してください。';
          }
        } catch (parseError) {
          errorMessage = `HTTP ${error.status}: ${error.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error('AI判定に失敗しました', {
        description: errorDetails || errorMessage,
        duration: 10000, // エラーメッセージを10秒間表示
      });
    } finally {
      setIsJudging(false);
    }
  };

  // AIアドバイス生成ハンドラー
  const handleGenerateAdvice = async () => {
    if (!dailyLogId) {
      toast.error('日誌IDが取得できませんでした', {
        description: 'ページをリロードしてください',
      });
      return;
    }

    if (!aiJudgmentResult) {
      toast.error('先にAI判定を実行してください');
      return;
    }
    // dailyLogから最新の値を取得
    const currentJournalText = dailyLog?.journal_text || '';
    const currentImpressionText = dailyLog?.one_line_comment || '';

    if (currentJournalText.length > journalMaxLength) {
      toast.error(`日誌本文は${journalMaxLength}文字以内で入力してください`);
      return;
    }
    if (currentImpressionText.length > impressionMaxLength) {
      toast.error(`一言感想は${impressionMaxLength}文字以内で入力してください`);
      return;
    }

    setIsGeneratingAdvice(true);
    try {
      // AIアドバイス生成APIを呼び出し（リトライ機能付き）
      const response = await fetchWithRetry(
        '/api/ai/advice',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            journalText: currentJournalText,
            impressionText: currentImpressionText,
            conditionBody: aiJudgmentResult.condition_body,
            conditionMood: aiJudgmentResult.condition_mood,
          }),
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
        }
      );

      const result: AIAdviceResult = await response.json();
      setAIAdvice(result.advice);

      // daily_logsにAIアドバイスを保存
      const { error } = await supabase
        .from('daily_logs')
        .update({
          ai_advice: result.advice,
        })
        .eq('id', dailyLogId);

      if (error) {
        console.error('AIアドバイスの保存エラー:', error);
        toast.warning('アドバイスの保存に失敗しました', {
          description: '生成は完了しましたが、保存できませんでした',
        });
      } else {
        toast.success('AIアドバイスを生成しました');
      }
    } catch (error) {
      console.error('AIアドバイス生成エラー:', error);
      // エラーレスポンスから詳細を取得
      let errorMessage = '予期しないエラーが発生しました';
      if (error instanceof Response) {
        try {
          const errorData = await error.json();
          errorMessage = errorData.error || errorData.message || `HTTP ${error.status}: ${error.statusText}`;
        } catch {
          errorMessage = `HTTP ${error.status}: ${error.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error('AIアドバイス生成に失敗しました', {
        description: errorMessage,
      });
    } finally {
      setIsGeneratingAdvice(false);
    }
  };

  // AIあらすじ生成ハンドラー
  const handleGenerateStory = async () => {
    if (!dailyLogId) {
      toast.error('日誌IDが取得できませんでした', {
        description: 'ページをリロードしてください',
      });
      return;
    }
    // dailyLogから最新の値を取得
    const currentJournalText = dailyLog?.journal_text || '';
    const currentImpressionText = dailyLog?.one_line_comment || '';

    if (currentJournalText.length > journalMaxLength) {
      toast.error(`日誌本文は${journalMaxLength}文字以内で入力してください`);
      return;
    }
    if (currentImpressionText.length > impressionMaxLength) {
      toast.error(`一言感想は${impressionMaxLength}文字以内で入力してください`);
      return;
    }

    setIsGeneratingStory(true);
    try {
      // 習慣とToDoの情報を取得（簡易版：空配列で実装）
      const habits: string[] = [];
      const todos: string[] = [];

      // AIあらすじ生成APIを呼び出し（リトライ機能付き）
      const response = await fetchWithRetry(
        '/api/ai/story',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            journalText: currentJournalText,
            impressionText: currentImpressionText,
            habits,
            todos,
          }),
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
        }
      );

      const result: AIStoryResult = await response.json();
      setAIStory(result.story);

      // daily_logsにAIあらすじを保存
      const { error } = await supabase
        .from('daily_logs')
        .update({
          ai_story_past: result.story,
        })
        .eq('id', dailyLogId);

      if (error) {
        console.error('AIあらすじの保存エラー:', error);
        toast.warning('あらすじの保存に失敗しました', {
          description: '生成は完了しましたが、保存できませんでした',
        });
      } else {
        toast.success('AIあらすじを生成しました');
      }
    } catch (error) {
      console.error('AIあらすじ生成エラー:', error);
      // エラーレスポンスから詳細を取得
      let errorMessage = '予期しないエラーが発生しました';
      if (error instanceof Response) {
        try {
          const errorData = await error.json();
          errorMessage = errorData.error || errorData.message || `HTTP ${error.status}: ${error.statusText}`;
        } catch {
          errorMessage = `HTTP ${error.status}: ${error.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error('AIあらすじ生成に失敗しました', {
        description: errorMessage,
      });
    } finally {
      setIsGeneratingStory(false);
    }
  };

  // 合計消費ポイント計算
  const totalPoints = rights.reduce((sum, right) => sum + (right.points * right.count), 0);

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* 過去の日誌の場合の警告 */}
      {isPastDate && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
          <p className="text-yellow-400 text-center font-medium">
            ⚠️ 過去の日誌は閲覧専用です。編集することはできません。
          </p>
        </div>
      )}

      {/* 過去の日付で日誌が存在しない場合のメッセージ */}
      {isPastDate && !dailyLog && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-8 text-center">
          <p className="text-zinc-400 text-lg">
            この日付には日誌が記録されていません。
          </p>
        </div>
      )}


      {/* 本日の利用ポイント（過去の日付で日誌が存在する場合のみ表示） */}
      {(!isPastDate || dailyLog) && (
        <div>
          <button
            onClick={() => setIsRightsExpanded(!isRightsExpanded)}
            className="w-full text-left mb-2 sm:mb-3 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
            aria-expanded={isRightsExpanded}
            aria-controls="rights-content"
          >
            <h3 className="text-xl sm:text-2xl font-medium text-zinc-300 flex items-center gap-2">
              <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>本日の利用ポイント</span>
            </h3>
            {isRightsExpanded ? (
              <ChevronUp className="w-5 h-5 text-zinc-400 shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-400 shrink-0" />
            )}
          </button>
          {isRightsExpanded && (
            <div id="rights-content" className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 sm:p-4 space-y-3">
              {rights.map((right) => (
                <div key={right.id} className="flex items-center gap-3 text-base">
                  {/* 権利名 */}
                  <span className={`flex-1 ${right.count > 0 ? 'text-zinc-100' : 'text-zinc-400'}`}>
                    権利{right.code}｜{right.name}
                  </span>

                  {/* 数値入力 */}
                  <Input
                    type="number"
                    min="0"
                    max={right.maxCount || 99}
                    value={right.count}
                    onChange={(e) => updateRightCount(right.id, parseInt(e.target.value) || 0)}
                    disabled={isPastDate}
                    className="w-16 px-2 py-1 bg-zinc-800 border-zinc-600 text-zinc-100 text-center text-base focus:border-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  />

                  {/* ポイント表示（常に領域確保） */}
                  <span className="text-base text-red-400 font-medium whitespace-nowrap min-w-14 text-right">
                    {right.count > 0 ? `(-${right.points * right.count}pt)` : ''}
                  </span>
                </div>
              ))}

              {/* 合計ポイント */}
              {totalPoints > 0 && (
                <div className="pt-3 mt-3 border-t border-zinc-800 text-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-300 font-medium">本日消費ポイント合計</span>
                    <span className="text-red-400 font-bold">-{totalPoints}pt</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 日誌を保存ボタン */}
      {!isPastDate && (
        <div className="flex justify-center">
          <Button
            onClick={handleSave}
            aria-label="日誌を保存する"
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
            size="lg"
          >
            <Save className="w-4 h-4 mr-1" />
            日誌を保存
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
              <Bot className="w-6 h-6 sm:w-7 sm:h-7" />
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
              {/* AI判定実行ボタン */}
        {!isPastDate && (
          <div className="text-center">
            <Button
              onClick={handleAIJudgment}
              disabled={isJudging}
              aria-label="AI判定を実行する"
              aria-busy={isJudging}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              size="lg"
            >
              <Bot className="w-4 h-4 mr-1.5" />
              {isJudging ? 'AI判定中...' : 'AI判定を実行'}
            </Button>
          </div>
        )}
        {isPastDate && (
          <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
            <p className="text-zinc-400 text-sm">過去の日誌ではAI判定を実行できません</p>
          </div>
        )}

        {/* AI判定結果表示 */}
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
              <div className="text-sm text-zinc-300">
                <div>獲得ポイント: <span className="text-yellow-400 font-medium">+{dailyLog.ai_points_earned}pt</span></div>
                <div>獲得EXP: 身体+{dailyLog.ai_exp_body || 0} 頭脳+{dailyLog.ai_exp_mind || 0} 精神+{dailyLog.ai_exp_spirit || 0}</div>
              </div>
            )}
          </div>
        ) : null}

        {/* AIアドバイス生成 */}
        {aiJudgmentResult && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-cyan-400">辛口コーチング アドバイス</h3>
              {!aiAdvice && !isGeneratingAdvice && !isPastDate && (
                <Button
                  onClick={handleGenerateAdvice}
                  disabled={isGeneratingAdvice}
                  aria-label="辛口コーチング アドバイスを生成する"
                  aria-busy={isGeneratingAdvice}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  size="sm"
                >
                  生成
                </Button>
              )}
              {isGeneratingAdvice && (
                <span className="text-sm text-zinc-400">生成中...</span>
              )}
            </div>
            {isGeneratingAdvice ? (
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <Skeleton className="h-4 w-full mb-2 bg-zinc-700" />
                <Skeleton className="h-4 w-full mb-2 bg-zinc-700" />
                <Skeleton className="h-4 w-3/4 bg-zinc-700" />
              </div>
            ) : aiAdvice ? (
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <p className="text-zinc-300 whitespace-pre-wrap">{aiAdvice}</p>
              </div>
            ) : null}
          </div>
        )}

        {/* AIあらすじ生成 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-cyan-400">RPG物語風あらすじ</h3>
            {!aiStory && !isGeneratingStory && !isPastDate && (
              <Button
                onClick={handleGenerateStory}
                disabled={isGeneratingStory}
                aria-label="RPG物語風あらすじを生成する"
                aria-busy={isGeneratingStory}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                size="sm"
              >
                生成
              </Button>
            )}
            {isGeneratingStory && (
              <span className="text-sm text-zinc-400">生成中...</span>
            )}
          </div>
          {isGeneratingStory ? (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <Skeleton className="h-4 w-full mb-2 bg-zinc-700" />
              <Skeleton className="h-4 w-full mb-2 bg-zinc-700" />
              <Skeleton className="h-4 w-full mb-2 bg-zinc-700" />
              <Skeleton className="h-4 w-3/4 bg-zinc-700" />
            </div>
          ) : aiStory ? (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <p className="text-zinc-300 whitespace-pre-wrap">{aiStory}</p>
            </div>
          ) : null}
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
