/**
 * Google OAuth をサーバー側で開始する。
 * code_verifier をサーバーのクッキーに保存するため、ログアウト後の再ログインでも PKCE が通る。
 */
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseCookieOptions } from '@/lib/supabase/cookie-options';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const redirectTo = `${origin}/auth/callback`;

  const cookieStore = await cookies();
  const pendingCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];
  const cookieOpts = {
    path: '/' as const,
    maxAge: 60 * 60 * 24 * 400,
    sameSite: 'lax' as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((c) => {
            pendingCookies.push({ ...c });
            cookieStore.set(c.name, c.value, cookieOpts);
          });
        },
      },
      cookieOptions: supabaseCookieOptions,
    }
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  if (!data?.url) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('OAuth URL の取得に失敗しました')}`
    );
  }

  const response = NextResponse.redirect(data.url);
  pendingCookies.forEach(({ name, value }) =>
    response.cookies.set(name, value, cookieOpts)
  );
  return response;
}
