/**
 * AI生成テキストの文字数制限API
 *
 * GET: 認証ユーザーが制限値を取得（AI一括生成・設定画面で使用）
 * PATCH: 管理者のみが制限値を保存
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/admin';
import {
  rowToAiOutputLimits,
  DEFAULT_AI_OUTPUT_LIMITS,
  AI_OUTPUT_LIMITS_KEYS,
  type AiOutputLimits,
} from '@/lib/ai/ai-output-limits';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: row, error } = await supabase
      .from('ai_output_limits')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      const isMissing =
        error.code === '42P01' ||
        (error.message && /does not exist|relation.*not found/i.test(error.message));
      if (isMissing) {
        return NextResponse.json({ limits: DEFAULT_AI_OUTPUT_LIMITS });
      }
      console.error('ai-output-limits GET error:', error);
      return NextResponse.json(
        { error: '文字数制限の取得に失敗しました' },
        { status: 500 }
      );
    }

    const limits = rowToAiOutputLimits(row as Record<string, unknown>);
    return NextResponse.json({ limits });
  } catch (err) {
    console.error('ai-output-limits GET error:', err);
    return NextResponse.json(
      { error: '文字数制限の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const body = await request.json();
    const updates: Partial<AiOutputLimits> = {};
    for (const key of AI_OUTPUT_LIMITS_KEYS) {
      if (typeof body[key] === 'number' && !Number.isNaN(body[key])) {
        updates[key] = Math.max(0, Math.floor(body[key]));
      }
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: '有効な制限値がありません' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('ai_output_limits')
      .upsert(
        {
          id: 1,
          ...updates,
          updated_by: user?.id ?? null,
        },
        { onConflict: 'id' }
      );

    if (error) {
      const isMissing = error.code === '42P01' || error.message?.includes('does not exist');
      return NextResponse.json(
        {
          error: isMissing
            ? 'ai_output_limits テーブルが存在しません。add-ai-output-limits.sql を実行してください。'
            : '文字数制限の保存に失敗しました',
          details: error.message,
        },
        { status: isMissing ? 503 : 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('ai-output-limits PATCH error:', err);
    return NextResponse.json(
      { error: '文字数制限の保存に失敗しました' },
      { status: 500 }
    );
  }
}
