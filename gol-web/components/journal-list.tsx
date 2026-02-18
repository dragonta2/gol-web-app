'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, FileText, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ja } from 'date-fns/locale';

/** 'current-month-only': 日誌タブ用（今月の日誌のみ）。'past-only': 過去の日誌タブ用（過去の日誌のみ）。'all': 両方 */
type JournalListSection = 'all' | 'current-month-only' | 'past-only';

interface JournalListProps {
  onDateSelect: (date: string) => void;
  /** 表示するセクション。省略時は 'all' */
  section?: JournalListSection;
  /** アコーディオンの開閉状態（外部制御用） */
  isExpanded?: boolean;
  /** アコーディオンの開閉状態を更新する関数（外部制御用） */
  onExpandedChange?: (expanded: boolean) => void;
}

type SortOrder = 'desc' | 'asc';

/** 月キー "yyyy-MM" ごとの折りたたみ状態。過去の日誌はデフォルトで畳む */
type ExpandedMonthsState = Record<string, boolean>;

export default function JournalList({ onDateSelect, section = 'all', isExpanded: externalIsExpanded, onExpandedChange }: JournalListProps) {
  const supabase = createClient();
  const [allJournals, setAllJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalIsExpanded, setInternalIsExpanded] = useState(true);

  // 今月の日誌セクションの状態
  const [isCurrentMonthExpanded, setIsCurrentMonthExpanded] = useState(true);
  const [currentMonthSortOrder, setCurrentMonthSortOrder] = useState<SortOrder>('desc');

  // 過去の日誌エリア全体の折りたたみ（デフォルトで畳む）
  const [isPastJournalsSectionExpanded, setIsPastJournalsSectionExpanded] = useState(false);
  // 過去の日誌：月単位の折りたたみ（デフォルトで全て畳む）
  const [expandedPastMonths, setExpandedPastMonths] = useState<ExpandedMonthsState>({});

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

  useEffect(() => {
    fetchJournals();
  }, []);

  // 今月の開始日と終了日を取得
  const getCurrentMonthRange = () => {
    const now = new Date();
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
    };
  };

  const fetchJournals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // すべての日誌を取得（制限なし）
      const { data, error } = await supabase
        .from('daily_logs')
        .select('id, log_date, journal_text, one_line_comment, created_at, is_confirmed')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false });

      if (error) {
        console.error('日誌取得エラー:', error);
        return;
      }

      setAllJournals(data || []);
    } catch (error) {
      console.error('日誌取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 今月の日誌をフィルタリング
  const currentMonthJournals = useMemo(() => {
    const { start, end } = getCurrentMonthRange();
    return allJournals.filter((journal) => {
      const journalDate = new Date(journal.log_date);
      return isWithinInterval(journalDate, { start, end });
    });
  }, [allJournals]);

  // 過去の日誌をフィルタリング（今月以外）
  const pastJournals = useMemo(() => {
    const { start, end } = getCurrentMonthRange();
    return allJournals.filter((journal) => {
      const journalDate = new Date(journal.log_date);
      return !isWithinInterval(journalDate, { start, end });
    });
  }, [allJournals]);

  // 過去の日誌を月単位でグループ化（月は新しい順）
  const pastJournalsByMonth = useMemo(() => {
    const byMonth = new Map<string, any[]>();
    for (const j of pastJournals) {
      const d = new Date(j.log_date);
      const key = format(d, 'yyyy-MM');
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(j);
    }
    for (const arr of byMonth.values()) {
      arr.sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());
    }
    const keys = Array.from(byMonth.keys()).sort((a, b) => b.localeCompare(a));
    return keys.map((monthKey) => {
      const [y, m] = monthKey.split('-').map(Number);
      const monthLabel = format(new Date(y, m - 1, 1), 'yyyy年M月', { locale: ja });
      return { monthKey, monthLabel, journals: byMonth.get(monthKey)! };
    });
  }, [pastJournals]);

  // 並び替え済みの今月の日誌
  const sortedCurrentMonthJournals = useMemo(() => {
    const sorted = [...currentMonthJournals];
    sorted.sort((a, b) => {
      const dateA = new Date(a.log_date).getTime();
      const dateB = new Date(b.log_date).getTime();
      return currentMonthSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    return sorted;
  }, [currentMonthJournals, currentMonthSortOrder]);

  const togglePastMonth = useCallback((monthKey: string) => {
    setExpandedPastMonths((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }));
  }, []);

  const handleDateClick = (date: string) => {
    // フルリロードで日付を変更
    window.location.href = `/dashboard?date=${date}`;
  };

  const renderJournalItem = (journal: any) => {
    const date = new Date(journal.log_date);
    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    
    return (
      <button
        key={journal.id}
        onClick={() => handleDateClick(journal.log_date)}
        className="w-full p-4 border-b border-zinc-800 hover:bg-zinc-800 transition-colors text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <span className="text-base font-medium text-zinc-300">
                {format(date, 'yyyy年MM月dd日(E)', { locale: ja })}
              </span>
              {isToday && (
                <span className="text-xs text-cyan-400 px-2 py-0.5 bg-cyan-400/10 rounded">
                  今日
                </span>
              )}
              {journal.is_confirmed && (
                <span className="text-xs text-green-400 px-2 py-0.5 bg-green-400/10 rounded flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  確定済み
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
        <p className="text-zinc-400">読み込み中...</p>
      </div>
    );
  }

  const showCurrentMonth = section === 'all' || section === 'current-month-only';
  const showPast = section === 'all' || section === 'past-only';

  return (
    <div className="space-y-4">
      {/* 今月の日誌セクション */}
      {showCurrentMonth && (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 gap-2 flex-wrap">
          <button
            onClick={() => setIsCurrentMonthExpanded(!isCurrentMonthExpanded)}
            className="flex-1 min-w-0 text-left flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
            aria-expanded={isCurrentMonthExpanded}
            aria-controls="current-month-journal-content"
          >
            <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
              <FileText className="w-5 h-5 shrink-0" />
              <span>今月の日誌</span>
              <span className="text-sm text-zinc-500 font-normal">
                ({currentMonthJournals.length}件)
              </span>
            </h3>
            {isCurrentMonthExpanded ? (
              <ChevronUp className="w-5 h-5 text-zinc-400 shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-400 shrink-0" />
            )}
          </button>
          {currentMonthJournals.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-zinc-500 shrink-0" aria-label="日付で並び替え">
              <button
                type="button"
                onClick={() => setCurrentMonthSortOrder('asc')}
                className={`px-2 py-1 rounded ${currentMonthSortOrder === 'asc' ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                title="古い順"
              >
                古い順
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonthSortOrder('desc')}
                className={`px-2 py-1 rounded ${currentMonthSortOrder === 'desc' ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                title="新しい順"
              >
                新しい順
              </button>
            </span>
          )}
        </div>
        {isCurrentMonthExpanded && (
          <div id="current-month-journal-content" className="max-h-96 overflow-y-auto">
            {sortedCurrentMonthJournals.length === 0 ? (
              <div className="p-4 text-zinc-400 text-sm">今月の日誌がありません</div>
            ) : (
              sortedCurrentMonthJournals.map(renderJournalItem)
            )}
          </div>
        )}
      </div>
      )}

      {/* 過去の日誌エリア全体：折りたたみ可能（デフォルトで畳む）＋月単位でも折りたたみ */}
      {showPast && (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <button
          type="button"
          onClick={() => setIsPastJournalsSectionExpanded(!isPastJournalsSectionExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors text-left border-b border-zinc-800"
          aria-expanded={isPastJournalsSectionExpanded}
          aria-controls="past-journals-section-content"
        >
          <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
            <FileText className="w-5 h-5 shrink-0" />
            <span>過去の日誌</span>
            <span className="text-sm text-zinc-500 font-normal">
              ({pastJournals.length}件)
            </span>
          </h3>
          {isPastJournalsSectionExpanded ? (
            <ChevronUp className="w-5 h-5 text-zinc-400 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-zinc-400 shrink-0" />
          )}
        </button>
        {isPastJournalsSectionExpanded && (
          <div id="past-journals-section-content" className="divide-y divide-zinc-800">
            {pastJournalsByMonth.length === 0 ? (
              <div className="p-4 text-zinc-400 text-sm">過去の日誌がありません</div>
            ) : (
              pastJournalsByMonth.map(({ monthKey, monthLabel, journals }) => {
                const isMonthExpanded = expandedPastMonths[monthKey] === true;
                return (
                  <div key={monthKey} className="bg-zinc-900/50">
                    <button
                      type="button"
                      onClick={() => togglePastMonth(monthKey)}
                      className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors text-left"
                      aria-expanded={isMonthExpanded}
                      aria-controls={`past-month-${monthKey}`}
                    >
                      <span className="font-medium text-zinc-300">{monthLabel}</span>
                      <span className="text-sm text-zinc-500">({journals.length}件)</span>
                      {isMonthExpanded ? (
                        <ChevronUp className="w-5 h-5 text-zinc-400 shrink-0 ml-2" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-zinc-400 shrink-0 ml-2" />
                      )}
                    </button>
                    {isMonthExpanded && (
                      <div
                        id={`past-month-${monthKey}`}
                        className="max-h-80 overflow-y-auto border-t border-zinc-800"
                      >
                        {journals.map(renderJournalItem)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
