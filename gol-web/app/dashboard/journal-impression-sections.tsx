'use client';

import { useState, useEffect, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { DailyLog } from '@/lib/types';
import { Edit, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

interface JournalImpressionSectionsProps {
  dailyLogId: string | null;
  dailyLog: DailyLog | null;
  logDate?: string;
  expandedStates?: {
    journal?: boolean;
    impression?: boolean;
  };
  onExpandedStateChange?: (states: {
    journal?: boolean;
    impression?: boolean;
  }) => void;
}

function JournalImpressionSections({ 
  dailyLogId, 
  dailyLog, 
  logDate,
  expandedStates,
  onExpandedStateChange
}: JournalImpressionSectionsProps) {
  const router = useRouter();
  const supabase = createClient();

  const journalMaxLength = 3000;
  const impressionMaxLength = 500;

  // アコーディオンの開閉状態を管理（外部制御があればそれを使用、なければ内部状態）
  const [internalJournalExpanded, setInternalJournalExpanded] = useState(true);
  const [internalImpressionExpanded, setInternalImpressionExpanded] = useState(true);

  const isJournalExpanded = expandedStates?.journal ?? internalJournalExpanded;
  const isImpressionExpanded = expandedStates?.impression ?? internalImpressionExpanded;

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

  // expandedStatesが外部から変更された場合、内部状態を同期
  useEffect(() => {
    if (expandedStates) {
      if (expandedStates.journal !== undefined) {
        setInternalJournalExpanded(expandedStates.journal);
      }
      if (expandedStates.impression !== undefined) {
        setInternalImpressionExpanded(expandedStates.impression);
      }
    }
  }, [expandedStates]);

  // 選択された日付が今日より過去かどうかを判定
  const isPastDate = (() => {
    if (!logDate) return false;
    const selected = new Date(logDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
  })();

  // 選択された日付が今日かどうかを判定
  const isToday = (() => {
    if (!logDate) return true; // デフォルトは今日
    const selected = new Date(logDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    return selected.getTime() === today.getTime();
  })();

  // 日誌が確定済みかどうか
  const isConfirmed = dailyLog?.is_confirmed ?? false;

  // 編集可能かどうか（当日 OR 未確定の過去）
  const isEditable = isToday || (isPastDate && !isConfirmed);

  // 日誌本文と一言感想の状態
  const [journalText, setJournalText] = useState(dailyLog?.journal_text || '');
  const [impressionText, setImpressionText] = useState(dailyLog?.one_line_comment || '');

  // dailyLogが変更されたときに状態を更新
  useEffect(() => {
    if (dailyLog) {
      setJournalText(dailyLog.journal_text || '');
      setImpressionText(dailyLog.one_line_comment || '');
    } else {
      setJournalText('');
      setImpressionText('');
    }
  }, [dailyLog]);

  // デバウンス用のタイマー
  const journalTextTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const impressionTextTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 日誌本文の保存（デバウンス付き）
  const handleJournalTextChange = (value: string) => {
    setJournalText(value);
    if (!dailyLogId || !isEditable) return;

    // 既存のタイマーをクリア
    if (journalTextTimeoutRef.current) {
      clearTimeout(journalTextTimeoutRef.current);
    }

    // デバウンス: 500ms待ってから保存
    journalTextTimeoutRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from('daily_logs')
        .update({ journal_text: value })
        .eq('id', dailyLogId);

      if (error) {
        console.error('日誌本文の保存エラー:', error);
        toast.error('日誌本文の保存に失敗しました');
      } else {
        // 保存成功後、ページをリフレッシュして最新データを取得
        router.refresh();
      }
    }, 500);
  };

  // 一言感想の保存（デバウンス付き）
  const handleImpressionTextChange = (value: string) => {
    setImpressionText(value);
    if (!dailyLogId || !isEditable) return;

    // 既存のタイマーをクリア
    if (impressionTextTimeoutRef.current) {
      clearTimeout(impressionTextTimeoutRef.current);
    }

    // デバウンス: 500ms待ってから保存
    impressionTextTimeoutRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from('daily_logs')
        .update({ one_line_comment: value })
        .eq('id', dailyLogId);

      if (error) {
        console.error('一言感想の保存エラー:', error);
        toast.error('一言感想の保存に失敗しました');
      } else {
        // 保存成功後、ページをリフレッシュして最新データを取得
        router.refresh();
      }
    }, 500);
  };

  // クリーンアップ: コンポーネントのアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (journalTextTimeoutRef.current) {
        clearTimeout(journalTextTimeoutRef.current);
      }
      if (impressionTextTimeoutRef.current) {
        clearTimeout(impressionTextTimeoutRef.current);
      }
    };
  }, []);

  // Textareaのref（必要に応じて使用）
  const journalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const impressionTextareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <>
      {/* 今日の日誌と一言感想（横並びカラム） */}
      {(!isPastDate || dailyLog) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* 今日の日誌 */}
          <div className="flex flex-col">
            <button
              onClick={() => setIsJournalExpanded(!isJournalExpanded)}
              className="w-full text-left mb-2 sm:mb-3 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
              aria-expanded={isJournalExpanded}
              aria-controls="journal-content"
            >
              <h3 className="text-xl sm:text-2xl font-medium text-zinc-300 flex items-center gap-2">
                <Edit className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>日誌</span>
              </h3>
              {isJournalExpanded ? (
                <ChevronUp className="w-5 h-5 text-zinc-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-400 flex-shrink-0" />
              )}
            </button>
            {isJournalExpanded && (
              <div id="journal-content" className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 sm:p-4 flex flex-col">
                <Textarea
                  ref={journalTextareaRef}
                  id="journal-text"
                  value={journalText}
                  onChange={(e) => handleJournalTextChange(e.target.value)}
                  maxLength={journalMaxLength}
                  placeholder="0730｜起床&#10;1000｜デスク向かう&#10;1200｜筋トレ&#10;..."
                  aria-label="日誌を入力する"
                  aria-describedby="journal-text-count"
                  disabled={!isEditable}
                  className="bg-zinc-800 border-zinc-600 text-zinc-100 focus:border-cyan-500 resize-none disabled:opacity-60 disabled:cursor-not-allowed w-full h-[600px] overflow-y-auto"
                />
                <div id="journal-text-count" className="mt-2 text-base text-zinc-500 text-right flex items-center justify-end gap-1 flex-shrink-0" aria-live="polite">
                  <Edit className="w-4 h-4" />
                  <span>{journalText.length} / {journalMaxLength}文字</span>
                </div>
              </div>
            )}
          </div>

          {/* 一言感想 */}
          <div className="flex flex-col">
            <button
              onClick={() => setIsImpressionExpanded(!isImpressionExpanded)}
              className="w-full text-left mb-2 sm:mb-3 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
              aria-expanded={isImpressionExpanded}
              aria-controls="impression-content"
            >
              <h3 className="text-xl sm:text-2xl font-medium text-zinc-300 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>感想</span>
              </h3>
              {isImpressionExpanded ? (
                <ChevronUp className="w-5 h-5 text-zinc-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-400 flex-shrink-0" />
              )}
            </button>
            {isImpressionExpanded && (
              <div id="impression-content" className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 sm:p-4 flex flex-col">
                <Textarea
                  ref={impressionTextareaRef}
                  id="impression-text"
                  value={impressionText}
                  onChange={(e) => handleImpressionTextChange(e.target.value)}
                  maxLength={impressionMaxLength}
                  placeholder="今日は久しぶりに運動ができて..."
                  aria-label="感想を入力する"
                  aria-describedby="impression-text-count"
                  disabled={!isEditable}
                  className="bg-zinc-800 border-zinc-600 text-zinc-100 focus:border-cyan-500 resize-none disabled:opacity-60 disabled:cursor-not-allowed w-full h-[600px] overflow-y-auto"
                />
                <div id="impression-text-count" className="mt-2 text-base text-zinc-500 text-right flex items-center justify-end gap-1 flex-shrink-0" aria-live="polite">
                  <Edit className="w-4 h-4" />
                  <span>{impressionText.length} / {impressionMaxLength}文字</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default memo(JournalImpressionSections);
