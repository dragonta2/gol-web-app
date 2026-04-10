/**
 * お知らせAPI
 *
 * GET: 認証ユーザー全員が一覧取得（DB保存・全ユーザー共通）
 * POST: 管理アカウント・指定メールのみ追加可能
 * PATCH: `app/api/announcements/[id]/route.ts`（1件更新）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAnnouncementsServiceClient } from '@/lib/announcements-service-client';
import { isAdmin } from '@/lib/auth/admin';
import { canManageAnnouncements } from '@/lib/announcements';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: rows, error } = await supabase
      .from('announcements')
      .select('id, notice_date, subject, display_order, created_at')
      .order('notice_date', { ascending: false });

    if (error) {
      console.error('announcements GET error:', error);
      return NextResponse.json(
        { error: 'お知らせの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      announcements: rows ?? [],
    });
  } catch (err) {
    console.error('announcements GET error:', err);
    return NextResponse.json(
      { error: 'お知らせの取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const admin = await isAdmin();
    const email = (user.email ?? '').toLowerCase();
    if (!canManageAnnouncements(email, admin)) {
      return NextResponse.json(
        { error: 'お知らせの追加は管理アカウントのみ可能です' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const notice_date = typeof body.notice_date === 'string' ? body.notice_date.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    if (!notice_date || !subject) {
      return NextResponse.json(
        { error: '日付と件名は必須です' },
        { status: 400 }
      );
    }

    const supabaseForWrite = createAnnouncementsServiceClient(supabase);

    // 最大 display_order の次を付与（空テーブルでもエラーにしない）
    const { data: maxRow, error: maxErr } = await supabaseForWrite
      .from('announcements')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxErr) {
      console.error('announcements POST max display_order error:', maxErr);
      return NextResponse.json(
        {
          error: 'お知らせの追加に失敗しました',
          details: maxErr.message,
        },
        { status: 500 }
      );
    }

    const display_order = maxRow ? (maxRow.display_order ?? 0) + 1 : 0;

    const { data: inserted, error: insertError } = await supabaseForWrite
      .from('announcements')
      .insert({ notice_date, subject, display_order })
      .select('id, notice_date, subject, display_order, created_at')
      .single();

    if (insertError) {
      console.error('announcements POST error:', insertError);
      const isRls =
        insertError.code === '42501' ||
        /row-level security|permission denied/i.test(insertError.message ?? '');
      return NextResponse.json(
        {
          error: 'お知らせの追加に失敗しました',
          details: insertError.message,
          hint: isRls
            ? 'Vercel に SUPABASE_SERVICE_ROLE_KEY を設定するか、profiles.is_admin を true にするか、RLS の許可メールとログイン中のメールを一致させてください。'
            : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, announcement: inserted });
  } catch (err) {
    console.error('announcements POST error:', err);
    return NextResponse.json(
      { error: 'お知らせの追加に失敗しました' },
      { status: 500 }
    );
  }
}
