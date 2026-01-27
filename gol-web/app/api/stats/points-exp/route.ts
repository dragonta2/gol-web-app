import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    // 過去のdaily_logsを取得
    const { data: dailyLogs, error } = await supabase
      .from('daily_logs')
      .select('log_date, ai_points_earned, ai_exp_body, ai_exp_mind, ai_exp_spirit')
      .eq('user_id', user.id)
      .gte('log_date', startDate.toISOString().split('T')[0])
      .lte('log_date', endDate.toISOString().split('T')[0])
      .order('log_date', { ascending: true });

    if (error) {
      console.error('データ取得エラー:', error);
      return NextResponse.json(
        { error: 'データの取得に失敗しました' },
        { status: 500 }
      );
    }

    // データを整形（nullの場合は0に変換）
    const formattedData = (dailyLogs || []).map(log => ({
      date: log.log_date,
      points: log.ai_points_earned || 0,
      expBody: log.ai_exp_body || 0,
      expMind: log.ai_exp_mind || 0,
      expSpirit: log.ai_exp_spirit || 0,
    }));

    return NextResponse.json({ data: formattedData });
  } catch (error) {
    console.error('APIエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
