"use client"

import { useState, useRef, lazy, Suspense } from "react"
import KanbanBoard from "./kanban-board"
import HabitList from "./habit-list"
import JournalForm from "./journal-form"
import JournalImpressionSections from "./journal-impression-sections"
import TodoSummaryTab from "./todo-summary-tab"
import JournalList from "@/components/journal-list"
import { AnnouncementsContent } from "@/components/announcements-content"
import type { DashboardTabsProps } from "@/lib/types"
import { Button } from "@/components/ui/button"
import DateSelector from "@/components/date-selector"
import {
  Home,
  ClipboardList,
  BarChart3,
  Megaphone,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
  FileText,
} from "lucide-react"

// 統計タブを動的インポート（コード分割・パフォーマンス最適化）
const StatsTab = lazy(() => import("./stats-tab"))

type TabType = "journal" | "todo-summary" | "stats" | "journals" | "announcements"

export interface DashboardTabsOwnProps extends DashboardTabsProps {
  /** 親で制御する場合の現在タブ */
  activeTab?: TabType
  /** タブ変更時のコールバック（親で画面名表示などに利用） */
  onActiveTabChange?: (tab: TabType) => void
}

export default function DashboardTabs({
  userId,
  habits,
  habitLogs,
  dailyLogId,
  dailyLog,
  todos,
  todoLogs,
  todoSubtasks,
  selectedDate,
  userName,
  isAdmin,
  canManageAnnouncements = false,
  scoreBreakdown,
  activeTab: controlledActiveTab,
  onActiveTabChange,
}: DashboardTabsOwnProps) {
  const [internalTab, setInternalTab] = useState<TabType>("journal")
  const isControlled = controlledActiveTab !== undefined
  const activeTab = isControlled ? controlledActiveTab : internalTab
  const setActiveTab = (tab: TabType) => {
    if (!isControlled) setInternalTab(tab)
    onActiveTabChange?.(tab)
  }
  /** 日誌カンバンから「編集」で飛んできたとき、このタスクの編集モーダルを開く */
  const [editTodoId, setEditTodoId] = useState<string | null>(null)
  /** 日誌タブから「新規タスク」でToDoサマリーに切り替えたとき、新規作成モーダルを開く */
  const [openCreateModalOnSwitch, setOpenCreateModalOnSwitch] = useState(false)

  // アコーディオンの開閉状態を管理（全てのアコーディオンを一括制御）
  const [isKanbanExpanded, setIsKanbanExpanded] = useState(true)
  const [isHabitsExpanded, setIsHabitsExpanded] = useState(true)
  const [journalFormStates, setJournalFormStates] = useState({
    journal: true,
    impression: true,
    rights: true,
    ai: true,
  })
  // 日誌・感想の現在値（AI判定実行時に JournalForm が参照する。JournalImpressionSections が更新）
  const journalTextsRef = useRef({ journalText: '', impressionText: '' })

  // 日付判定
  const getTodayJST = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(
      new Date()
    )
  const todayStr = getTodayJST()
  const isToday = selectedDate === todayStr
  const isPastDate = selectedDate ? selectedDate < todayStr : false
  const isConfirmed = dailyLog?.is_confirmed ?? false

  return (
    <div>
      {/* 編集可否メッセージ（ページ上部に表示。確定したら当日も編集不可） */}
      {isConfirmed && dailyLog && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 mb-4">
          <p className="text-yellow-400 text-center font-medium flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" />
            この日誌は確定済みのため編集できません
          </p>
        </div>
      )}
      {!isConfirmed && dailyLog && (
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-4">
          <p className="text-blue-400 text-center font-medium flex items-center justify-center gap-2">
            <Unlock className="w-4 h-4" />
            この日誌は未確定のため編集できます
          </p>
        </div>
      )}
      {isPastDate && !dailyLog && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-4 text-center">
          <p className="text-zinc-400">この日付には日誌が記録されていません</p>
        </div>
      )}

      {/* タブナビゲーション */}
      <div
        role="tablist"
        aria-label="ダッシュボードタブ"
        className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6 border-b border-zinc-800 overflow-x-auto"
      >
        <Button
          onClick={() => setActiveTab("journal")}
          variant="ghost"
          role="tab"
          aria-selected={activeTab === "journal"}
          aria-controls="tabpanel-journal"
          id="tab-journal"
          className={`pb-3 px-3 sm:px-4 text-base sm:text-lg font-medium transition-colors relative h-auto rounded-none whitespace-nowrap focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 hover:border-0 ${
            activeTab === "journal"
              ? "text-cyan-400"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Home className="w-4 h-4 mr-1" />
          日誌
          {activeTab === "journal" && (
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
              aria-hidden="true"
            ></div>
          )}
        </Button>
        <Button
          onClick={() => setActiveTab("todo-summary")}
          variant="ghost"
          role="tab"
          aria-selected={activeTab === "todo-summary"}
          aria-controls="tabpanel-todo-summary"
          id="tab-todo-summary"
          className={`pb-3 px-3 sm:px-4 text-base sm:text-lg font-medium transition-colors relative h-auto rounded-none whitespace-nowrap focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 hover:border-0 ${
            activeTab === "todo-summary"
              ? "text-cyan-400"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <ClipboardList className="w-4 h-4 mr-1" />
          ToDoサマリー
          {activeTab === "todo-summary" && (
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
              aria-hidden="true"
            ></div>
          )}
        </Button>
        <Button
          onClick={() => setActiveTab("stats")}
          variant="ghost"
          role="tab"
          aria-selected={activeTab === "stats"}
          aria-controls="tabpanel-stats"
          id="tab-stats"
          className={`pb-3 px-3 sm:px-4 text-base sm:text-lg font-medium transition-colors relative h-auto rounded-none whitespace-nowrap focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 hover:border-0 ${
            activeTab === "stats"
              ? "text-cyan-400"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <BarChart3 className="w-4 h-4 mr-1" />
          統計
          {activeTab === "stats" && (
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
              aria-hidden="true"
            ></div>
          )}
        </Button>
        <Button
          onClick={() => setActiveTab("journals")}
          variant="ghost"
          role="tab"
          aria-selected={activeTab === "journals"}
          aria-controls="tabpanel-journals"
          id="tab-journals"
          className={`pb-3 px-3 sm:px-4 text-base sm:text-lg font-medium transition-colors relative h-auto rounded-none whitespace-nowrap focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 hover:border-0 ${
            activeTab === "journals"
              ? "text-cyan-400"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <FileText className="w-4 h-4 mr-1" />
          過去の日誌
          {activeTab === "journals" && (
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
              aria-hidden="true"
            ></div>
          )}
        </Button>
        <Button
          onClick={() => setActiveTab("announcements")}
          variant="ghost"
          role="tab"
          aria-selected={activeTab === "announcements"}
          aria-controls="tabpanel-announcements"
          id="tab-announcements"
          className={`pb-3 px-3 sm:px-4 text-base sm:text-lg font-medium transition-colors relative h-auto rounded-none whitespace-nowrap focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 hover:border-0 ${
            activeTab === "announcements"
              ? "text-cyan-400"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Megaphone className="w-4 h-4 mr-1" />
          お知らせ
          {activeTab === "announcements" && (
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
              aria-hidden="true"
            ></div>
          )}
        </Button>
        <div className="ml-auto shrink-0 pb-3 flex items-center">
          <DateSelector />
        </div>
      </div>

      {/* タブコンテンツ */}
      <div>
        {activeTab === "journal" && (
          <div
            id="tabpanel-journal"
            role="tabpanel"
            aria-labelledby="tab-journal"
            className="space-y-4 sm:space-y-6 lg:space-y-8"
          >
            {/* アコーディオン一括制御 */}
            <div className="flex justify-end gap-2 mb-2">
              <Button
                onClick={() => {
                  setIsKanbanExpanded(true)
                  setIsHabitsExpanded(true)
                  setJournalFormStates({
                    journal: true,
                    impression: true,
                    rights: true,
                    ai: true,
                  })
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
                  setIsKanbanExpanded(false)
                  setIsHabitsExpanded(false)
                  setJournalFormStates({
                    journal: false,
                    impression: false,
                    rights: false,
                    ai: false,
                  })
                }}
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                <Minimize2 className="w-4 h-4 mr-1" />
                全て閉じる
              </Button>
            </div>

            {/* ToDoリスト（フィルター枠内右上に新規タスクボタン） */}
            <KanbanBoard
              userId={userId}
              todos={todos}
              todoLogs={todoLogs}
              todoSubtasks={todoSubtasks}
              dailyLogId={dailyLogId}
              isExpanded={isKanbanExpanded}
              onExpandedChange={setIsKanbanExpanded}
              onEditTodo={(id) => {
                setActiveTab("todo-summary")
                setEditTodoId(id)
              }}
              onOpenCreateModal={() => {
                setActiveTab("todo-summary")
                setOpenCreateModalOnSwitch(true)
              }}
              isConfirmed={isConfirmed}
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
                })
              }}
              isConfirmed={isConfirmed}
              journalTextsRef={journalTextsRef}
            />

            {/* 習慣チェックリスト */}
            <div className="p-4 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
              <button
                onClick={() => setIsHabitsExpanded(!isHabitsExpanded)}
                className="w-full text-left mb-3 sm:mb-4 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
                aria-expanded={isHabitsExpanded}
                aria-controls="habits-content"
              >
                <h2 className="text-xl sm:text-2xl font-semibold text-cyan-400 flex items-center gap-2">
                  <ListChecks className="w-6 h-6 sm:w-7 sm:h-7" />
                  <span>今日の習慣実行</span>
                </h2>
                {isHabitsExpanded ? (
                  <ChevronUp className="w-6 h-6 text-zinc-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-cyan-400 flex-shrink-0" />
                )}
              </button>

              {isHabitsExpanded && (
                <div id="habits-content" className="w-full min-w-0">
                  <HabitList
                    habits={habits}
                    habitLogs={habitLogs}
                    dailyLogId={dailyLogId}
                    logDate={selectedDate || dailyLog?.log_date}
                    isConfirmed={isConfirmed}
                  />
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
              onExpandedStateChange={(state) =>
                setJournalFormStates((prev) => ({ ...prev, ...state }))
              }
              userName={userName}
              isAdmin={isAdmin}
              scoreBreakdown={scoreBreakdown}
              journalTextsRef={journalTextsRef}
            />

            {/* 今月の日誌（過去の日誌は「過去の日誌」タブへ） */}
            <JournalList
              onDateSelect={(date) => {
                window.location.href = `/dashboard?date=${date}`
              }}
              section="current-month-only"
            />
          </div>
        )}

        {activeTab === "todo-summary" && (
          <div
            id="tabpanel-todo-summary"
            role="tabpanel"
            aria-labelledby="tab-todo-summary"
            className="p-4 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-lg"
          >
            <TodoSummaryTab
              userId={userId}
              todos={todos}
              todoLogs={todoLogs}
              todoSubtasks={todoSubtasks}
              dailyLogId={dailyLogId}
              initialEditTodoId={editTodoId}
              onInitialEditConsumed={() => setEditTodoId(null)}
              initialOpenCreateModal={openCreateModalOnSwitch}
              onInitialOpenCreateConsumed={() => setOpenCreateModalOnSwitch(false)}
            />
          </div>
        )}

        {activeTab === "stats" && (
          <div
            id="tabpanel-stats"
            role="tabpanel"
            aria-labelledby="tab-stats"
            className="p-4 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-lg"
          >
            <Suspense
              fallback={
                <div className="p-6 text-center text-zinc-400">
                  データを読み込み中...
                </div>
              }
            >
              <StatsTab />
            </Suspense>
          </div>
        )}

        {activeTab === "journals" && (
          <div
            id="tabpanel-journals"
            role="tabpanel"
            aria-labelledby="tab-journals"
            className="p-4 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-lg"
          >
            <JournalList
              onDateSelect={(date) => {
                window.location.href = `/dashboard?date=${date}`
              }}
              section="past-only"
            />
          </div>
        )}

        {activeTab === "announcements" && (
          <div
            id="tabpanel-announcements"
            role="tabpanel"
            aria-labelledby="tab-announcements"
            className="p-4 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-lg"
          >
            <AnnouncementsContent canManageAnnouncements={canManageAnnouncements} />
          </div>
        )}
      </div>
    </div>
  )
}
