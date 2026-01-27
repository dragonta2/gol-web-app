/**
 * 権利設定管理API Route
 * 
 * 権利のポイント消費量の取得・更新をサーバー側でバリデーション
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validatePoints, validateAll } from '@/lib/validation';

// 権利設定のデフォルト値
const DEFAULT_RIGHTS_CONFIG = {
  A: { points: 5, name: 'TVゲーム2時間' },
  B: { points: 4, name: 'お酒4杯まで' },
  C: { points: 1, name: '食事時動画1時間毎', maxCount: 10 },
  D: { points: 0, name: '睡眠導入剤' },
  E: { points: 3, name: '朝食 or 昼食を食べる', maxCount: 3 },
  F: { points: 10, name: 'EMKF' },
  O: { points: 5, name: 'ON (PLN以外)' },
  U: { points: 1, name: '宇都宮ダンス' },
  X: { points: 10, name: 'PLN動画 & ON 1時間' },
};

// GET: 権利設定を取得
export async function GET(request: NextRequest) {
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

    // ユーザーの権利設定を取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('rights_config')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('プロファイル取得エラー:', profileError);
      return NextResponse.json(
        { error: '設定の取得に失敗しました' },
        { status: 500 }
      );
    }

    // rights_configが存在する場合はそれを使用、なければデフォルト値
    const rightsConfig = profile?.rights_config || DEFAULT_RIGHTS_CONFIG;

    return NextResponse.json({ rightsConfig });
  } catch (error) {
    console.error('権利設定取得APIエラー:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT: 権利設定を更新
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
    const { rightsConfig } = body;

    // バリデーション: rightsConfigがオブジェクトであることを確認
    if (!rightsConfig || typeof rightsConfig !== 'object') {
      return NextResponse.json(
        { error: '権利設定の形式が不正です' },
        { status: 400 }
      );
    }

    // 各権利のポイント値をバリデーション
    const validRights = ['A', 'B', 'C', 'D', 'E', 'F', 'O', 'U', 'X'];
    const validationErrors: string[] = [];

    for (const rightCode of validRights) {
      const rightConfig = rightsConfig[rightCode];
      if (rightConfig && typeof rightConfig.points === 'number') {
        const pointValidation = validatePoints(rightConfig.points);
        if (!pointValidation.valid) {
          validationErrors.push(`権利${rightCode}: ${pointValidation.error}`);
        }
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validationErrors },
        { status: 400 }
      );
    }

    // デフォルト設定とマージ（存在しない権利はデフォルト値を使用）
    const mergedConfig = { ...DEFAULT_RIGHTS_CONFIG };
    for (const rightCode of validRights) {
      if (rightsConfig[rightCode]) {
        mergedConfig[rightCode as keyof typeof DEFAULT_RIGHTS_CONFIG] = {
          ...mergedConfig[rightCode as keyof typeof DEFAULT_RIGHTS_CONFIG],
          ...rightsConfig[rightCode],
        };
      }
    }

    // プロファイルを更新
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ rights_config: mergedConfig })
      .eq('id', user.id);

    if (updateError) {
      console.error('権利設定更新エラー:', updateError);
      return NextResponse.json(
        { error: '設定の更新に失敗しました', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, rightsConfig: mergedConfig });
  } catch (error) {
    console.error('権利設定更新APIエラー:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
