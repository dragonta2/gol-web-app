/**
 * レベルアップ必要EXPの設定API（全アカウント共通）
 *
 * GET: 認証ユーザーが共通閾値（またはデフォルト）を取得
 * PATCH: 管理者またはテストアカウントのみが共通閾値を保存可能（全ユーザーに反映）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canEditLevelThresholds } from '@/lib/auth/admin';
import { getGlobalLevelThresholds } from '@/lib/get-global-level-thresholds';
import { LEVEL_THRESHOLDS, type LevelThresholds } from '@/lib/rank-utils';

const LEVEL_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const canEdit = await canEditLevelThresholds();
    const global = await getGlobalLevelThresholds(supabase);
    const thresholds: LevelThresholds = global ?? { ...LEVEL_THRESHOLDS };

    return NextResponse.json({
      thresholds: Object.fromEntries(LEVEL_KEYS.map((lv) => [lv, thresholds[lv] ?? 0])),
      canEdit,
    });
  } catch (err) {
    console.error('level-thresholds GET error:', err);
    return NextResponse.json(
      { error: '設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const canEdit = await canEditLevelThresholds();
    if (!canEdit) {
      return NextResponse.json(
        { error: 'レベル閾値の変更は管理者・テストアカウントのみ可能です' },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const level_thresholds: LevelThresholds = {};
    for (const lv of LEVEL_KEYS) {
      const v = body[lv] ?? body[String(lv)];
      if (typeof v === 'number' && !Number.isNaN(v) && v >= 0) {
        level_thresholds[lv] = Math.floor(v);
      } else {
        return NextResponse.json(
          { error: `レベル${lv}の閾値が不正です（0以上の数値）` },
          { status: 400 }
        );
      }
    }

    const { error: upsertError } = await supabase
      .from('app_config')
      .upsert(
        {
          key: 'level_thresholds',
          value: level_thresholds,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (upsertError) {
      console.error('level-thresholds PATCH error:', upsertError);
      return NextResponse.json(
        { error: '設定の保存に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      thresholds: Object.fromEntries(LEVEL_KEYS.map((lv) => [lv, level_thresholds[lv]])),
    });
  } catch (err) {
    console.error('level-thresholds PATCH error:', err);
    return NextResponse.json(
      { error: '設定の保存に失敗しました' },
      { status: 500 }
    );
  }
}
