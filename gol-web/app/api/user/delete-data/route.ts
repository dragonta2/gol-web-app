/**
 * ユーザーデータ削除API Route
 * 
 * ユーザーが自分の全データを削除するためのエンドポイント
 * RLSにより、自分のデータのみ削除可能
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  try {
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 削除前のデータ件数を確認（ログ用）
    const [dailyLogsCount, habitsCount, todosCount, aiUsageCount] = await Promise.all([
      supabase.from('daily_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('habits').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('todos').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('ai_usage_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    console.log('削除対象データ件数:', {
      daily_logs: dailyLogsCount.count || 0,
      habits: habitsCount.count || 0,
      todos: todosCount.count || 0,
      ai_usage_logs: aiUsageCount.count || 0,
    });

    // 外部キー制約により、profilesを削除すると関連データも自動削除される
    // ただし、RLSにより自分のデータのみ削除可能
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (deleteError) {
      console.error('データ削除エラー:', deleteError);
      return NextResponse.json(
        { error: 'データの削除に失敗しました', details: deleteError.message },
        { status: 500 }
      );
    }

    // 認証ユーザーも削除（オプション）
    // 注意: これを実行すると、ユーザーはログインできなくなります
    // const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id);
    // if (authDeleteError) {
    //   console.error('認証ユーザー削除エラー:', authDeleteError);
    // }

    return NextResponse.json({
      message: 'データの削除が完了しました',
      deleted: {
        daily_logs: dailyLogsCount.count || 0,
        habits: habitsCount.count || 0,
        todos: todosCount.count || 0,
        ai_usage_logs: aiUsageCount.count || 0,
      },
    });
  } catch (error) {
    console.error('データ削除エラー:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'データの削除に失敗しました', details: message },
      { status: 500 }
    );
  }
}
