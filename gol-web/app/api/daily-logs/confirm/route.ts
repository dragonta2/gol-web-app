/**
 * 日誌確定API：1日分のスコアデルタを集計し profiles に反映して is_confirmed = true にする
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateDayDeltas } from '@/lib/score-calculator';
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

    const { data: dailyLog, error: fetchError } = await supabase
      .from('daily_logs')
      .select('id, user_id, is_confirmed')
      .eq('id', dailyLogId)
      .single();

    if (fetchError || !dailyLog) {
      return NextResponse.json({ error: '日誌が見つかりません' }, { status: 404 });
    }
    if (dailyLog.user_id !== user.id) {
      return NextResponse.json({ error: 'この日誌へのアクセス権限がありません' }, { status: 403 });
    }
    if (dailyLog.is_confirmed) {
      return NextResponse.json({ error: 'この日誌はすでに確定済みです' }, { status: 400 });
    }

    const [deltas, { data: profile, error: profileError }] = await Promise.all([
      calculateDayDeltas(supabase, dailyLogId),
      supabase.from('profiles').select('points, exp_body, exp_mind, exp_spirit').eq('id', user.id).single(),
    ]);

    if (!deltas) {
      return NextResponse.json({ error: 'スコアの計算に失敗しました' }, { status: 500 });
    }
    if (profileError || !profile) {
      return NextResponse.json({ error: 'プロファイルの取得に失敗しました' }, { status: 500 });
    }

    const newPoints = Math.max(0, (profile.points ?? 0) + deltas.points_delta);
    const newExpBody = Math.max(0, (profile.exp_body ?? 0) + deltas.exp_body_delta);
    const newExpMind = Math.max(0, (profile.exp_mind ?? 0) + deltas.exp_mind_delta);
    const newExpSpirit = Math.max(0, (profile.exp_spirit ?? 0) + deltas.exp_spirit_delta);

    const { error: updateLogError } = await supabase
      .from('daily_logs')
      .update({
        is_confirmed: true,
        confirmed_points_delta: deltas.points_delta,
        confirmed_exp_body_delta: deltas.exp_body_delta,
        confirmed_exp_mind_delta: deltas.exp_mind_delta,
        confirmed_exp_spirit_delta: deltas.exp_spirit_delta,
      })
      .eq('id', dailyLogId);

    if (updateLogError) {
      return NextResponse.json(
        { error: '日誌の確定に失敗しました', details: updateLogError.message },
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

    return NextResponse.json({
      success: true,
      deltas: {
        points: deltas.points_delta,
        exp_body: deltas.exp_body_delta,
        exp_mind: deltas.exp_mind_delta,
        exp_spirit: deltas.exp_spirit_delta,
      },
    });
  } catch (err) {
    console.error('日誌確定APIエラー:', err);
    return NextResponse.json(
      {
        error: '予期しないエラーが発生しました',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
