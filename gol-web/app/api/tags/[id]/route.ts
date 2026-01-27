import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * PUT /api/tags/[id]
 * タグを更新
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
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

    const tagId = params.id;
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

    // タグの所有権を確認
    const { data: existingTag, error: selectError } = await supabase
      .from('tags')
      .select('user_id')
      .eq('id', tagId)
      .single();

    if (selectError || !existingTag) {
      return NextResponse.json(
        { error: 'タグが見つかりません' },
        { status: 404 }
      );
    }

    if (existingTag.user_id !== user.id) {
      return NextResponse.json(
        { error: 'このタグを更新する権限がありません' },
        { status: 403 }
      );
    }

    // タグを更新
    const { data: tag, error } = await supabase
      .from('tags')
      .update({
        tag_name: tag_name.trim(),
        tag_color: finalColor,
      })
      .eq('id', tagId)
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

      console.error('タグ更新エラー:', error);
      return NextResponse.json(
        { error: 'タグの更新に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ tag });
  } catch (err) {
    console.error('予期しないエラー:', err);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tags/[id]
 * タグを削除
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
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

    const tagId = params.id;

    // タグの所有権を確認
    const { data: existingTag, error: selectError } = await supabase
      .from('tags')
      .select('user_id')
      .eq('id', tagId)
      .single();

    if (selectError || !existingTag) {
      return NextResponse.json(
        { error: 'タグが見つかりません' },
        { status: 404 }
      );
    }

    if (existingTag.user_id !== user.id) {
      return NextResponse.json(
        { error: 'このタグを削除する権限がありません' },
        { status: 403 }
      );
    }

    // タグを削除（CASCADEで関連付けも自動削除）
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId);

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
