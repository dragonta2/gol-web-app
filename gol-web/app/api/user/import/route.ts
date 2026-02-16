/**
 * ユーザーデータインポートAPI
 * POST /api/user/import
 * エクスポートJSON（GET /api/user/export 形式）を取り込み、現在ユーザーにマージする
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type ExportPayload = {
  version?: number
  profile?: unknown
  dailyLogs?: unknown[]
  habits?: unknown[]
  habitLogs?: unknown[]
  todos?: unknown[]
  todoLogs?: unknown[]
  todoSubtasks?: unknown[]
  rankChangeLogs?: unknown[]
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x)
}

function isValidExportPayload(body: unknown): body is ExportPayload {
  if (!isRecord(body)) return false
  const v = body.version
  if (typeof v !== "number" || v !== 1) return false
  const arr = (x: unknown) => Array.isArray(x)
  if (body.dailyLogs !== undefined && !arr(body.dailyLogs)) return false
  if (body.habits !== undefined && !arr(body.habits)) return false
  if (body.habitLogs !== undefined && !arr(body.habitLogs)) return false
  if (body.todos !== undefined && !arr(body.todos)) return false
  if (body.todoLogs !== undefined && !arr(body.todoLogs)) return false
  if (body.todoSubtasks !== undefined && !arr(body.todoSubtasks)) return false
  if (body.rankChangeLogs !== undefined && !arr(body.rankChangeLogs))
    return false
  return true
}

export async function POST(request: Request) {
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "JSONの解析に失敗しました" },
      { status: 400 }
    )
  }

  if (!isValidExportPayload(body)) {
    return NextResponse.json(
      { error: "エクスポート形式（version: 1）のJSONではありません" },
      { status: 400 }
    )
  }

  const dailyLogs = (body.dailyLogs ?? []) as Record<string, unknown>[]
  const habits = (body.habits ?? []) as Record<string, unknown>[]
  const todos = (body.todos ?? []) as Record<string, unknown>[]
  const habitLogs = (body.habitLogs ?? []) as Record<string, unknown>[]
  const todoLogs = (body.todoLogs ?? []) as Record<string, unknown>[]
  const todoSubtasks = (body.todoSubtasks ?? []) as Record<string, unknown>[]
  const rankChangeLogs = (body.rankChangeLogs ?? []) as Record<
    string,
    unknown
  >[]

  try {
    const existingLogDatesRes = await supabase
      .from("daily_logs")
      .select("log_date")
      .eq("user_id", user.id)
    const existingDates = new Set(
      (existingLogDatesRes.data ?? []).map((r) => r.log_date)
    )

    const dailyLogsToInsert = dailyLogs.filter(
      (d) => !existingDates.has(d.log_date as string)
    )

    const habitIdMap = new Map<string, string>()
    const todoIdMap = new Map<string, string>()
    const dailyLogIdMap = new Map<string, string>()

    for (const h of habits) {
      const oldId = h.id as string
      if (oldId) habitIdMap.set(oldId, crypto.randomUUID())
    }
    for (const t of todos) {
      const oldId = t.id as string
      if (oldId) todoIdMap.set(oldId, crypto.randomUUID())
    }
    for (const d of dailyLogsToInsert) {
      const oldId = d.id as string
      if (oldId) dailyLogIdMap.set(oldId, crypto.randomUUID())
    }

    const inserted = {
      habits: 0,
      todos: 0,
      dailyLogs: 0,
      habitLogs: 0,
      todoLogs: 0,
      todoSubtasks: 0,
      rankChangeLogs: 0,
      skippedDailyLogs: dailyLogs.length - dailyLogsToInsert.length,
    }

    if (habits.length > 0) {
      const rows = habits.map((h) => {
        const newId = habitIdMap.get(h.id as string) ?? crypto.randomUUID()
        return {
          id: newId,
          user_id: user.id,
          habit_name: h.habit_name ?? "",
          habit_type: h.habit_type ?? "good",
          points: typeof h.points === "number" ? h.points : 1,
          exp_body: typeof h.exp_body === "number" ? h.exp_body : 0,
          exp_mind: typeof h.exp_mind === "number" ? h.exp_mind : 0,
          exp_spirit: typeof h.exp_spirit === "number" ? h.exp_spirit : 0,
          display_order: typeof h.display_order === "number" ? h.display_order : 0,
          is_custom: Boolean(h.is_custom),
          input_type: h.input_type === "number" ? "number" : "checkbox",
          exclude_weekends: Boolean(h.exclude_weekends),
          exclude_from_complete: Boolean(h.exclude_from_complete),
        }
      })
      const { error } = await supabase.from("habits").insert(rows)
      if (error) throw new Error(`habits: ${error.message}`)
      inserted.habits = rows.length
    }

    if (todos.length > 0) {
      const rows = todos.map((t) => {
        const newId = todoIdMap.get(t.id as string) ?? crypto.randomUUID()
        return {
          id: newId,
          user_id: user.id,
          task_name: t.task_name ?? "",
          sp_points: typeof t.sp_points === "number" ? t.sp_points : 0,
          sp_exp_body: typeof t.sp_exp_body === "number" ? t.sp_exp_body : 0,
          sp_exp_mind: typeof t.sp_exp_mind === "number" ? t.sp_exp_mind : 0,
          sp_exp_spirit: typeof t.sp_exp_spirit === "number" ? t.sp_exp_spirit : 0,
          status: t.status === "in_progress" || t.status === "completed" ? t.status : "active",
          due_date: t.due_date ?? null,
          completed_at: t.completed_at ?? null,
          display_order: typeof t.display_order === "number" ? t.display_order : 0,
        }
      })
      const { error } = await supabase.from("todos").insert(rows)
      if (error) throw new Error(`todos: ${error.message}`)
      inserted.todos = rows.length
    }

    if (dailyLogsToInsert.length > 0) {
      const rows = dailyLogsToInsert.map((d) => {
        const newId = dailyLogIdMap.get(d.id as string) ?? crypto.randomUUID()
        return {
          id: newId,
          user_id: user.id,
          log_date: d.log_date,
          journal_text: d.journal_text ?? null,
          one_line_comment: d.one_line_comment ?? null,
          base_consumption: typeof d.base_consumption === "number" ? d.base_consumption : -5,
          right_a_count: typeof d.right_a_count === "number" ? d.right_a_count : 0,
          right_b_count: typeof d.right_b_count === "number" ? d.right_b_count : 0,
          right_c_count: typeof d.right_c_count === "number" ? d.right_c_count : 0,
          right_d_count: typeof d.right_d_count === "number" ? d.right_d_count : 0,
          right_f_count: typeof d.right_f_count === "number" ? d.right_f_count : 0,
          right_o_count: typeof d.right_o_count === "number" ? d.right_o_count : 0,
          right_u_count: typeof d.right_u_count === "number" ? d.right_u_count : 0,
          right_x_count: typeof d.right_x_count === "number" ? d.right_x_count : 0,
          ai_condition_body: d.ai_condition_body ?? null,
          ai_condition_mood: d.ai_condition_mood ?? null,
          ai_points_earned: d.ai_points_earned ?? null,
          ai_points_consumed: d.ai_points_consumed ?? null,
          ai_points_total: d.ai_points_total ?? null,
          ai_exp_body: d.ai_exp_body ?? null,
          ai_exp_mind: d.ai_exp_mind ?? null,
          ai_exp_spirit: d.ai_exp_spirit ?? null,
          ai_advice: d.ai_advice ?? null,
          ai_story_past: d.ai_story_past ?? null,
          ai_story_future: d.ai_story_future ?? null,
        }
      })
      const { error } = await supabase.from("daily_logs").insert(rows)
      if (error) throw new Error(`daily_logs: ${error.message}`)
      inserted.dailyLogs = rows.length
    }

    const habitLogsToInsert = habitLogs
      .map((hl) => {
        const newDailyId = dailyLogIdMap.get(hl.daily_log_id as string)
        const newHabitId = habitIdMap.get(hl.habit_id as string)
        if (!newDailyId || !newHabitId) return null
        return {
          daily_log_id: newDailyId,
          habit_id: newHabitId,
          is_checked: Boolean(hl.is_checked),
          count: typeof hl.count === "number" ? hl.count : 0,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (habitLogsToInsert.length > 0) {
      const { error } = await supabase.from("habit_logs").insert(habitLogsToInsert)
      if (error) throw new Error(`habit_logs: ${error.message}`)
      inserted.habitLogs = habitLogsToInsert.length
    }

    const todoLogsToInsert = todoLogs
      .map((tl) => {
        const newDailyId = dailyLogIdMap.get(tl.daily_log_id as string)
        const newTodoId = todoIdMap.get(tl.todo_id as string)
        if (!newDailyId || !newTodoId) return null
        return {
          daily_log_id: newDailyId,
          todo_id: newTodoId,
          points_earned: typeof tl.points_earned === "number" ? tl.points_earned : 0,
          exp_body_earned: typeof tl.exp_body_earned === "number" ? tl.exp_body_earned : 0,
          exp_mind_earned: typeof tl.exp_mind_earned === "number" ? tl.exp_mind_earned : 0,
          exp_spirit_earned: typeof tl.exp_spirit_earned === "number" ? tl.exp_spirit_earned : 0,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (todoLogsToInsert.length > 0) {
      const { error } = await supabase.from("todo_logs").insert(todoLogsToInsert)
      if (error) throw new Error(`todo_logs: ${error.message}`)
      inserted.todoLogs = todoLogsToInsert.length
    }

    const todoSubtasksToInsert = todoSubtasks
      .map((st) => {
        const newTodoId = todoIdMap.get(st.todo_id as string)
        if (!newTodoId) return null
        return {
          todo_id: newTodoId,
          subtask_name: (st.subtask_name as string) ?? "",
          is_completed: Boolean(st.is_completed),
          display_order: typeof st.display_order === "number" ? st.display_order : 0,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (todoSubtasksToInsert.length > 0) {
      const { error } = await supabase.from("todo_subtasks").insert(todoSubtasksToInsert)
      if (error) throw new Error(`todo_subtasks: ${error.message}`)
      inserted.todoSubtasks = todoSubtasksToInsert.length
    }

    if (rankChangeLogs.length > 0) {
      const rows = rankChangeLogs.map((r) => ({
        user_id: user.id,
        from_level: typeof r.from_level === "number" ? r.from_level : 1,
        to_level: typeof r.to_level === "number" ? r.to_level : 1,
        changed_at: r.changed_at ?? new Date().toISOString(),
      }))
      const { error } = await supabase.from("rank_change_logs").insert(rows)
      if (error) throw new Error(`rank_change_logs: ${error.message}`)
      inserted.rankChangeLogs = rows.length
    }

    return NextResponse.json({
      ok: true,
      message: "インポートが完了しました",
      inserted,
    })
  } catch (err) {
    console.error("Import error:", err)
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json(
      { error: "インポートに失敗しました", details: message },
      { status: 500 }
    )
  }
}
