import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // 認証状態をチェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // URLパラメータから期間を取得（デフォルト: 30日間）
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const limit = Math.min(Math.max(days, 7), 90); // 7日〜90日の範囲に制限

    // 開始日を計算
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - limit);

    // 期間内に作成されたtodosを取得
    const { data: todos, error: todosError } = await supabase
      .from('todos')
      .select('id, task_name, status, is_special, created_at, completed_at')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (todosError) {
      console.error('todos取得エラー:', todosError);
      return NextResponse.json(
        { error: 'データの取得に失敗しました' },
        { status: 500 }
      );
    }

    if (!todos || todos.length === 0) {
      return NextResponse.json({
        data: [],
        summary: {
          totalTodos: 0,
          completedTodos: 0,
          completionRate: 0,
          averageByType: {
            special: 0,
            normal: 0,
          },
        },
      });
    }

    // 完了済みタスクをカウント
    const completedTodos = todos.filter(todo => todo.status === 'completed');
    const totalTodos = todos.length;
    const completionRate = totalTodos > 0 ? (completedTodos.length / totalTodos) * 100 : 0;

    // SPタスク/通常タスク別の完了率を計算
    const specialTodos = todos.filter(todo => todo.is_special === true);
    const normalTodos = todos.filter(todo => todo.is_special === false);
    
    const completedSpecialTodos = specialTodos.filter(todo => todo.status === 'completed');
    const completedNormalTodos = normalTodos.filter(todo => todo.status === 'completed');

    const specialCompletionRate = specialTodos.length > 0
      ? (completedSpecialTodos.length / specialTodos.length) * 100
      : 0;
    
    const normalCompletionRate = normalTodos.length > 0
      ? (completedNormalTodos.length / normalTodos.length) * 100
      : 0;

    // 日別の完了率を計算
    const dailyCompletion: { date: string; completed: number; total: number; rate: number }[] = [];
    const dateMap = new Map<string, { completed: number; total: number }>();

    todos.forEach(todo => {
      const createdDate = new Date(todo.created_at).toISOString().split('T')[0];
      if (!dateMap.has(createdDate)) {
        dateMap.set(createdDate, { completed: 0, total: 0 });
      }
      const dayData = dateMap.get(createdDate)!;
      dayData.total += 1;
      if (todo.status === 'completed') {
        dayData.completed += 1;
      }
    });

    // 日付順にソートして配列に変換
    Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([date, data]) => {
        dailyCompletion.push({
          date,
          completed: data.completed,
          total: data.total,
          rate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
        });
      });

    return NextResponse.json({
      data: dailyCompletion,
      summary: {
        totalTodos,
        completedTodos: completedTodos.length,
        completionRate: Math.round(completionRate * 10) / 10,
        averageByType: {
          special: Math.round(specialCompletionRate * 10) / 10,
          normal: Math.round(normalCompletionRate * 10) / 10,
        },
        specialTodos: specialTodos.length,
        normalTodos: normalTodos.length,
        completedSpecialTodos: completedSpecialTodos.length,
        completedNormalTodos: completedNormalTodos.length,
      },
    });
  } catch (error) {
    console.error('APIエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
