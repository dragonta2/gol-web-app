/**
 * ユーザープロファイル取得・更新API
 * ニックネーム（username）の取得・更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('username, is_admin, use_username_as_display_name')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('プロファイル取得エラー:', error);
      return NextResponse.json({ error: 'プロファイルの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      username: profile?.username ?? '',
      is_admin: profile?.is_admin === true,
      use_username_as_display_name: profile?.use_username_as_display_name !== false,
    });
  } catch (err) {
    console.error('profile GET error:', err);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const useUsernameAsDisplayName =
      typeof body.use_username_as_display_name === 'boolean'
        ? body.use_username_as_display_name
        : undefined;

    if (!username) {
      return NextResponse.json({ error: 'ニックネームを入力してください' }, { status: 400 });
    }

    const updatePayload: { username: string; use_username_as_display_name?: boolean } = {
      username,
    };
    if (useUsernameAsDisplayName !== undefined) {
      updatePayload.use_username_as_display_name = useUsernameAsDisplayName;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id);

    if (error) {
      console.error('プロファイル更新エラー:', error);
      return NextResponse.json({ error: 'プロファイルの更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      username,
      use_username_as_display_name: updatePayload.use_username_as_display_name ?? true,
    });
  } catch (err) {
    console.error('profile PATCH error:', err);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
