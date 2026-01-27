import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * DELETE /api/todos/[todoId]/tags/[tagId]
 * ToDoからタグを削除
 */
export async function DELETE(
  request: Request,
  { params }: { params: { todoId: string; tagId: string } }
) {
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

    const { todoId, tagId } = params;

    // ToDoの所有権を確認
    const { data: todo, error: todoError } = await supabase
      .from('todos')
      .select('user_id')
      .eq('id', todoId)
      .single();

    if (todoError || !todo) {
      return NextResponse.json(
        { error: 'ToDoが見つかりません' },
        { status: 404 }
      );
    }

    if (todo.user_id !== user.id) {
      return NextResponse.json(
        { error: 'このToDoからタグを削除する権限がありません' },
        { status: 403 }
      );
    }

    // ToDoからタグを削除
    const { error } = await supabase
      .from('todo_tags')
      .delete()
      .eq('todo_id', todoId)
      .eq('tag_id', tagId);

    if (error) {
      console.error('タグ削除エラー:', error);
      return NextResponse.json(
        { error: 'タグの削除に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'タグを削除しました' });
  } catch (err) {
    console.error('予期しないエラー:', err);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
