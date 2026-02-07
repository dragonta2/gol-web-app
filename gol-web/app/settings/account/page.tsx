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

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, is_admin, use_username_as_display_name")
    .eq("id", user.id)
    .single()

  const email = user.email ?? ""
  const usernameFromProfile = (profile?.username ?? "").trim()

  // 管理者: profiles.is_admin が true のほか、環境変数で指定したメールも管理者扱い（テスト・管理アカウント用）
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS
    ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
    : []
  const isAdminByEmail = email ? adminEmails.includes(email.toLowerCase()) : false
  const isAdmin = profile?.is_admin === true || isAdminByEmail

  const initialData: AccountSettingsInitialData = {
    username: usernameFromProfile,
    email,
    useUsernameAsDisplayName:
      profile?.use_username_as_display_name !== false,
    isAdmin,
  }

  return <AccountSettingsClient initialData={initialData} />
}
