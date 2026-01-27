import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * DELETE /api/habits/[habitId]/tags/[tagId]
 * 習慣からタグを削除
 */
export async function DELETE(
  request: Request,
  { params }: { params: { habitId: string; tagId: string } }
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

    const { habitId, tagId } = params;

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
        { error: 'この習慣からタグを削除する権限がありません' },
        { status: 403 }
      );
    }

    // 習慣からタグを削除
    const { error } = await supabase
      .from('habit_tags')
      .delete()
      .eq('habit_id', habitId)
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
