'use client';

import type { MutableRefObject } from 'react';
import { useState, useEffect, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { DailyLog } from '@/lib/types';
import { Edit, MessageSquare, ChevronDown, ChevronUp, Import, Loader2 } from 'lucide-react';

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
  /** 日誌確定済みのとき true（編集・自動保存を無効化） */
  isConfirmed?: boolean;
  /** AI判定実行時に親が参照する現在の日誌・感想テキスト（あれば更新する） */
  journalTextsRef?: MutableRefObject<{ journalText: string; impressionText: string }>;
}

function JournalImpressionSections({ 
  dailyLogId, 
  dailyLog, 
  logDate,
  expandedStates,
  onExpandedStateChange,
  isConfirmed: isConfirmedProp,
  journalTextsRef,
}: JournalImpressionSectionsProps) {
  const router = useRouter();
  const supabase = createClient();

  const journalMaxLength = 3000;
  const impressionMaxLength = 3000;

  // 日誌・感想エリア全体の折りたたみ（1つの枠でまとめるため1状態）
  const [internalSectionExpanded, setInternalSectionExpanded] = useState(true);
  const isSectionExpanded = expandedStates?.journal ?? expandedStates?.impression ?? internalSectionExpanded;

  const setSectionExpanded = (value: boolean) => {
    setInternalSectionExpanded(value);
    if (onExpandedStateChange) {
      onExpandedStateChange({ ...expandedStates, journal: value, impression: value });
    }
  };

  // expandedStatesが外部から変更された場合、内部状態を同期
  useEffect(() => {
    if (expandedStates?.journal !== undefined || expandedStates?.impression !== undefined) {
      const next = expandedStates?.journal ?? expandedStates?.impression ?? true;
      setInternalSectionExpanded(next);
    }
  }, [expandedStates?.journal, expandedStates?.impression]);

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

  // 日誌が確定済みかどうか（親から渡されていればそれを優先）
  const isConfirmed = isConfirmedProp ?? dailyLog?.is_confirmed ?? false;

  // 編集可能かどうか（未確定のときのみ。確定したら当日も編集不可）
  const isEditable = !isConfirmed;

  // 日誌本文と一言感想の状態
  const [journalText, setJournalText] = useState(dailyLog?.journal_text || '');
  const [impressionText, setImpressionText] = useState(dailyLog?.one_line_comment || '');

  const journalImpressionRef = useRef({ journalText: '', impressionText: '' });
  journalImpressionRef.current = { journalText, impressionText };

  // Notion 取り込み（許可されているアカウントのみボタン表示）
  const [notionImportAllowed, setNotionImportAllowed] = useState(false);
  const [notionImportLoading, setNotionImportLoading] = useState(false);
  const [notionConfirmOpen, setNotionConfirmOpen] = useState(false);
  const [notionFetched, setNotionFetched] = useState<{ journalText: string; impressionText: string }>({ journalText: '', impressionText: '' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/notion/import/allowed');
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        setNotionImportAllowed(data?.allowed === true);
      } catch {
        if (!cancelled) setNotionImportAllowed(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleNotionImport = async () => {
    const dateToUse = logDate ?? new Date().toISOString().slice(0, 10);
    if (!dateToUse) {
      toast.error('日付が選択されていません');
      return;
    }
    setNotionImportLoading(true);
    try {
      const res = await fetch('/api/notion/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logDate: dateToUse }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Notion の取得に失敗しました', { duration: 10000 });
        return;
      }
      const j = (data.journalText ?? '') as string;
      const i = (data.impressionText ?? '') as string;
      setNotionFetched({ journalText: j, impressionText: i });
      const current = journalImpressionRef.current;
      const hasExisting = (current.journalText?.trim() ?? '') !== '' || (current.impressionText?.trim() ?? '') !== '';
      if (hasExisting) {
        setNotionConfirmOpen(true);
      } else {
        setJournalText(j);
        setImpressionText(i);
        if (journalTextsRef?.current) {
          journalTextsRef.current.journalText = j;
          journalTextsRef.current.impressionText = i;
        }
        if (dailyLogId && isEditable) {
          const { error } = await supabase
            .from('daily_logs')
            .update({ journal_text: j, one_line_comment: i })
            .eq('id', dailyLogId);
          if (error) {
            console.error('Notion取り込み後の保存エラー:', error);
            toast.error('日誌・感想の保存に失敗しました');
          }
        }
        toast.success('Notion から取り込みました');
        router.refresh();
      }
    } catch {
      toast.error('Notion の取得に失敗しました');
    } finally {
      setNotionImportLoading(false);
    }
  };

  const applyNotionImport = async () => {
    const { journalText: j, impressionText: i } = notionFetched;
    setJournalText(j);
    setImpressionText(i);
    if (journalTextsRef?.current) {
      journalTextsRef.current.journalText = j;
      journalTextsRef.current.impressionText = i;
    }
    setNotionConfirmOpen(false);
    if (dailyLogId && isEditable) {
      const { error } = await supabase
        .from('daily_logs')
        .update({ journal_text: j, one_line_comment: i })
        .eq('id', dailyLogId);
      if (error) {
        console.error('Notion上書き後の保存エラー:', error);
        toast.error('日誌・感想の保存に失敗しました');
      }
    }
    toast.success('Notion の内容で上書きしました');
    router.refresh();
  };

  // 表示する日付（dailyLogId）が変わったときだけ props から状態を同期する。
  // dailyLog の参照が変わるたびに上書きすると、保存後の router.refresh() で
  // 入力中テキストが消えるため、日付変更時のみ同期する。
  useEffect(() => {
    if (dailyLog) {
      const j = dailyLog.journal_text || '';
      const i = dailyLog.one_line_comment || '';
      setJournalText(j);
      setImpressionText(i);
      if (journalTextsRef?.current) {
        journalTextsRef.current.journalText = j;
        journalTextsRef.current.impressionText = i;
      }
    } else {
      setJournalText('');
      setImpressionText('');
      if (journalTextsRef?.current) {
        journalTextsRef.current.journalText = '';
        journalTextsRef.current.impressionText = '';
      }
    }
  }, [dailyLogId, dailyLog?.id, journalTextsRef]);

  // デバウンス用のタイマー
  const journalTextTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const impressionTextTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 日誌本文の保存（デバウンス付き）
  const handleJournalTextChange = (value: string) => {
    setJournalText(value);
    if (journalTextsRef?.current) journalTextsRef.current.journalText = value;
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
    if (journalTextsRef?.current) journalTextsRef.current.impressionText = value;
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
      {/* 今日の日誌と一言感想（同一の背景枠内・エリア全体で折りたたみ） */}
      {(!isPastDate || dailyLog) && (
        <>
          <div className="mb-[13px] sm:mb-[17px] flex items-center gap-2">
            <button
              onClick={() => setSectionExpanded(!isSectionExpanded)}
              className="text-left flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
              aria-expanded={isSectionExpanded}
              aria-controls="journal-impression-content"
            >
              <h3 className="text-xl sm:text-2xl font-medium text-zinc-300 flex items-center gap-2 shrink-0">
                <Edit className="w-7 h-7 sm:w-8 sm:h-8" />
                <span>日誌・感想</span>
              </h3>
            </button>
            <div className="flex-1" />
            {notionImportAllowed && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!isEditable || notionImportLoading}
                onClick={handleNotionImport}
                className="shrink-0 bg-zinc-600 hover:bg-zinc-500 text-zinc-100 border border-zinc-500"
                title="Notion の日誌・感想を取り込む"
              >
                {notionImportLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Import className="w-4 h-4" />
                )}
                <span className="sr-only sm:not-sr-only sm:ml-1">Notionから日誌と感想を取り込む</span>
              </Button>
            )}
            <button
              onClick={() => setSectionExpanded(!isSectionExpanded)}
              className="hover:opacity-80 transition-opacity shrink-0"
              aria-expanded={isSectionExpanded}
              aria-controls="journal-impression-content"
            >
              {isSectionExpanded ? (
                <ChevronUp className="w-6 h-6 text-zinc-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-cyan-400" />
              )}
            </button>
          </div>
          {isSectionExpanded && (
            <div
              id="journal-impression-content"
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 sm:p-4 space-y-4 sm:space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* 日誌 */}
                <div className="flex flex-col min-w-0">
                  <h4 className="text-lg sm:text-xl font-medium text-zinc-300 mb-2 flex items-center gap-2">
                    <Edit className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>日誌</span>
                  </h4>
                  <div className="relative">
                    <Textarea
                      ref={journalTextareaRef}
                      id="journal-text"
                      value={journalText}
                      onChange={(e) => handleJournalTextChange(e.target.value)}
                      maxLength={journalMaxLength}
                      placeholder=" "
                      aria-label="日誌を入力する"
                      aria-describedby="journal-text-count"
                      disabled={!isEditable}
                      className={`relative z-0 bg-zinc-800 border-zinc-600 focus:border-cyan-500 resize-none disabled:cursor-not-allowed w-full h-[800px] overflow-y-auto text-[17px] md:text-[15px] px-3 py-2 rounded-md ${
                        isConfirmed ? 'text-zinc-50 disabled:opacity-100' : 'text-zinc-100 disabled:opacity-60'
                      }`}
                    />
                    {!journalText && (
                      <div
                        className="absolute inset-0 z-10 pointer-events-none px-3 py-2 flex items-start overflow-hidden rounded-md border border-transparent text-[17px] md:text-[15px] text-[#71717a] whitespace-pre-line"
                        style={{ height: '800px' }}
                        aria-hidden
                      >
                        {`時系列の行動記録を記載してください。

例）
0600｜起床
0610｜日光浴
0630｜ラン｜2km
0650｜冷水シャワー
…`}
                      </div>
                    )}
                  </div>
                  <div id="journal-text-count" className="mt-2 text-base text-zinc-500 text-right flex items-center justify-end gap-1 shrink-0" aria-live="polite">
                    <Edit className="w-5 h-5" />
                    <span>{journalText.length} / {journalMaxLength}文字</span>
                  </div>
                </div>

                {/* 感想 */}
                <div className="flex flex-col min-w-0">
                  <h4 className="text-lg sm:text-xl font-medium text-zinc-300 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>感想</span>
                  </h4>
                  <div className="relative">
                    <Textarea
                      ref={impressionTextareaRef}
                      id="impression-text"
                      value={impressionText}
                      onChange={(e) => handleImpressionTextChange(e.target.value)}
                      maxLength={impressionMaxLength}
                      placeholder=" "
                      aria-label="感想を入力する"
                      aria-describedby="impression-text-count"
                      disabled={!isEditable}
                      className={`relative z-0 bg-zinc-800 border-zinc-600 focus:border-cyan-500 resize-none disabled:cursor-not-allowed w-full h-[800px] overflow-y-auto text-[17px] md:text-[15px] px-3 py-2 rounded-md ${
                        isConfirmed ? 'text-zinc-50 disabled:opacity-100' : 'text-zinc-100 disabled:opacity-60'
                      }`}
                    />
                    {!impressionText && (
                      <div
                        className="absolute inset-0 z-10 pointer-events-none px-3 py-2 flex items-start overflow-hidden rounded-md border border-transparent text-[17px] md:text-[15px] text-[#71717a] whitespace-pre-line"
                        style={{ height: '800px' }}
                        aria-hidden
                      >
                        {`その日一日の感想を記載してください。

例）
今日は早起きができて、良いスタートが切れた！！
朝、目覚めるとすぐベランダに出て太陽を全身いっぱいに浴びた！！
さっそく用意していた運動着に着替えて外に出た。
朝日を浴びながら季節のにおいを感じつつ、走り出すと爽快な気分に…`}
                      </div>
                    )}
                  </div>
                  <div id="impression-text-count" className="mt-2 text-base text-zinc-500 text-right flex items-center justify-end gap-1 shrink-0" aria-live="polite">
                    <Edit className="w-5 h-5" />
                    <span>{impressionText.length} / {impressionMaxLength}文字</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={notionConfirmOpen} onOpenChange={setNotionConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Notion の内容で上書きしますか？</DialogTitle>
            <DialogDescription>
              現在の日誌・感想は、Notion から取得した内容で置き換わります。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-sm">
            {notionFetched.journalText ? (
              <div>
                <p className="font-medium text-zinc-300 mb-1">日誌（プレビュー）</p>
                <p className="text-zinc-400 whitespace-pre-wrap line-clamp-4 bg-zinc-900 rounded p-2">
                  {notionFetched.journalText.slice(0, 200)}
                  {notionFetched.journalText.length > 200 ? '…' : ''}
                </p>
              </div>
            ) : null}
            {notionFetched.impressionText ? (
              <div>
                <p className="font-medium text-zinc-300 mb-1">感想（プレビュー）</p>
                <p className="text-zinc-400 whitespace-pre-wrap line-clamp-2 bg-zinc-900 rounded p-2">
                  {notionFetched.impressionText.slice(0, 100)}
                  {notionFetched.impressionText.length > 100 ? '…' : ''}
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotionConfirmOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={applyNotionImport}>
              上書きする
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default memo(JournalImpressionSections);
