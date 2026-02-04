/**
 * ユーザーデータエクスポートAPI
 * GET /api/user/export
 * 認証ユーザーの全データをJSONで返す（バックアップ・他アカウント移行用）
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: "認証が必要です", code: "UNAUTHORIZED" },
      { status: 401 }
    )
  }

  try {
    const [profileRes, dailyLogsRes, habitsRes, todosRes, rankLogsRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("daily_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("log_date", { ascending: true }),
        supabase
          .from("habits")
          .select("*")
          .eq("user_id", user.id)
          .order("display_order", { ascending: true }),
        supabase
          .from("todos")
          .select("*")
          .eq("user_id", user.id)
          .order("display_order", { ascending: true }),
        supabase
          .from("rank_change_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("changed_at", { ascending: false }),
      ])

    const profile = profileRes.data ?? null
    const dailyLogs = dailyLogsRes.data ?? []
    const habits = habitsRes.data ?? []
    const todos = todosRes.data ?? []
    const rankChangeLogs = rankLogsRes.data ?? []

    const dailyLogIds = dailyLogs.map((d) => d.id)
    const todoIds = todos.map((t) => t.id)

    let habitLogs: unknown[] = []
    let todoLogs: unknown[] = []
    let todoSubtasks: unknown[] = []

    if (dailyLogIds.length > 0) {
      const [hlRes, tlRes] = await Promise.all([
        supabase.from("habit_logs").select("*").in("daily_log_id", dailyLogIds),
        supabase.from("todo_logs").select("*").in("daily_log_id", dailyLogIds),
      ])
      habitLogs = hlRes.data ?? []
      todoLogs = tlRes.data ?? []
    }

    if (todoIds.length > 0) {
      const stRes = await supabase
        .from("todo_subtasks")
        .select("*")
        .in("todo_id", todoIds)
        .order("display_order", { ascending: true })
      todoSubtasks = stRes.data ?? []
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      profile,
      dailyLogs,
      habits,
      habitLogs,
      todos,
      todoLogs,
      todoSubtasks,
      rankChangeLogs,
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error("Export error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "エクスポートに失敗しました", details: message },
      { status: 500 }
    )
  }
}
