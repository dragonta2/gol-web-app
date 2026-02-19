import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminSettingsClient from "./admin-settings-client"

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/login?from=settings/admin")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS
    ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    : []
  const isAdminByEmail = user.email
    ? adminEmails.includes(user.email.toLowerCase())
    : false
  const isAdmin = profile?.is_admin === true || isAdminByEmail

  if (!isAdmin) {
    redirect("/settings/account")
  }

  return <AdminSettingsClient />
}
