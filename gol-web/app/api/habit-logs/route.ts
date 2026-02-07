/**
 * 習慣ログ更新API（習慣チェック・ポイント/EXP反映）
 * サーバー側で認証し、プロファイル更新と habit_logs の更新を行う
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateUUID, validateAll } from '@/lib/validation';
import { isWeekendOrHoliday } from '@/lib/date-utils';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { dailyLogId, habitId, isChecked, count } = body;

    const validation = validateAll([
      validateUUID(dailyLogId, '日誌ID'),
      validateUUID(habitId, '習慣ID'),
    ]);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] || 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    const countNum = typeof count === 'number' && !Number.isNaN(count) ? Math.max(0, count) : 0;

    // 日誌が存在し、ユーザー所有か確認し、log_date を取得
    const { data: dailyLog, error: dailyError } = await supabase
      .from('daily_logs')
      .select('id, user_id, log_date')
      .eq('id', dailyLogId)
      .single();

    if (dailyError || !dailyLog) {
      return NextResponse.json({ error: '日誌が見つかりません' }, { status: 404 });
    }
    if (dailyLog.user_id !== user.id) {
      return NextResponse.json({ error: 'この日誌へのアクセス権限がありません' }, { status: 403 });
    }

    // 習慣が存在し、ユーザー所有か確認
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id, user_id, habit_type, points, exp_body, exp_mind, exp_spirit, input_type, exclude_weekends')
      .eq('id', habitId)
      .single();

    if (habitError || !habit) {
      return NextResponse.json({ error: '習慣が見つかりません' }, { status: 404 });
    }
    if (habit.user_id !== user.id) {
      return NextResponse.json({ error: 'この習慣へのアクセス権限がありません' }, { status: 403 });
    }

    // 既存の habit_log を取得
    const { data: existingLog } = await supabase
      .from('habit_logs')
      .select('id, is_checked, count')
      .eq('daily_log_id', dailyLogId)
      .eq('habit_id', habitId)
      .maybeSingle();

    const wasChecked = existingLog?.is_checked ?? false;
    const previousCount = existingLog?.count ?? 0;
    const currentCount = habit.input_type === 'number' ? countNum : (isChecked ? 1 : 0);

    // プロファイル取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points, exp_body, exp_mind, exp_spirit')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'プロファイルの取得に失敗しました' }, { status: 500 });
    }

    // ポイント・EXP 差分計算（クライアントと同じロジック＋週末除外）
    let pointsDelta = 0;
    let expBodyDelta = 0;
    let expMindDelta = 0;
    let expSpiritDelta = 0;

    const logDate = dailyLog.log_date;
    const isWeekendToday = isWeekendOrHoliday(logDate);
    const badHabitWeekendExcluded = habit.habit_type === 'bad' && habit.exclude_weekends === true && isWeekendToday;

    if (habit.habit_type === 'bad') {
      if (badHabitWeekendExcluded) {
        // 週末除外: 減点・戻しなし
      } else if (isChecked && !wasChecked) {
        pointsDelta = -habit.points * currentCount;
        expBodyDelta = -habit.exp_body * currentCount;
        expMindDelta = -habit.exp_mind * currentCount;
        expSpiritDelta = -habit.exp_spirit * currentCount;
      } else if (!isChecked && wasChecked) {
        pointsDelta = habit.points * previousCount;
        expBodyDelta = habit.exp_body * previousCount;
        expMindDelta = habit.exp_mind * previousCount;
        expSpiritDelta = habit.exp_spirit * previousCount;
      } else if (isChecked && wasChecked && habit.input_type === 'number') {
        const countDelta = currentCount - previousCount;
        pointsDelta = -habit.points * countDelta;
        expBodyDelta = -habit.exp_body * countDelta;
        expMindDelta = -habit.exp_mind * countDelta;
        expSpiritDelta = -habit.exp_spirit * countDelta;
      }
    } else {
      // 良習慣・ボーナス
      if (isChecked && !wasChecked) {
        pointsDelta = habit.points * currentCount;
        expBodyDelta = habit.exp_body * currentCount;
        expMindDelta = habit.exp_mind * currentCount;
        expSpiritDelta = habit.exp_spirit * currentCount;
      } else if (!isChecked && wasChecked) {
        pointsDelta = -habit.points * previousCount;
        expBodyDelta = -habit.exp_body * previousCount;
        expMindDelta = -habit.exp_mind * previousCount;
        expSpiritDelta = -habit.exp_spirit * previousCount;
      } else if (isChecked && wasChecked && habit.input_type === 'number') {
        const countDelta = currentCount - previousCount;
        pointsDelta = habit.points * countDelta;
        expBodyDelta = habit.exp_body * countDelta;
        expMindDelta = habit.exp_mind * countDelta;
        expSpiritDelta = habit.exp_spirit * countDelta;
      }
    }

    // プロファイル更新（差分がある場合のみ）
    if (pointsDelta !== 0 || expBodyDelta !== 0 || expMindDelta !== 0 || expSpiritDelta !== 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          points: Math.max(0, profile.points + pointsDelta),
          exp_body: Math.max(0, profile.exp_body + expBodyDelta),
          exp_mind: Math.max(0, profile.exp_mind + expMindDelta),
          exp_spirit: Math.max(0, profile.exp_spirit + expSpiritDelta),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('習慣ログAPI: プロファイル更新エラー', updateError);
        return NextResponse.json(
          { error: 'プロファイルの更新に失敗しました', details: updateError.message },
          { status: 500 }
        );
      }
    }

    // habit_logs 更新または作成
    if (existingLog) {
      const { error: logError } = await supabase
        .from('habit_logs')
        .update({ is_checked: isChecked, count: currentCount })
        .eq('id', existingLog.id);

      if (logError) {
        if (pointsDelta !== 0 || expBodyDelta !== 0 || expMindDelta !== 0 || expSpiritDelta !== 0) {
          await supabase
            .from('profiles')
            .update({
              points: Math.max(0, profile.points - pointsDelta),
              exp_body: Math.max(0, profile.exp_body - expBodyDelta),
              exp_mind: Math.max(0, profile.exp_mind - expMindDelta),
              exp_spirit: Math.max(0, profile.exp_spirit - expSpiritDelta),
            })
            .eq('id', user.id);
        }
        return NextResponse.json(
          { error: '習慣ログの更新に失敗しました', details: logError.message },
          { status: 500 }
        );
      }
    } else {
      if (isChecked) {
        const { error: insertError } = await supabase
          .from('habit_logs')
          .insert({
            daily_log_id: dailyLogId,
            habit_id: habitId,
            is_checked: isChecked,
            count: currentCount,
          });

        if (insertError) {
          if (pointsDelta !== 0 || expBodyDelta !== 0 || expMindDelta !== 0 || expSpiritDelta !== 0) {
            await supabase
              .from('profiles')
              .update({
                points: Math.max(0, profile.points - pointsDelta),
                exp_body: Math.max(0, profile.exp_body - expBodyDelta),
                exp_mind: Math.max(0, profile.exp_mind - expMindDelta),
                exp_spirit: Math.max(0, profile.exp_spirit - expSpiritDelta),
              })
              .eq('id', user.id);
          }
          return NextResponse.json(
            { error: '習慣ログの作成に失敗しました', details: insertError.message },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('習慣ログAPIエラー:', err);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
