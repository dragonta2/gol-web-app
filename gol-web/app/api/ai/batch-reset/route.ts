/**
 * AI一括生成の再生成回数リセットAPI
 * 管理者・テストアカウントのみ利用可能。指定した日誌の ai_batch_run_count を 0 に戻す。
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/admin';
import { validateUUID } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const body = await request.json();
    const dailyLogId = body.dailyLogId;
    if (!dailyLogId || typeof dailyLogId !== 'string') {
      return NextResponse.json({ error: 'dailyLogIdが必要です' }, { status: 400 });
    }
    const validation = validateUUID(dailyLogId, '日誌ID');
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: log, error: fetchError } = await supabase
      .from('daily_logs')
      .select('id, user_id')
      .eq('id', dailyLogId)
      .single();

    if (fetchError || !log) {
      return NextResponse.json({ error: '日誌が見つかりません' }, { status: 404 });
    }
    if ((log as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'この日誌を操作する権限がありません' }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from('daily_logs')
      .update({ ai_batch_run_count: 0 })
      .eq('id', dailyLogId);

    if (updateError) {
      console.error('batch-reset update error:', updateError);
      return NextResponse.json(
        { error: 'リセットに失敗しました', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, ai_batch_run_count: 0 });
  } catch (error) {
    console.error('batch-reset error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
