"use client"

import { useState } from "react"
import Link from "next/link"
import { useCalendarDialog } from "@/contexts/calendar-dialog-context"
import {
  Coins,
  Dumbbell,
  Brain,
  Sparkles,
  User,
  ChevronDown,
  ChevronUp,
  Home,
  ClipboardList,
  BarChart3,
  Megaphone,
  Swords,
  FileText,
} from "lucide-react"
import LogoutButton from "./logout-button"
import FontSizeControl from "@/components/font-size-control"
import { RankNameDisplay } from "@/components/rank-name-display"
import { RankAvatar } from "@/components/rank-avatar"

const STORAGE_KEY = "dashboard-header-collapsed"

export interface DashboardHeaderProfile {
  name: string
  level: number
  class: string
  points: number
  exp: { body: number; intellect: number; mind: number }
}

import type { DayDeltas } from "@/lib/score-calculator"

interface CollapsibleDashboardHeaderProps {
  userProfile: DashboardHeaderProfile
  selectedDate: string
  /** 現在開いている画面名（日誌 / ToDoサマリー / 統計 / 過去の日誌） */
  screenName?: string
  /** 現在のタブ（画面名の左に同じアイコンを表示するため） */
  activeTab?: "journal" | "todo-summary" | "stats" | "journals" | "announcements"
  /** 未確定の日誌がある日の仮スコア（確定時に反映されるデルタ） */
  pendingDeltas?: DayDeltas | null
}

const TAB_ICONS = {
  journal: Home,
  "todo-summary": ClipboardList,
  stats: BarChart3,
  journals: FileText,
  announcements: Megaphone,
} as const

