import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import LogoutButton from './logout-button';
import DashboardTabs from './dashboard-tabs';
import FontSizeControl from '@/components/font-size-control';
import DateSelector from '@/components/date-selector';
import { Trophy, Coins, Settings, Dumbbell, Brain, Sparkles } from 'lucide-react';

interface DashboardPageProps {
  searchParams: { date?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();

  // 認証状態をチェック
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // 未ログインの場合はログイン画面にリダイレクト
  if (authError || !user) {
    redirect('/login');
  }

  // profilesテーブルからユーザーデータを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // profilesが存在しない場合（新規ユーザーなど）はデフォルト値を使用
  // 通常はトリガーで自動作成されるが、念のため
  const userProfile = profile
    ? {
        name: profile.username,
        level: profile.level,
        class: profile.class_name,
        points: profile.points,
        exp: {
          body: profile.exp_body,
          intellect: profile.exp_mind,
          mind: profile.exp_spirit,
        },
      }
    : {
        name: user.email?.split('@')[0] || 'ユーザー',
        level: 1,
        class: '無名の凡人',
        points: 10,
        exp: {
          body: 0,
          intellect: 0,
          mind: 0,
        },
      };

  // URLパラメータから日付を取得、なければ今日
  const selectedDate = searchParams?.date || new Date().toISOString().split('T')[0];

  // 選択された日付のdaily_logsを取得（なければ作成）
  let dailyLogId: string | null = null;
  let dailyLogData: any = null;
  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  
  const { data: dailyLog, error: dailyLogError } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('log_date', selectedDate)
    .single();

  if (dailyLog) {
    dailyLogId = dailyLog.id;
    dailyLogData = dailyLog;
  } else if (isToday && (!dailyLogError || dailyLogError.code === 'PGRST116')) {
    // 今日の日付の場合のみ、daily_logsが存在しない場合は作成
    // 過去の日付の場合は作成しない（閲覧のみ）
    const { data: newDailyLog, error: insertError } = await supabase
      .from('daily_logs')
      .insert({
        user_id: user.id,
        log_date: selectedDate,
      })
      .select('*')
      .single();

    if (newDailyLog && !insertError) {
      dailyLogId = newDailyLog.id;
      dailyLogData = newDailyLog;
    }
  }

  // 並列で取得できるクエリを同時実行（パフォーマンス最適化）
  const [habitsResult, todosResult] = await Promise.all([
    // ユーザーのhabitsを取得（タグもJOINで取得）
    supabase
      .from('habits')
      .select(`
        *,
        habit_tags (
          tag_id,
          tags (
            id,
            tag_name,
            tag_color
          )
        )
      `)
      .eq('user_id', user.id)
      .order('habit_type', { ascending: true })
      .order('display_order', { ascending: true }),
    // ユーザーのtodosを取得（タグもJOINで取得）
    supabase
      .from('todos')
      .select(`
        *,
        todo_tags (
          tag_id,
          tags (
            id,
            tag_name,
            tag_color
          )
        )
      `)
      .eq('user_id', user.id)
      .order('status', { ascending: true })
      .order('display_order', { ascending: true }),
  ]);

  // habitsとtodosのデータを整形（タグ情報をtagsプロパティに変換）
  const habits = (habitsResult.data || []).map((habit: any) => ({
    ...habit,
    tags: (habit.habit_tags || []).map((ht: any) => ht.tags).filter(Boolean),
  }));

  // todosとtagsのデータを整形（タグ情報をtagsプロパティに変換）
  const todos = (todosResult.data || []).map((todo: any) => ({
    ...todo,
    tags: (todo.todo_tags || []).map((tt: any) => tt.tags).filter(Boolean),
  }));

  const todosError = todosResult.error;

  // エラーがある場合はコンソールに出力
  if (todosError) {
    console.error('❌ todos取得エラー:', todosError);
  }

  // dailyLogIdが取得できたら、habit_logsとtodo_logsを並列で取得
  const [habitLogsResult, todoLogsResult] = dailyLogId
    ? await Promise.all([
        supabase
          .from('habit_logs')
          .select('*')
          .eq('daily_log_id', dailyLogId),
        supabase
          .from('todo_logs')
          .select('*')
          .eq('daily_log_id', dailyLogId),
      ])
    : [{ data: null }, { data: null }];

  const habitLogs = habitLogsResult.data;
  const todoLogs = todoLogsResult.data;

  // todosが取得できたら、todo_subtasksを取得
  const { data: todoSubtasks } = todos.length > 0
    ? await supabase
        .from('todo_subtasks')
        .select('*')
        .in('todo_id', todos.map((t) => t.id))
        .order('display_order', { ascending: true })
    : { data: [] };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ステータスバー（固定ヘッダー） */}
      <header className="sticky top-0 z-50 bg-zinc-900 border-b border-zinc-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* 1行目: ユーザー情報・ポイント・アクション */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <h1 className="text-xl sm:text-2xl font-bold text-cyan-400 flex items-center gap-2">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>{userProfile.name}</span>
              </h1>
              <div className="flex items-center gap-2 text-base sm:text-lg text-zinc-300">
                <span>Lv.{userProfile.level}</span>
                <span className="text-zinc-500">|</span>
                <span className="hidden sm:inline">{userProfile.class}</span>
                <span className="sm:hidden">{userProfile.class.length > 10 ? userProfile.class.substring(0, 10) + '...' : userProfile.class}</span>
              </div>
              <div className="flex items-center gap-1 text-base sm:text-lg font-semibold text-yellow-400">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{userProfile.points}pt</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <DateSelector />
              <FontSizeControl />
              <Link
                href="/settings"
                className="flex-1 sm:flex-none px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-base sm:text-lg rounded transition-colors text-center flex items-center justify-center gap-1.5"
              >
                <Settings className="w-4 h-4" />
                <span>設定</span>
              </Link>
              <LogoutButton />
            </div>
          </div>

          {/* 2行目: EXP表示 */}
          <div className="flex items-center gap-3 sm:gap-6 text-base sm:text-lg">
            <div className="flex items-center gap-1 sm:gap-2">
              <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>身体:</span>
              <span className="font-semibold text-cyan-400">{userProfile.exp.body}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>頭脳:</span>
              <span className="font-semibold text-cyan-400">{userProfile.exp.intellect}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>精神:</span>
              <span className="font-semibold text-cyan-400">{userProfile.exp.mind}</span>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <DashboardTabs
          habits={habits || []}
          habitLogs={habitLogs || []}
          dailyLogId={dailyLogId}
          dailyLog={dailyLogData}
          todos={todos || []}
          todoLogs={todoLogs || []}
          todoSubtasks={todoSubtasks || []}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );
}
