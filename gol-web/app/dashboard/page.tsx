import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import LogoutButton from "./logout-button"
import DashboardTabs from "./dashboard-tabs"
import FontSizeControl from "@/components/font-size-control"
import { Trophy, Coins, Dumbbell, Brain, Sparkles, User } from "lucide-react"
import { syncProfileLevel } from "@/lib/sync-profile-level"
import { RankNameDisplay } from "@/components/rank-name-display"
import { RankAvatar } from "@/components/rank-avatar"

interface DashboardPageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const supabase = await createClient()

  // 認証状態をチェック
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // 未ログインの場合はログイン画面にリダイレクト（遷移元の確認用に from を付与）
  if (authError || !user) {
    redirect("/login?from=dashboard")
  }

  // profilesテーブルからユーザーデータを取得
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // レベル同期（EXPからレベル再計算、必要なら更新・ランク変更ログ記録）
  let levelInfo = { level: 1, class_name: "無名の凡人", levelChanged: false }
  if (profile) {
    try {
      levelInfo = await syncProfileLevel(supabase, user.id, "ghost")
    } catch (e) {
      console.warn("syncProfileLevel:", e)
    }
  }

  // profilesが存在しない場合（新規ユーザーなど）はデフォルト値を使用
  const userProfile = profile
    ? {
        name: profile.username,
        level: levelInfo.level,
        class: levelInfo.class_name,
        points: profile.points,
        exp: {
          body: profile.exp_body,
          intellect: profile.exp_mind,
          mind: profile.exp_spirit,
        },
      }
    : {
        name: user.email?.split("@")[0] || "ユーザー",
        level: 1,
        class: "無名の凡人",
        points: 10,
        exp: {
          body: 0,
          intellect: 0,
          mind: 0,
        },
      }

  // URLパラメータから日付を取得、なければ今日（日本時間で判定）
  const resolvedParams = await searchParams
  const getTodayJST = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(
      new Date()
    )
  const selectedDate = resolvedParams?.date || getTodayJST()

  // 選択された日付のdaily_logsを取得（なければ作成）
  let dailyLogId: string | null = null
  let dailyLogData: any = null
  const isToday = selectedDate === getTodayJST()

  const { data: dailyLog, error: dailyLogError } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", selectedDate)
    .single()

  if (dailyLog) {
    dailyLogId = dailyLog.id
    dailyLogData = dailyLog
  } else if (isToday && (!dailyLogError || dailyLogError.code === "PGRST116")) {
    // 今日の日付の場合のみ、daily_logsが存在しない場合は作成
    // 過去の日付の場合は作成しない（閲覧のみ）
    const { data: newDailyLog, error: insertError } = await supabase
      .from("daily_logs")
      .insert({
        user_id: user.id,
        log_date: selectedDate,
      })
      .select("*")
      .single()

    if (newDailyLog && !insertError) {
      dailyLogId = newDailyLog.id
      dailyLogData = newDailyLog
    }
  }

  // 並列で取得できるクエリを同時実行（パフォーマンス最適化）
  const [habitsResult, todosResult] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("habit_type", { ascending: true })
      .order("display_order", { ascending: true }),
    supabase
      .from("todos")
      .select("*")
      .eq("user_id", user.id)
      .order("status", { ascending: true })
      .order("display_order", { ascending: true }),
  ])

  const habits = habitsResult.data || []
  const todos = todosResult.data || []

  const todosError = todosResult.error

  // エラーがある場合はコンソールに出力
  if (todosError) {
    console.error("❌ todos取得エラー:", todosError)
  }

  // dailyLogIdが取得できたら、habit_logsとtodo_logsを並列で取得
  const [habitLogsResult, todoLogsResult] = dailyLogId
    ? await Promise.all([
        supabase.from("habit_logs").select("*").eq("daily_log_id", dailyLogId),
        supabase.from("todo_logs").select("*").eq("daily_log_id", dailyLogId),
      ])
    : [{ data: null }, { data: null }]

  const habitLogs = habitLogsResult.data
  const todoLogs = todoLogsResult.data

  // todosが取得できたら、todo_subtasksを取得
  const { data: todoSubtasks } =
    todos.length > 0
      ? await supabase
          .from("todo_subtasks")
          .select("*")
          .in(
            "todo_id",
            todos.map((t) => t.id)
          )
          .order("display_order", { ascending: true })
      : { data: [] }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ステータスバー（固定ヘッダー） */}
      <header className="sticky top-0 z-50 bg-zinc-900 border-b border-zinc-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
            {/* アバター: 固形背景・角丸（R小さめ） */}
            <div className="row-span-3 flex items-center justify-center">
              <div className="rounded overflow-hidden shrink-0 size-[160px] bg-zinc-800">
                <RankAvatar
                  level={userProfile.level}
                  variant="icon"
                  size={160}
                  className="shrink-0"
                />
              </div>
            </div>

            {/* 1行目: 名前 + アクションボタン */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <h1 className="text-xl sm:text-2xl font-bold text-cyan-400 flex items-center gap-2">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
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

            {/* 2行目: Lv.｜ランク名｜ゴルド（名前の下） */}
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
              <span className="flex items-center gap-1 font-semibold text-yellow-400">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
                {userProfile.points}G
              </span>
            </div>

            {/* 3行目: 左＝日付（YYYY年MM月DD日）、右＝EXP表示 */}
            <div className="flex items-center justify-between gap-4">
              {selectedDate && (
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                  {(() => {
                    const [y, m, d] = selectedDate.split("-")
                    const dayNames = ["日", "月", "火", "水", "木", "金", "土"]
                    const dayIndex = new Date(
                      selectedDate + "T12:00:00"
                    ).getDay()
                    return `${y}年${m}月${d}日(${dayNames[dayIndex]})`
                  })()}
                </p>
              )}
              <div className="flex items-center gap-3 sm:gap-6 text-lg sm:text-xl ml-auto">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>身体:</span>
                  <span className="font-semibold text-cyan-400">
                    {userProfile.exp.body}
                  </span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>頭脳:</span>
                  <span className="font-semibold text-cyan-400">
                    {userProfile.exp.intellect}
                  </span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>精神:</span>
                  <span className="font-semibold text-cyan-400">
                    {userProfile.exp.mind}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <DashboardTabs
          habits={habits || []}
          habitLogs={habitLogs || []}
          dailyLogId={dailyLogId}
          dailyLog={dailyLogData}
          todos={todos || []}
          todoLogs={todoLogs || []}
          todoSubtasks={todoSubtasks || []}
          selectedDate={selectedDate}
          userName={userProfile.name}
        />
      </div>
    </div>
  )
}
