import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/todos/[todoId]/tags
 * ToDoのタグ一覧を取得
 */
export async function GET(
  request: Request,
  { params }: { params: { todoId: string } }
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

    const todoId = params.todoId;

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
        { error: 'このToDoのタグを閲覧する権限がありません' },
        { status: 403 }
      );
    }

    // ToDoのタグ一覧を取得（JOINでタグ情報も取得）
    const { data: todoTags, error } = await supabase
      .from('todo_tags')
      .select(`
        id,
        tag_id,
        tags (
          id,
          tag_name,
          tag_color
        )
      `)
      .eq('todo_id', todoId);

    if (error) {
      console.error('タグ取得エラー:', error);
      return NextResponse.json(
        { error: 'タグの取得に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ tags: todoTags || [] });
  } catch (err) {
    console.error('予期しないエラー:', err);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/todos/[todoId]/tags
 * ToDoにタグを追加
 */
export async function POST(
  request: Request,
  { params }: { params: { todoId: string } }
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

    const todoId = params.todoId;
    const body = await request.json();
    const { tag_id } = body;

    // バリデーション
    if (!tag_id || typeof tag_id !== 'string') {
      return NextResponse.json(
        { error: 'tag_idは必須です' },
        { status: 400 }
      );
    }

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
        { error: 'このToDoにタグを追加する権限がありません' },
        { status: 403 }
      );
    }

    // タグの所有権を確認
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('user_id')
      .eq('id', tag_id)
      .single();

    if (tagError || !tag) {
      return NextResponse.json(
        { error: 'タグが見つかりません' },
        { status: 404 }
      );
    }

    if (tag.user_id !== user.id) {
      return NextResponse.json(
        { error: 'このタグを使用する権限がありません' },
        { status: 403 }
      );
    }

    // ToDoにタグを追加
    const { data: todoTag, error } = await supabase
      .from('todo_tags')
      .insert({
        todo_id: todoId,
        tag_id: tag_id,
      })
      .select()
      .single();

    if (error) {
      // UNIQUE制約違反の場合
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'このToDoには既にこのタグが追加されています' },
          { status: 409 }
        );
      }

      console.error('タグ追加エラー:', error);
      return NextResponse.json(
        { error: 'タグの追加に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ todoTag }, { status: 201 });
  } catch (err) {
    console.error('予期しないエラー:', err);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