export default function CollapsibleDashboardHeader({
  userProfile,
  selectedDate,
  screenName,
  activeTab,
  pendingDeltas,
}: CollapsibleDashboardHeaderProps) {
  const TabIcon = activeTab ? TAB_ICONS[activeTab] : null
  const { openCalendar } = useCalendarDialog() ?? { openCalendar: () => {} }
  // タイトルバー（ヘッダー）は常に展開して表示。折りたたみ状態は保存するが、次回表示時は展開で開始する。
  const [collapsed, setCollapsed] = useState(false)

  const handleDateClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    openCalendar()
  }

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const dateLabel = selectedDate
    ? (() => {
        const [y, m, d] = selectedDate.split("-")
        const dayNames = ["日", "月", "火", "水", "木", "金", "土"]
        const dayIndex = new Date(selectedDate + "T12:00:00").getDay()
        return `${y}年${m}月${d}日(${dayNames[dayIndex]})`
      })()
    : ""

  const getTodayJST = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(
      new Date()
    )
  const isToday = selectedDate === getTodayJST()

  return (
    <header className="sticky top-0 z-50 bg-zinc-900 border-b border-zinc-800 shadow-lg">
      {/* 折り畳みトグル（常に表示する1行）。テキストは展開時コンテンツの左端（緑線位置）から開始 */}
      <button
        type="button"
        onClick={toggle}
        className="w-full py-2 sm:py-2.5 text-left hover:bg-zinc-800/50 transition-colors rounded-t"
        aria-expanded={!collapsed}
        aria-label={collapsed ? "ヘッダーを展開" : "ヘッダーを折り畳む"}
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-2">
          <span className="text-[20px] sm:text-[22px] font-bold text-white truncate min-w-0 flex items-center gap-2 flex-wrap">
            {screenName ? (
              <>
                {TabIcon && (
                  <TabIcon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-white -translate-y-px" aria-hidden />
                )}
                <span className="text-white">{screenName}</span>
                {collapsed && (
                  <>
                    <span className="text-zinc-500 mx-2">｜</span>
                    <button
                      type="button"
                      onClick={handleDateClick}
                      className="text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 rounded"
                      aria-label="日付を選ぶ"
                    >
                      {dateLabel}
                    </button>
                    {isToday && (
                      <span
                        className="inline-flex items-center justify-center leading-none px-2 py-1 rounded text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shrink-0 -translate-y-[2px]"
                        aria-label="本日"
                      >
                        <span className="translate-y-[1px]">本日</span>
                      </span>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDateClick}
                  className="text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 rounded"
                  aria-label="日付を選ぶ"
                >
                  {dateLabel}
                </button>
                {isToday && (
                  <span
                    className="inline-flex items-center justify-center leading-none px-2 py-1 rounded text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shrink-0 -translate-y-[2px]"
                    aria-label="本日"
                  >
                    <span className="translate-y-[1px]">本日</span>
                  </span>
                )}
              </>
            )}
          </span>
          <span className="shrink-0 flex items-center gap-1 text-white">
            {collapsed ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
            <span className="text-xs hidden sm:inline">
              {collapsed ? "展開" : "折り畳む"}
            </span>
          </span>
        </div>
      </button>

      {/* 展開時の詳細エリア */}
      {!collapsed && (
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
            <div className="row-span-3 flex items-center justify-center">
              <div className="rounded overflow-hidden shrink-0 size-[160px]">
                <RankAvatar
                  level={userProfile.level}
                  variant="icon"
                  size={160}
                  className="shrink-0"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <h1 className="text-xl sm:text-2xl font-bold text-cyan-400 flex items-center gap-2">
                <Swords className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>{userProfile.name}</span>
              </h1>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <FontSizeControl />
                <Link
                  href="/mypage"
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors text-center flex items-center justify-center gap-1.5"
                  title="マイページ"
                >
                  <User className="w-4 h-4" />
                  <span>マイページ</span>
                </Link>
                <LogoutButton />
              </div>
            </div>

            <div className="flex items-center gap-2 text-base sm:text-lg text-zinc-300">
              <span>Lv.{userProfile.level}</span>
              <span className="text-zinc-500">|</span>
              <span className="hidden sm:inline">
                <RankNameDisplay level={userProfile.level} />
              </span>
              <span className="sm:hidden inline-block max-w-20 truncate">
                <RankNameDisplay level={userProfile.level} />
              </span>
              <span className="text-zinc-500">|</span>
              <span className="flex items-baseline gap-1 font-semibold text-gold">
                <Coins className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 self-center" />
                <span className="text-[25px] sm:text-[27px] leading-none">{userProfile.points}</span>
                <span className="text-[15px] sm:text-[17px] leading-none translate-y-[2px]">GOLD</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              {selectedDate && (
                <div className="flex items-baseline gap-2">
                  <button
                    type="button"
                    onClick={handleDateClick}
                    className="text-[22px] sm:text-[26px] lg:text-[32px] font-bold text-white text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 rounded"
                    aria-label="日付を選ぶ"
                  >
                    {dateLabel}
                  </button>
                  {isToday && (
                    <span
                      className="inline-flex items-center justify-center leading-none px-2 py-1 rounded text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 -translate-y-[2px]"
                      aria-label="本日"
                    >
                      <span className="translate-y-[1px]">本日</span>
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 sm:gap-6 text-lg sm:text-xl font-semibold ml-auto">
                <div className="flex items-center gap-1 sm:gap-2 text-exp-body">
                  <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>身体:</span>
                  <span>{userProfile.exp.body}</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 text-exp-intelligence">
                  <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>頭脳:</span>
                  <span>{userProfile.exp.intellect}</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 text-exp-mind">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>精神:</span>
                  <span>{userProfile.exp.mind}</span>
                </div>
              </div>
            </div>

            {pendingDeltas && (
              <div className="text-sm text-zinc-400 mt-[15px] flex flex-wrap items-center gap-x-3 gap-y-0.5" role="status" aria-label="未確定スコア">
                <span className="font-medium text-zinc-400">未確定:</span>
                {pendingDeltas.points_delta !== 0 && (
                  <span>{pendingDeltas.points_delta >= 0 ? '+' : '-'} {Math.abs(pendingDeltas.points_delta)}G</span>
                )}
                {pendingDeltas.exp_body_delta !== 0 && (
                  <span className="text-exp-body">身体 {pendingDeltas.exp_body_delta > 0 ? '+' : '-'} {Math.abs(pendingDeltas.exp_body_delta)}</span>
                )}
                {pendingDeltas.exp_mind_delta !== 0 && (
                  <span className="text-exp-intelligence">頭脳 {pendingDeltas.exp_mind_delta > 0 ? '+' : '-'} {Math.abs(pendingDeltas.exp_mind_delta)}</span>
                )}
                {pendingDeltas.exp_spirit_delta !== 0 && (
                  <span className="text-exp-mind">精神 {pendingDeltas.exp_spirit_delta > 0 ? '+' : '-'} {Math.abs(pendingDeltas.exp_spirit_delta)}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
