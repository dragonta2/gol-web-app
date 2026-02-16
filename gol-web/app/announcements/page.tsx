import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canManageAnnouncements as canManage } from '@/lib/announcements';
import AnnouncementsClient from './announcements-client';

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login?from=announcements');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  const email = user.email ?? '';
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS
    ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
    : [];
  const isAdmin = profile?.is_admin === true || (email ? adminEmails.includes(email.toLowerCase()) : false);
  const canManageAnnouncements = canManage(email || undefined, isAdmin);

  return <AnnouncementsClient canManageAnnouncements={canManageAnnouncements} />;
}
