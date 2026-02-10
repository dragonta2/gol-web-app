import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AccountSettingsClient, {
  type AccountSettingsInitialData,
} from "./account-settings-client"

export default async function AccountSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/login?from=settings/account")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, is_admin, use_username_as_display_name")
    .eq("id", user.id)
    .single()

  // メインクエリが失敗した場合（カラム未追加等）、最低限のカラムでフォールバック
  let finalProfile = profile
  if (profileError) {
    console.error("プロファイル取得エラー:", profileError.message)
    const { data: fallback } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single()
    finalProfile = fallback
      ? { ...fallback, is_admin: false, use_username_as_display_name: true }
      : null
  }

  const email = user.email ?? ""
  const usernameFromProfile = (finalProfile?.username ?? "").trim()

  // 管理者: profiles.is_admin が true のほか、環境変数で指定したメールも管理者扱い（テスト・管理アカウント用）
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS
    ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
    : []
  const isAdminByEmail = email ? adminEmails.includes(email.toLowerCase()) : false
  const isAdmin = finalProfile?.is_admin === true || isAdminByEmail

  const initialData: AccountSettingsInitialData = {
    username: usernameFromProfile,
    email,
    useUsernameAsDisplayName:
      finalProfile?.use_username_as_display_name !== false,
    isAdmin,
  }

  return <AccountSettingsClient initialData={initialData} />
}
