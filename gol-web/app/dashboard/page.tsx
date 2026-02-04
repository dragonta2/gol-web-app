import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import DashboardTabs from "./dashboard-tabs"
import CollapsibleDashboardHeader from "./collapsible-dashboard-header"
import { syncProfileLevel } from "@/lib/sync-profile-level"

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
      <CollapsibleDashboardHeader
        userProfile={userProfile}
        selectedDate={selectedDate}
      />

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
