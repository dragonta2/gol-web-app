/**
 * 日誌保存API Route
 * 
 * 日誌データの保存・更新をサーバー側でバリデーション
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validateJournalText,
  validateImpressionText,
  validateRightCount,
  validateUUID,
  validateAll,
} from '@/lib/validation';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      dailyLogId,
      journalText,
      impressionText,
      right_a_count,
      right_b_count,
      right_c_count,
      right_d_count,
      right_e_count,
      right_f_count,
      right_o_count,
      right_u_count,
      right_x_count,
    } = body;

    // バリデーション
    const validation = validateAll([
      validateUUID(dailyLogId, '日誌ID'),
      validateJournalText(journalText),
      validateImpressionText(impressionText),
      validateRightCount(right_a_count, 99),
      validateRightCount(right_b_count, 99),
      validateRightCount(right_c_count, 10), // 権利Cは最大10回
      validateRightCount(right_d_count, 99),
      validateRightCount(right_f_count, 99),
      validateRightCount(right_o_count, 99),
      validateRightCount(right_u_count, 99),
      validateRightCount(right_x_count, 99),
    ]);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] || 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    // 日誌が存在し、ユーザーが所有しているか確認
    const { data: existingLog, error: selectError } = await supabase
      .from('daily_logs')
      .select('user_id')
      .eq('id', dailyLogId)
      .single();

    if (selectError || !existingLog) {
      return NextResponse.json(
        { error: '日誌が見つかりません' },
        { status: 404 }
      );
    }

    if (existingLog.user_id !== user.id) {
      return NextResponse.json(
        { error: 'この日誌へのアクセス権限がありません' },
        { status: 403 }
      );
    }

    // 日誌を更新
    const { error: updateError } = await supabase
      .from('daily_logs')
      .update({
        journal_text: journalText || null,
        one_line_comment: impressionText || null,
        right_a_count: right_a_count || 0,
        right_b_count: right_b_count || 0,
        right_c_count: right_c_count || 0,
        right_d_count: right_d_count || 0,
        right_e_count: right_e_count || 0,
        right_f_count: right_f_count || 0,
        right_o_count: right_o_count || 0,
        right_u_count: right_u_count || 0,
        right_x_count: right_x_count || 0,
      })
      .eq('id', dailyLogId);

    if (updateError) {
      console.error('日誌更新エラー:', updateError);
      return NextResponse.json(
        { error: '日誌の更新に失敗しました', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('日誌保存APIエラー:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

