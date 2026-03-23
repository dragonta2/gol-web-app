/**
 * 日誌確定取り消しAPI：確定時に適用したデルタを profiles から差し引き is_confirmed = false にする
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateUUID, validateAll } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const dailyLogId = body.dailyLogId ?? body.daily_log_id;

    const validation = validateAll([validateUUID(dailyLogId, '日誌ID')]);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] || 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    const [
      { data: dailyLog, error: fetchError },
      { data: profile, error: profileError },
    ] = await Promise.all([
      supabase
        .from('daily_logs')
        .select('id, user_id, is_confirmed, confirmed_points_delta, confirmed_exp_body_delta, confirmed_exp_mind_delta, confirmed_exp_spirit_delta')
        .eq('id', dailyLogId)
        .single(),
      supabase.from('profiles').select('points, exp_body, exp_mind, exp_spirit').eq('id', user.id).single(),
    ]);

    if (fetchError || !dailyLog) {
      return NextResponse.json({ error: '日誌が見つかりません' }, { status: 404 });
    }
    if (dailyLog.user_id !== user.id) {
      return NextResponse.json({ error: 'この日誌へのアクセス権限がありません' }, { status: 403 });
    }
    if (!dailyLog.is_confirmed) {
      return NextResponse.json({ error: 'この日誌は未確定です' }, { status: 400 });
    }
    if (profileError || !profile) {
      return NextResponse.json({ error: 'プロファイルの取得に失敗しました' }, { status: 500 });
    }

    const pts = dailyLog.confirmed_points_delta ?? 0;
    const bodyExp = dailyLog.confirmed_exp_body_delta ?? 0;
    const mindExp = dailyLog.confirmed_exp_mind_delta ?? 0;
    const spiritExp = dailyLog.confirmed_exp_spirit_delta ?? 0;

    const newPoints = Math.max(0, (profile.points ?? 0) - pts);
    const newExpBody = Math.max(0, (profile.exp_body ?? 0) - bodyExp);
    const newExpMind = Math.max(0, (profile.exp_mind ?? 0) - mindExp);
    const newExpSpirit = Math.max(0, (profile.exp_spirit ?? 0) - spiritExp);

    const { error: updateLogError } = await supabase
      .from('daily_logs')
      .update({
        is_confirmed: false,
        confirmed_points_delta: 0,
        confirmed_exp_body_delta: 0,
        confirmed_exp_mind_delta: 0,
        confirmed_exp_spirit_delta: 0,
      })
      .eq('id', dailyLogId);

    if (updateLogError) {
      return NextResponse.json(
        { error: '確定の取り消しに失敗しました', details: updateLogError.message },
        { status: 500 }
      );
    }

    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        points: newPoints,
        exp_body: newExpBody,
        exp_mind: newExpMind,
        exp_spirit: newExpSpirit,
      })
      .eq('id', user.id);

    if (updateProfileError) {
      return NextResponse.json(
        { error: 'プロファイルの更新に失敗しました', details: updateProfileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('確定取り消しAPIエラー:', err);
    return NextResponse.json(
      {
        error: '予期しないエラーが発生しました',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
