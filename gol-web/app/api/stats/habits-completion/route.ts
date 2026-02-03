import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isWeekday } from '@/lib/date-utils';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // 認証状態をチェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // URLパラメータから期間を取得（デフォルト: 30日間）
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const limit = Math.min(Math.max(days, 7), 90); // 7日〜90日の範囲に制限

    // 開始日を計算
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - limit);

    // 期間内のdaily_logsを取得
    const { data: dailyLogs, error: dailyLogsError } = await supabase
      .from('daily_logs')
      .select('id, log_date')
      .eq('user_id', user.id)
      .gte('log_date', startDate.toISOString().split('T')[0])
      .lte('log_date', endDate.toISOString().split('T')[0])
      .order('log_date', { ascending: true });

    if (dailyLogsError) {
      console.error('daily_logs取得エラー:', dailyLogsError);
      return NextResponse.json(
        { error: 'データの取得に失敗しました' },
        { status: 500 }
      );
    }

    if (!dailyLogs || dailyLogs.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const dailyLogIds = dailyLogs.map(log => log.id);
    const totalDays = dailyLogs.length;

    // ユーザーの習慣を取得（exclude_weekends を進捗率計算に使用）
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, habit_name, habit_type, input_type, exclude_weekends')
      .eq('user_id', user.id)
      .order('habit_type', { ascending: true })
      .order('display_order', { ascending: true });

    if (habitsError) {
      console.error('habits取得エラー:', habitsError);
      return NextResponse.json(
        { error: 'データの取得に失敗しました' },
        { status: 500 }
      );
    }

    if (!habits || habits.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 期間内のhabit_logsを取得（daily_log_id は週末除外の進捗計算に必要）
    const { data: habitLogs, error: habitLogsError } = await supabase
      .from('habit_logs')
      .select('habit_id, daily_log_id, is_checked, count')
      .in('daily_log_id', dailyLogIds);

    if (habitLogsError) {
      console.error('habit_logs取得エラー:', habitLogsError);
      return NextResponse.json(
        { error: 'データの取得に失敗しました' },
        { status: 500 }
      );
    }

    // 習慣ごとに達成率を計算
    const completionData = habits.map(habit => {
      const excludeWeekends = habit.exclude_weekends === true;

      // カウント対象の日（exclude_weekends の場合は平日のみ）
      const countedLogIds = excludeWeekends
        ? dailyLogs.filter(log => isWeekday(log.log_date)).map(log => log.id)
        : dailyLogs.map(log => log.id);
      const effectiveTotalDays = countedLogIds.length;

      // この習慣のログのうち、カウント対象日に該当するもの
      const logs = habitLogs?.filter(log => log.habit_id === habit.id && countedLogIds.includes(log.daily_log_id)) || [];

      // 達成日数を計算（カウント対象日のみ）
      let completedDays = 0;
      if (habit.input_type === 'checkbox') {
        completedDays = logs.filter(log => log.is_checked === true).length;
      } else {
        completedDays = logs.filter(log => (log.count || 0) > 0).length;
      }

      // 達成率を計算（パーセンテージ）
      const completionRate = effectiveTotalDays > 0 ? (completedDays / effectiveTotalDays) * 100 : 0;

      return {
        habitId: habit.id,
        habitName: habit.habit_name,
        habitType: habit.habit_type,
        completionRate: Math.round(completionRate * 10) / 10,
        completedDays,
        totalDays: effectiveTotalDays,
      };
    });

    // 習慣の種類別にグループ化
    const byType = {
      good: completionData.filter(h => h.habitType === 'good'),
      bad: completionData.filter(h => h.habitType === 'bad'),
      bonus: completionData.filter(h => h.habitType === 'bonus'),
    };

    // 種類別の平均達成率を計算
    const averageByType = {
      good: byType.good.length > 0
        ? Math.round((byType.good.reduce((sum, h) => sum + h.completionRate, 0) / byType.good.length) * 10) / 10
        : 0,
      bad: byType.bad.length > 0
        ? Math.round((byType.bad.reduce((sum, h) => sum + h.completionRate, 0) / byType.bad.length) * 10) / 10
        : 0,
      bonus: byType.bonus.length > 0
        ? Math.round((byType.bonus.reduce((sum, h) => sum + h.completionRate, 0) / byType.bonus.length) * 10) / 10
        : 0,
    };

    return NextResponse.json({
      data: completionData,
      summary: {
        totalDays,
        averageByType,
        totalHabits: habits.length,
      },
    });
  } catch (error) {
    console.error('APIエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
