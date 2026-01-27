import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/tags
 * タグ一覧を取得
 */
export async function GET() {
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

    // タグ一覧を取得
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .order('tag_name', { ascending: true });

    if (error) {
      console.error('タグ取得エラー:', error);
      return NextResponse.json(
        { error: 'タグの取得に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ tags: tags || [] });
  } catch (err) {
    console.error('予期しないエラー:', err);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tags
 * 新しいタグを作成
 */
export async function POST(request: Request) {
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
    const { tag_name, tag_color } = body;

    // バリデーション
    if (!tag_name || typeof tag_name !== 'string' || tag_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'タグ名は必須です' },
        { status: 400 }
      );
    }

    if (tag_name.trim().length > 50) {
      return NextResponse.json(
        { error: 'タグ名は50文字以内で入力してください' },
        { status: 400 }
      );
    }

    // タグの色のバリデーション（HEX形式）
    const colorPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const finalColor = tag_color && colorPattern.test(tag_color) ? tag_color : '#3b82f6';

    // タグを作成
    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        user_id: user.id,
        tag_name: tag_name.trim(),
        tag_color: finalColor,
      })
      .select()
      .single();

    if (error) {
      // UNIQUE制約違反の場合
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '同じ名前のタグが既に存在します' },
          { status: 409 }
        );
      }

      console.error('タグ作成エラー:', error);
      return NextResponse.json(
        { error: 'タグの作成に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ tag }, { status: 201 });
  } catch (err) {
    console.error('予期しないエラー:', err);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
