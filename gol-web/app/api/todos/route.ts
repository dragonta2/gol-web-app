/**
 * ToDo管理API Route
 * 
 * ToDoの作成・更新・削除をサーバー側でバリデーション
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validateTaskName,
  validateTodoStatus,
  validatePoints,
  validateExp,
  validateUUID,
  validateDateFormat,
  validateAll,
  validateSourceYidOptional,
} from '@/lib/validation';

function normalizeSourceYidInput(value: unknown): string | null {
  if (value === undefined || value === null || typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  const m = t.match(/^YID-(\d+)$/i);
  return m ? `YID-${m[1]}` : null;
}

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
      task_name,
      sp_points,
      sp_exp_body,
      sp_exp_mind,
      sp_exp_spirit,
      status,
      due_date,
      difficulty,
      is_on_hold,
      description,
      source_yid,
    } = body;

    // バリデーション
    const validation = validateAll([
      validateTaskName(task_name),
      validateTodoStatus(status),
      validatePoints(sp_points),
      validateExp(sp_exp_body, '身体EXP'),
      validateExp(sp_exp_mind, '頭脳EXP'),
      validateExp(sp_exp_spirit, '精神EXP'),
      validateSourceYidOptional(source_yid),
    ]);

    // due_dateが提供されている場合はバリデーション
    if (due_date) {
      const dateValidation = validateDateFormat(due_date);
      if (!dateValidation.valid) {
        return NextResponse.json(
          { error: dateValidation.error },
          { status: 400 }
        );
      }
    }

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] || 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    // 最大display_orderを取得
    const { data: maxOrderTodo } = await supabase
      .from('todos')
      .select('display_order')
      .eq('user_id', user.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const displayOrder = maxOrderTodo ? maxOrderTodo.display_order + 1 : 0;

    const normalizedYid = normalizeSourceYidInput(source_yid);
    if (normalizedYid) {
      const { data: yidDup } = await supabase
        .from('todos')
        .select('id')
        .eq('user_id', user.id)
        .eq('source_yid', normalizedYid)
        .maybeSingle();
      if (yidDup) {
        return NextResponse.json(
          { error: '同じ YID の ToDo が既に存在します', code: 'DUPLICATE_YID' },
          { status: 409 },
        );
      }
    }

    const desc =
      typeof description === 'string' && description.trim() ? description.trim() : null;

    // ToDoを作成（報酬は sp_* をそのまま保存。難易度は easy/medium/hard。保留はデフォルト false）
    const { data: newTodo, error: insertError } = await supabase
      .from('todos')
      .insert({
        user_id: user.id,
        task_name: task_name.trim(),
        description: desc,
        source_yid: normalizedYid,
        sp_points: sp_points ?? 0,
        sp_exp_body: sp_exp_body ?? 0,
        sp_exp_mind: sp_exp_mind ?? 0,
        sp_exp_spirit: sp_exp_spirit ?? 0,
        status: status || 'active',
        due_date: due_date || null,
        display_order: displayOrder,
        difficulty: difficulty && ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
        is_on_hold: is_on_hold === true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('ToDo作成エラー:', insertError);
      return NextResponse.json(
        { error: 'ToDoの作成に失敗しました', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, todo: newTodo });
  } catch (error) {
    console.error('ToDo作成APIエラー:', error);
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
      todoId,
      task_name,
      sp_points,
      sp_exp_body,
      sp_exp_mind,
      sp_exp_spirit,
      status,
      due_date,
      difficulty,
      is_on_hold,
    } = body;

    // バリデーション
    const validation = validateAll([
      validateUUID(todoId, 'ToDo ID'),
      validateTaskName(task_name),
      validateTodoStatus(status),
      validatePoints(sp_points),
      validateExp(sp_exp_body, '身体EXP'),
      validateExp(sp_exp_mind, '頭脳EXP'),
      validateExp(sp_exp_spirit, '精神EXP'),
    ]);

    // due_dateが提供されている場合はバリデーション
    if (due_date) {
      const dateValidation = validateDateFormat(due_date);
      if (!dateValidation.valid) {
        return NextResponse.json(
          { error: dateValidation.error },
          { status: 400 }
        );
      }
    }

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] || 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    // ToDoが存在し、ユーザーが所有しているか確認
    const { data: existingTodo, error: selectError } = await supabase
      .from('todos')
      .select('user_id')
      .eq('id', todoId)
      .single();

    if (selectError || !existingTodo) {
      return NextResponse.json(
        { error: 'ToDoが見つかりません' },
        { status: 404 }
      );
    }

    if (existingTodo.user_id !== user.id) {
      return NextResponse.json(
        { error: 'このToDoへのアクセス権限がありません' },
        { status: 403 }
      );
    }

    // ToDoを更新（報酬・難易度・保留を更新。保留を外したときは status を active に）
    const updatePayload: Record<string, unknown> = {
      task_name: task_name.trim(),
      sp_points: sp_points ?? 0,
      sp_exp_body: sp_exp_body ?? 0,
      sp_exp_mind: sp_exp_mind ?? 0,
      sp_exp_spirit: sp_exp_spirit ?? 0,
      status: status || 'active',
      due_date: due_date || null,
      difficulty: difficulty && ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
      is_on_hold: is_on_hold === true,
    };
    if (is_on_hold === false) {
      updatePayload.status = 'active';
    }
    const { error: updateError } = await supabase
      .from('todos')
      .update(updatePayload)
      .eq('id', todoId);

    if (updateError) {
      console.error('ToDo更新エラー:', updateError);
      return NextResponse.json(
        { error: 'ToDoの更新に失敗しました', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ToDo更新APIエラー:', error);
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
    const todoId = searchParams.get('id');

    // バリデーション
    if (!todoId) {
      return NextResponse.json(
        { error: 'ToDo IDが必要です' },
        { status: 400 }
      );
    }

    const uuidValidation = validateUUID(todoId, 'ToDo ID');
    if (!uuidValidation.valid) {
      return NextResponse.json(
        { error: uuidValidation.error },
        { status: 400 }
      );
    }

    // ToDoが存在し、ユーザーが所有しているか確認
    const { data: existingTodo, error: selectError } = await supabase
      .from('todos')
      .select('user_id')
      .eq('id', todoId)
      .single();

    if (selectError || !existingTodo) {
      return NextResponse.json(
        { error: 'ToDoが見つかりません' },
        { status: 404 }
      );
    }

    if (existingTodo.user_id !== user.id) {
      return NextResponse.json(
        { error: 'このToDoへのアクセス権限がありません' },
        { status: 403 }
      );
    }

    // ToDoを削除
    const { error: deleteError } = await supabase
      .from('todos')
      .delete()
      .eq('id', todoId);

    if (deleteError) {
      console.error('ToDo削除エラー:', deleteError);
      return NextResponse.json(
        { error: 'ToDoの削除に失敗しました', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ToDo削除APIエラー:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

