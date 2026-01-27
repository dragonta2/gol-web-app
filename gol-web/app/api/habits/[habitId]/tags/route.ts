import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/habits/[habitId]/tags
 * 習慣のタグ一覧を取得
 */
export async function GET(
  request: Request,
  { params }: { params: { habitId: string } }
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

    const habitId = params.habitId;

    // 習慣の所有権を確認
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('user_id')
      .eq('id', habitId)
      .single();

    if (habitError || !habit) {
      return NextResponse.json(
        { error: '習慣が見つかりません' },
        { status: 404 }
      );
    }

    if (habit.user_id !== user.id) {
      return NextResponse.json(
        { error: 'この習慣のタグを閲覧する権限がありません' },
        { status: 403 }
      );
    }

    // 習慣のタグ一覧を取得（JOINでタグ情報も取得）
    const { data: habitTags, error } = await supabase
      .from('habit_tags')
      .select(`
        id,
        tag_id,
        tags (
          id,
          tag_name,
          tag_color
        )
      `)
      .eq('habit_id', habitId);

    if (error) {
      console.error('タグ取得エラー:', error);
      return NextResponse.json(
        { error: 'タグの取得に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ tags: habitTags || [] });
  } catch (err) {
    console.error('予期しないエラー:', err);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/habits/[habitId]/tags
 * 習慣にタグを追加
 */
export async function POST(
  request: Request,
  { params }: { params: { habitId: string } }
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

    const habitId = params.habitId;
    const body = await request.json();
    const { tag_id } = body;

    // バリデーション
    if (!tag_id || typeof tag_id !== 'string') {
      return NextResponse.json(
        { error: 'tag_idは必須です' },
        { status: 400 }
      );
    }

    // 習慣の所有権を確認
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('user_id')
      .eq('id', habitId)
      .single();

    if (habitError || !habit) {
      return NextResponse.json(
        { error: '習慣が見つかりません' },
        { status: 404 }
      );
    }

    if (habit.user_id !== user.id) {
      return NextResponse.json(
        { error: 'この習慣にタグを追加する権限がありません' },
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

    // 習慣にタグを追加
    const { data: habitTag, error } = await supabase
      .from('habit_tags')
      .insert({
        habit_id: habitId,
        tag_id: tag_id,
      })
      .select()
      .single();

    if (error) {
      // UNIQUE制約違反の場合
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'この習慣には既にこのタグが追加されています' },
          { status: 409 }
        );
      }

      console.error('タグ追加エラー:', error);
      return NextResponse.json(
        { error: 'タグの追加に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ habitTag }, { status: 201 });
  } catch (err) {
    console.error('予期しないエラー:', err);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
