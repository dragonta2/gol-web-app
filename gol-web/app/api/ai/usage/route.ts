/**
 * AI使用量取得API Route
 * 
 * ユーザーのAI使用量を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/admin';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 管理者権限チェック
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      return NextResponse.json(
        { error: '管理者権限が必要です', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // URLパラメータから期間を取得（デフォルト: 30日）
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    // 使用量統計を取得
    const { data: statistics, error: statsError } = await supabase.rpc(
      'get_usage_statistics',
      {
        p_user_id: user.id,
        p_days: days,
      }
    );

    if (statsError) {
      console.error('使用量統計取得エラー:', statsError);
      return NextResponse.json(
        { error: '使用量統計の取得に失敗しました', details: statsError.message },
        { status: 500 }
      );
    }

    // 今日の合計コストを取得
    const { data: todayCost, error: todayCostError } = await supabase.rpc(
      'get_today_total_cost',
      {
        p_user_id: user.id,
      }
    );

    // 今月の合計コストを取得
    const { data: monthlyCost, error: monthlyCostError } = await supabase.rpc(
      'get_monthly_total_cost',
      {
        p_user_id: user.id,
      }
    );

    // 各APIタイプの今日の使用回数を取得
    const apiTypes = ['judgment', 'advice', 'story'] as const;
    const todayUsage: Record<string, number> = {};

    for (const apiType of apiTypes) {
      const { data: count, error } = await supabase.rpc('get_today_usage_count', {
        p_user_id: user.id,
        p_api_type: apiType,
      });
      if (!error) {
        todayUsage[apiType] = count || 0;
      }
    }

    // 各APIタイプの今月の使用回数を取得
    const monthlyUsage: Record<string, number> = {};

    for (const apiType of apiTypes) {
      const { data: count, error } = await supabase.rpc('get_monthly_usage_count', {
        p_user_id: user.id,
        p_api_type: apiType,
      });
      if (!error) {
        monthlyUsage[apiType] = count || 0;
      }
    }

    return NextResponse.json({
      statistics: statistics || [],
      todayCost: todayCost || 0,
      monthlyCost: monthlyCost || 0,
      todayUsage,
      monthlyUsage,
    });
  } catch (error) {
    console.error('使用量取得エラー:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: '使用量の取得に失敗しました', details: message },
      { status: 500 }
    );
  }
}
