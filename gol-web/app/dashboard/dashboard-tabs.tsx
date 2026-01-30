'use client';

import { useState, lazy, Suspense } from 'react';
import KanbanBoard from './kanban-board';
import HabitList from './habit-list';
import JournalForm from './journal-form';
import JournalImpressionSections from './journal-impression-sections';
import TodoSummaryTab from './todo-summary-tab';
import JournalList from '@/components/journal-list';
import type { DashboardTabsProps } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Home, ClipboardList, BarChart3, Sparkles, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';

// 統計タブを動的インポート（コード分割・パフォーマンス最適化）
const StatsTab = lazy(() => import('./stats-tab'));

type TabType = 'journal' | 'todo-summary' | 'stats';

export default function DashboardTabs({ habits, habitLogs, dailyLogId, dailyLog, todos, todoLogs, todoSubtasks, selectedDate }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('journal');
  /** 日誌カンバンから「編集」で飛んできたとき、このタスクの編集モーダルを開く */
  const [editTodoId, setEditTodoId] = useState<string | null>(null);

  // アコーディオンの開閉状態を管理（全てのアコーディオンを一括制御）
  const [isKanbanExpanded, setIsKanbanExpanded] = useState(true);
  const [isHabitsExpanded, setIsHabitsExpanded] = useState(true);
  const [isJournalListExpanded, setIsJournalListExpanded] = useState(true);
  const [journalFormStates, setJournalFormStates] = useState({
    journal: true,
    impression: true,
    rights: true,
    ai: true,
  });

  return (
    <div>
      {/* タブナビゲーション */}
      <div
        role="tablist"
        aria-label="ダッシュボードタブ"
        className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 border-b border-zinc-800 overflow-x-auto"
      >
        <Button
          onClick={() => setActiveTab('journal')}
          variant="ghost"
          role="tab"
          aria-selected={activeTab === 'journal'}
          aria-controls="tabpanel-journal"
          id="tab-journal"
          className={`pb-3 px-3 sm:px-4 text-base sm:text-lg font-medium transition-colors relative h-auto rounded-none whitespace-nowrap focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 hover:border-0 ${
            activeTab === 'journal'
              ? 'text-cyan-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Home className="w-4 h-4 mr-1" />
          日誌
          {activeTab === 'journal' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" aria-hidden="true"></div>
          )}
        </Button>
        <Button
          onClick={() => setActiveTab('todo-summary')}
          variant="ghost"
          role="tab"
          aria-selected={activeTab === 'todo-summary'}
          aria-controls="tabpanel-todo-summary"
          id="tab-todo-summary"
          className={`pb-3 px-3 sm:px-4 text-base sm:text-lg font-medium transition-colors relative h-auto rounded-none whitespace-nowrap focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 hover:border-0 ${
            activeTab === 'todo-summary'
              ? 'text-cyan-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ClipboardList className="w-4 h-4 mr-1" />
          ToDoサマリー
          {activeTab === 'todo-summary' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" aria-hidden="true"></div>
          )}
        </Button>
        <Button
          onClick={() => setActiveTab('stats')}
          variant="ghost"
          role="tab"
          aria-selected={activeTab === 'stats'}
          aria-controls="tabpanel-stats"
          id="tab-stats"
          className={`pb-3 px-3 sm:px-4 text-base sm:text-lg font-medium transition-colors relative h-auto rounded-none whitespace-nowrap focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 hover:border-0 ${
            activeTab === 'stats'
              ? 'text-cyan-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <BarChart3 className="w-4 h-4 mr-1" />
          統計
          {activeTab === 'stats' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" aria-hidden="true"></div>
          )}
        </Button>
      </div>

      {/* タブコンテンツ */}
      <div>
        {activeTab === 'journal' && (
          <div
            id="tabpanel-journal"
            role="tabpanel"
            aria-labelledby="tab-journal"
            className="space-y-4 sm:space-y-6 lg:space-y-8"
          >
            {/* アコーディオン一括制御ボタン */}
            <div className="flex justify-end gap-2 mb-2">
              <Button
                onClick={() => {
                  setIsKanbanExpanded(true);
                  setIsHabitsExpanded(true);
                  setIsJournalListExpanded(true);
                  setJournalFormStates({
                    journal: true,
                    impression: true,
                    rights: true,
                    ai: true,
                  });
                }}
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                <Maximize2 className="w-4 h-4 mr-1" />
                全て開く
              </Button>
              <Button
                onClick={() => {
                  setIsKanbanExpanded(false);
                  setIsHabitsExpanded(false);
                  setIsJournalListExpanded(false);
                  setJournalFormStates({
                    journal: false,
                    impression: false,
                    rights: false,
                    ai: false,
                  });
                }}
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                <Minimize2 className="w-4 h-4 mr-1" />
                全て閉じる
              </Button>
            </div>

            {/* ToDoリスト */}
            <KanbanBoard 
              todos={todos} 
              todoLogs={todoLogs} 
              dailyLogId={dailyLogId}
              isExpanded={isKanbanExpanded}
              onExpandedChange={setIsKanbanExpanded}
              onEditTodo={(id) => {
                setActiveTab('todo-summary');
                setEditTodoId(id);
              }}
            />

            {/* 今日の日誌と一言感想 */}
            <JournalImpressionSections
              dailyLogId={dailyLogId}
              dailyLog={dailyLog}
              logDate={selectedDate || dailyLog?.log_date}
              expandedStates={{
                journal: journalFormStates.journal,
                impression: journalFormStates.impression,
              }}
              onExpandedStateChange={(states) => {
                setJournalFormStates({
                  ...journalFormStates,
                  ...states,
                });
              }}
            />

            {/* 習慣チェックリスト */}
            <div className="p-4 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
              <button
                onClick={() => setIsHabitsExpanded(!isHabitsExpanded)}
                className="w-full text-left mb-3 sm:mb-4 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
                aria-expanded={isHabitsExpanded}
                aria-controls="habits-content"
              >
                <h2 className="text-2xl sm:text-3xl font-semibold text-cyan-400 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
                  <span>今日の習慣</span>
                </h2>
                {isHabitsExpanded ? (
                  <ChevronUp className="w-6 h-6 text-zinc-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-zinc-400 flex-shrink-0" />
                )}
              </button>

              {isHabitsExpanded && (
                <div id="habits-content">
                  <HabitList habits={habits} habitLogs={habitLogs} dailyLogId={dailyLogId} />
                </div>
              )}
            </div>

            {/* 日誌入力フォーム */}
            <JournalForm 
              key={dailyLogId} 
              dailyLogId={dailyLogId} 
              dailyLog={dailyLog} 
              logDate={selectedDate || dailyLog?.log_date}
              expandedStates={journalFormStates}
              onExpandedStateChange={(state) => setJournalFormStates((prev) => ({ ...prev, ...state }))}
            />

            {/* 過去の日誌一覧 */}
            <div>
              <JournalList 
                onDateSelect={(date) => {
                  // 日付選択時の処理（親コンポーネントでURL更新）
                  window.location.href = `/dashboard?date=${date}`;
                }}
                isExpanded={isJournalListExpanded}
                onExpandedChange={setIsJournalListExpanded}
              />
            </div>
          </div>
        )}

        {activeTab === 'todo-summary' && (
          <div
            id="tabpanel-todo-summary"
            role="tabpanel"
            aria-labelledby="tab-todo-summary"
            className="p-4 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-lg"
          >
            <TodoSummaryTab
              todos={todos}
              todoLogs={todoLogs}
              todoSubtasks={todoSubtasks}
              dailyLogId={dailyLogId}
              initialEditTodoId={editTodoId}
              onInitialEditConsumed={() => setEditTodoId(null)}
            />
          </div>
        )}

        {activeTab === 'stats' && (
          <div
            id="tabpanel-stats"
            role="tabpanel"
            aria-labelledby="tab-stats"
            className="p-4 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-lg"
          >
            <Suspense fallback={
              <div className="p-6 text-center text-zinc-400">
                データを読み込み中...
              </div>
            }>
              <StatsTab />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}

