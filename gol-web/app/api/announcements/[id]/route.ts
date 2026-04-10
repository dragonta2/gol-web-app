/**
 * お知らせAPI（1件）
 *
 * PATCH: 管理アカウントのみ更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAnnouncementsServiceClient } from '@/lib/announcements-service-client';
import { isAdmin } from '@/lib/auth/admin';
import { canManageAnnouncements } from '@/lib/announcements';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id || !UUID_RE.test(id)) {
      return NextResponse.json({ error: '不正なお知らせIDです' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const admin = await isAdmin();
    const email = (user.email ?? '').toLowerCase();
    if (!canManageAnnouncements(email, admin)) {
      return NextResponse.json(
        { error: 'お知らせの更新は管理アカウントのみ可能です' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const notice_date =
      typeof body.notice_date === 'string' ? body.notice_date.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    if (!notice_date || !subject) {
      return NextResponse.json(
        { error: '日付と件名は必須です' },
        { status: 400 }
      );
    }

    const supabaseForWrite = createAnnouncementsServiceClient(supabase);

    const { data: updated, error: updateError } = await supabaseForWrite
      .from('announcements')
      .update({ notice_date, subject })
      .eq('id', id)
      .select('id, notice_date, subject, display_order, created_at')
      .maybeSingle();

    if (updateError) {
      console.error('announcements PATCH error:', updateError);
      const isRls =
        updateError.code === '42501' ||
        /row-level security|permission denied/i.test(updateError.message ?? '');
      return NextResponse.json(
        {
          error: 'お知らせの更新に失敗しました',
          details: updateError.message,
          hint: isRls
            ? 'Vercel に SUPABASE_SERVICE_ROLE_KEY を設定するか、profiles.is_admin を true にするか、RLS の許可メールとログイン中のメールを一致させてください。'
            : undefined,
        },
        { status: 500 }
      );
    }

    if (!updated) {
      return NextResponse.json(
        { error: '対象のお知らせが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, announcement: updated });
  } catch (err) {
    console.error('announcements PATCH error:', err);
    return NextResponse.json(
      { error: 'お知らせの更新に失敗しました' },
      { status: 500 }
    );
  }
}
