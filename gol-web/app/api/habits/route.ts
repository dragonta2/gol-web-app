/**
 * 習慣管理API Route
 * 
 * 習慣の作成・更新をサーバー側でバリデーション
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validateHabitName,
  validateHabitType,
  validateInputType,
  validatePoints,
  validateExp,
  validateUUID,
  validateAll,
} from '@/lib/validation';

export async function POST(request: NextRequest) {
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
      habit_name,
      description,
      habit_type,
      points,
      exp_body,
      exp_mind,
      exp_spirit,
      input_type,
      exclude_weekends,
      exclude_from_complete,
    } = body;

    // バリデーション
    const validation = validateAll([
      validateHabitName(habit_name),
      validateHabitType(habit_type),
      validateInputType(input_type),
      validatePoints(points),
      validateExp(exp_body, '身体EXP'),
      validateExp(exp_mind, '頭脳EXP'),
      validateExp(exp_spirit, '精神EXP'),
    ]);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] || 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    // 最大display_orderを取得
    const { data: maxOrderHabit } = await supabase
      .from('habits')
      .select('display_order')
      .eq('user_id', user.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const displayOrder = maxOrderHabit ? maxOrderHabit.display_order + 1 : 0;

    // 習慣を作成（description はカラムがある場合のみ送る＝マイグレーション未実施でも作成できるようにする）
    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      habit_name: habit_name.trim(),
      habit_type,
      points: points || 1,
      exp_body: exp_body || 0,
      exp_mind: exp_mind || 0,
      exp_spirit: exp_spirit || 0,
      input_type: input_type || 'checkbox',
      exclude_weekends: exclude_weekends || false,
      exclude_from_complete: exclude_from_complete || false,
      is_custom: true,
      display_order: displayOrder,
    };
    const descValue = typeof description === 'string' && description.trim() ? description.trim() : null;
    if (descValue !== null) {
      insertPayload.description = descValue;
    }

    const { data: newHabit, error: insertError } = await supabase
      .from('habits')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error('習慣作成エラー:', insertError);
      return NextResponse.json(
        { error: '習慣の作成に失敗しました', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, habit: newHabit });
  } catch (error) {
    console.error('習慣作成APIエラー:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

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
      habitId,
      habit_name,
      description,
      habit_type,
      points,
      exp_body,
      exp_mind,
      exp_spirit,
      input_type,
      exclude_weekends,
      exclude_from_complete,
    } = body;

    // バリデーション
    const validation = validateAll([
      validateUUID(habitId, '習慣ID'),
      validateHabitName(habit_name),
      validateHabitType(habit_type),
      validateInputType(input_type),
      validatePoints(points),
      validateExp(exp_body, '身体EXP'),
      validateExp(exp_mind, '頭脳EXP'),
      validateExp(exp_spirit, '精神EXP'),
    ]);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] || 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    // 習慣が存在し、ユーザーが所有しているか確認
    const { data: existingHabit, error: selectError } = await supabase
      .from('habits')
      .select('user_id')
      .eq('id', habitId)
      .single();

    if (selectError || !existingHabit) {
      return NextResponse.json(
        { error: '習慣が見つかりません' },
        { status: 404 }
      );
    }

    if (existingHabit.user_id !== user.id) {
      return NextResponse.json(
        { error: 'この習慣へのアクセス権限がありません' },
        { status: 403 }
      );
    }

    // 習慣を更新（description は値があるときだけ送る＝マイグレーション未実施でも更新できるようにする）
    const updatePayload: Record<string, unknown> = {
      habit_name: habit_name.trim(),
      habit_type,
      points: points || 1,
      exp_body: exp_body || 0,
      exp_mind: exp_mind || 0,
      exp_spirit: exp_spirit || 0,
      input_type: input_type || 'checkbox',
      exclude_weekends: exclude_weekends || false,
      exclude_from_complete: exclude_from_complete || false,
    };
    const descValue = typeof description === 'string' && description.trim() ? description.trim() : null;
    if (descValue !== null) {
      updatePayload.description = descValue;
    }

    const { error: updateError } = await supabase
      .from('habits')
      .update(updatePayload)
      .eq('id', habitId);

    if (updateError) {
      console.error('習慣更新エラー:', updateError);
      return NextResponse.json(
        { error: '習慣の更新に失敗しました', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('習慣更新APIエラー:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const habitId = searchParams.get('id');

    // バリデーション
    if (!habitId) {
      return NextResponse.json(
        { error: '習慣IDが必要です' },
        { status: 400 }
      );
    }

    const uuidValidation = validateUUID(habitId, '習慣ID');
    if (!uuidValidation.valid) {
      return NextResponse.json(
        { error: uuidValidation.error },
        { status: 400 }
      );
    }

    // 習慣が存在し、ユーザーが所有しているか確認
    const { data: existingHabit, error: selectError } = await supabase
      .from('habits')
      .select('user_id, is_custom')
      .eq('id', habitId)
      .single();

    if (selectError || !existingHabit) {
      return NextResponse.json(
        { error: '習慣が見つかりません' },
        { status: 404 }
      );
    }

    if (existingHabit.user_id !== user.id) {
      return NextResponse.json(
        { error: 'この習慣へのアクセス権限がありません' },
        { status: 403 }
      );
    }

    // カスタム習慣のみ削除可能（デフォルト習慣は削除不可）
    if (!existingHabit.is_custom) {
      return NextResponse.json(
        { error: 'デフォルト習慣は削除できません' },
        { status: 403 }
      );
    }

    // 習慣を削除
    const { error: deleteError } = await supabase
      .from('habits')
      .delete()
      .eq('id', habitId);

    if (deleteError) {
      console.error('習慣削除エラー:', deleteError);
      return NextResponse.json(
        { error: '習慣の削除に失敗しました', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('習慣削除APIエラー:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

