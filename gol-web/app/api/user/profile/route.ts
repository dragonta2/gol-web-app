/**
 * ユーザープロファイル取得・更新API
 * ニックネーム（username）の取得・更新
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("username, is_admin, use_username_as_display_name")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("プロファイル取得エラー:", error)
      return NextResponse.json(
        { error: "プロファイルの取得に失敗しました" },
        { status: 500 },
      )
    }

    const username = (profile?.username ?? "").trim()
    const email = user.email ?? ""
    return NextResponse.json({
      username,
      email,
      is_admin: profile?.is_admin === true,
      use_username_as_display_name:
        profile?.use_username_as_display_name !== false,
    })
  } catch (err) {
    console.error("profile GET error:", err)
    return NextResponse.json(
      { error: "予期しないエラーが発生しました" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const body = await request.json()
    const username =
      typeof body.username === "string" ? body.username.trim() : ""
    const useUsernameAsDisplayName =
      typeof body.use_username_as_display_name === "boolean"
        ? body.use_username_as_display_name
        : undefined

    if (!username) {
      return NextResponse.json(
        { error: "ニックネームを入力してください" },
        { status: 400 },
      )
    }

    // 1. まず username のみで更新（use_username_as_display_name カラム未追加のDBでも動くように）
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", user.id)

    if (updateError) {
      console.error("プロファイル更新エラー:", updateError)
      return NextResponse.json(
        {
          error: "プロフィールの更新に失敗しました",
          detail: updateError.message,
        },
        { status: 500 },
      )
    }

    // 2. use_username_as_display_name がある場合のみ別途更新（カラムが存在するDB用）
    if (useUsernameAsDisplayName !== undefined) {
      const { error: flagError } = await supabase
        .from("profiles")
        .update({ use_username_as_display_name: useUsernameAsDisplayName })
        .eq("id", user.id)
      if (flagError) {
        console.warn(
          "use_username_as_display_name の更新をスキップ:",
          flagError.message,
        )
      }
    }

    return NextResponse.json({
      username,
      use_username_as_display_name: useUsernameAsDisplayName ?? true,
    })
  } catch (err) {
    console.error("profile PATCH error:", err)
    return NextResponse.json(
      { error: "予期しないエラーが発生しました" },
      { status: 500 },
    )
  }
}
