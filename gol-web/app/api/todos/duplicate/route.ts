/**
 * ToDo複製API Route
 *
 * 指定したToDoとそのサブタスクをまとめて複製する
 * 複製後のToDo: status=active, name="{元の名前} のコピー", display_order=末尾+1
 * 複製後のサブタスク: is_completed=false, completed_at=null
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateUUID } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { todoId } = body;

    const uuidValidation = validateUUID(todoId, 'ToDo ID');
    if (!uuidValidation.valid) {
      return NextResponse.json({ error: uuidValidation.error }, { status: 400 });
    }

    // 元のToDoを取得（所有確認込み）
    const { data: original, error: fetchError } = await supabase
      .from('todos')
      .select('*')
      .eq('id', todoId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: 'ToDoが見つかりません' }, { status: 404 });
    }

    // 末尾のdisplay_orderを取得
    const { data: maxOrderTodo } = await supabase
      .from('todos')
      .select('display_order')
      .eq('user_id', user.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const displayOrder = maxOrderTodo ? maxOrderTodo.display_order + 1 : 0;

    // ToDoを複製（status=active, completed_at=null, 名前に「のコピー」を付与）
    const { data: newTodo, error: insertError } = await supabase
      .from('todos')
      .insert({
        user_id: user.id,
        task_name: `${original.task_name} のコピー`,
        sp_points: original.sp_points,
        sp_exp_body: original.sp_exp_body,
        sp_exp_mind: original.sp_exp_mind,
        sp_exp_spirit: original.sp_exp_spirit,
        status: 'active',
        is_on_hold: false,
        due_date: original.due_date,
        difficulty: original.difficulty,
        display_order: displayOrder,
        completed_at: null,
      })
      .select()
      .single();

    if (insertError || !newTodo) {
      console.error('ToDo複製エラー:', insertError);
      return NextResponse.json({ error: 'ToDoの複製に失敗しました' }, { status: 500 });
    }

    // サブタスクを取得して複製
    const { data: subtasks } = await supabase
      .from('todo_subtasks')
      .select('*')
      .eq('todo_id', todoId)
      .order('display_order', { ascending: true });

    if (subtasks && subtasks.length > 0) {
      const newSubtasks = subtasks.map((st) => ({
        todo_id: newTodo.id,
        subtask_name: st.subtask_name,
        display_order: st.display_order,
        is_completed: false,
        completed_at: null,
      }));

      const { error: subtaskInsertError } = await supabase
        .from('todo_subtasks')
        .insert(newSubtasks);

      if (subtaskInsertError) {
        console.error('サブタスク複製エラー:', subtaskInsertError);
        // ToDoは作成済みなので警告のみ（ロールバックしない）
      }
    }

    return NextResponse.json({ success: true, todo: newTodo });
  } catch (error) {
    console.error('ToDo複製APIエラー:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
