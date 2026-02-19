/**
 * 新規ユーザー初期値の後から適用（本番で set-new-user-defaults.sql 未実行のまま
 * サインアップしたユーザー向け）。1回だけ適用可能。
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const NEW_USER_DEFAULT_RIGHTS_CONFIG = {
  A: { points: 5, name: 'TVゲームをやる (2時間)' },
} as const;

const DEFAULT_HABITS = [
  { habit_name: '早起きする｜8時まで', habit_type: 'good' as const, points: 1, exp_body: 0, exp_mind: 0, exp_spirit: 0, display_order: 1, input_type: 'checkbox' as const, exclude_from_complete: false },
  { habit_name: '無目的なYouTube視聴', habit_type: 'bad' as const, points: 1, exp_body: 0, exp_mind: 0, exp_spirit: 0, display_order: 2, input_type: 'checkbox' as const, exclude_from_complete: false },
];

/** GET: 初期セットアップを適用できるかどうか */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points, rights_config')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ canApply: false, reason: 'プロファイル取得に失敗しました' });
    }

    const points = typeof profile.points === 'number' ? profile.points : 10;
    const hasRightsConfig = profile.rights_config != null && typeof profile.rights_config === 'object';
    const rightsIsEmpty = hasRightsConfig && (
      (Array.isArray((profile.rights_config as { rights?: unknown[] }).rights) && (profile.rights_config as { rights: unknown[] }).rights.length === 0) ||
      (Object.keys(profile.rights_config as object).length === 0)
    );
    const needsRights = !hasRightsConfig || rightsIsEmpty;

    const [{ count: todosCount, error: todosError }, { count: habitsCount, error: habitsError }] = await Promise.all([
      supabase.from('todos').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('habits').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    if (todosError || habitsError) {
      return NextResponse.json({ canApply: false, reason: '件数取得に失敗しました' });
    }

    const hasTodos = (todosCount ?? 0) > 0;
    const hasEnoughHabits = (habitsCount ?? 0) >= 2;
    const looksLikeOldNewUser = points <= 10 && needsRights && !hasTodos;
    const missingHabitsOrTodos = (habitsCount ?? 0) === 0 || (todosCount ?? 0) === 0;
    const canApply = looksLikeOldNewUser || missingHabitsOrTodos;

    return NextResponse.json({
      canApply,
      reason: canApply ? undefined : (hasTodos && hasEnoughHabits ? '既に初期セットアップ済みです' : '適用条件を満たしません'),
    });
  } catch (err) {
    console.error('apply-new-user-defaults GET error:', err);
    return NextResponse.json({ canApply: false, reason: 'エラーが発生しました' }, { status: 500 });
  }
}

/** POST: 初期セットアップを適用する */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points, rights_config')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'プロファイル取得に失敗しました' }, { status: 500 });
    }

    const points = typeof profile.points === 'number' ? profile.points : 10;
    const hasRightsConfig = profile.rights_config != null && typeof profile.rights_config === 'object';
    const rightsIsEmpty = hasRightsConfig && (
      (Array.isArray((profile.rights_config as { rights?: unknown[] }).rights) && (profile.rights_config as { rights: unknown[] }).rights.length === 0) ||
      (Object.keys(profile.rights_config as object).length === 0)
    );
    const needsRights = !hasRightsConfig || rightsIsEmpty;

    const [{ count: todosCount, error: todosError }, { count: habitsCount }] = await Promise.all([
      supabase.from('todos').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('habits').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    const hasTodos = (todosCount ?? 0) > 0;
    const hasEnoughHabits = (habitsCount ?? 0) >= 2;
    const missingSomething = (habitsCount ?? 0) === 0 || !hasTodos;
    if (todosError || (!missingSomething && hasEnoughHabits)) {
      return NextResponse.json({ applied: false, reason: '既に習慣・ToDoが揃っています' }, { status: 400 });
    }

    const needProfileUpdate = points <= 10 || needsRights;

    // 1. 必要なら profiles を 50G と 権利Aのみ に更新
    if (needProfileUpdate) {
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          points: 50,
          rights_config: NEW_USER_DEFAULT_RIGHTS_CONFIG,
        })
        .eq('id', user.id);

      if (updateProfileError) {
        console.error('apply-new-user-defaults profile update error:', updateProfileError);
        return NextResponse.json({ error: 'プロファイルの更新に失敗しました' }, { status: 500 });
      }
    }

    // 2. 習慣が0件ならデフォルト2件を挿入
    if ((habitsCount ?? 0) === 0) {
      const habitsToInsert = DEFAULT_HABITS.map((h) => ({ user_id: user.id, ...h }));
      const { error: habitsError } = await supabase.from('habits').insert(habitsToInsert);
      if (habitsError) {
        console.error('apply-new-user-defaults habits insert error:', habitsError);
        // プロファイルは更新済みなのでここではエラーにしない
      }
    }

    // 3. ToDoが0件ならデフォルトToDo 1件＋サブタスク1件
    if (!hasTodos) {
      const { data: insertedTodo, error: todoError } = await supabase
        .from('todos')
        .insert({
          user_id: user.id,
          task_name: 'テストタスク',
          status: 'active',
          due_date: '2026-12-31',
          display_order: 0,
        })
        .select('id')
        .single();

      if (todoError) {
        console.error('apply-new-user-defaults todo insert error:', todoError);
      } else if (insertedTodo?.id) {
        await supabase.from('todo_subtasks').insert({
          todo_id: insertedTodo.id,
          subtask_name: 'サブタスク サンプル',
          display_order: 0,
        });
      }
    }

    return NextResponse.json({ applied: true, message: '初期セットアップを適用しました。' });
  } catch (err) {
    console.error('apply-new-user-defaults POST error:', err);
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 });
  }
}
