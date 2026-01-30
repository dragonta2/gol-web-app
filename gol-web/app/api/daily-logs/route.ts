/**
 * 日誌保存API Route
 * 
 * 日誌データの保存・更新をサーバー側でバリデーション
 * 権利カラムは RIGHT_COLUMNS_BY_INDEX で動的に処理（最大24件）
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
import { RIGHT_COLUMNS_BY_INDEX } from '@/lib/rights';

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
    const { dailyLogId, journalText, impressionText, ...rest } = body;

    // 権利カラムの値を配列順で取得しバリデーション
    const rightCounts = RIGHT_COLUMNS_BY_INDEX.map((col) => {
      const v = rest[col];
      return typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : 0;
    });
    const maxPerRight = 99;
    const validations = [
      validateUUID(dailyLogId, '日誌ID'),
      validateJournalText(journalText),
      validateImpressionText(impressionText),
      ...rightCounts.map((n, i) => validateRightCount(Number.isNaN(n) ? 0 : n, i === 2 ? 10 : maxPerRight)), // 3番目(権利C相当)は最大10回
    ];

    const validation = validateAll(validations);

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

    const updatePayload: Record<string, unknown> = {
      journal_text: journalText || null,
      one_line_comment: impressionText || null,
    };
    RIGHT_COLUMNS_BY_INDEX.forEach((col, i) => {
      updatePayload[col] = rightCounts[i] ?? 0;
    });

    // 日誌を更新
    const { error: updateError } = await supabase
      .from('daily_logs')
      .update(updatePayload)
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

