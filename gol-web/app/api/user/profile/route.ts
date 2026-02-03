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
      .select('username, is_admin')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('プロファイル取得エラー:', error);
      return NextResponse.json({ error: 'プロファイルの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      username: profile?.username ?? '',
      is_admin: profile?.is_admin === true,
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

    if (!username) {
      return NextResponse.json({ error: 'ニックネームを入力してください' }, { status: 400 });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user.id);

    if (error) {
      console.error('プロファイル更新エラー:', error);
      return NextResponse.json({ error: 'プロファイルの更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ username });
  } catch (err) {
    console.error('profile PATCH error:', err);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
