import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseCookieOptions } from '@/lib/supabase/cookie-options';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/auth/success';

  if (code) {
    const cookieStore = await cookies();
    const pendingCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];
    const cookieOpts = {
      path: '/' as const,
      maxAge: 60 * 60 * 24 * 400,
      sameSite: 'lax' as const,
      // httpOnly は false（デフォルト）にする。
      // ブラウザの createBrowserClient が document.cookie 経由でセッション Cookie を読む必要があるため。
      secure: process.env.NODE_ENV === 'production',
    };

    // setAll は onAuthStateChange で非同期に呼ばれるため、呼ばれるまで待つ
    let resolveSetAll: () => void;
    const setAllPromise = new Promise<void>((resolve) => {
      resolveSetAll = resolve;
    });

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
              pendingCookies.push(c);
              cookieStore.set(c.name, c.value, cookieOpts);
            });
            resolveSetAll!();
          },
        },
        cookieOptions: supabaseCookieOptions,
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // セッションクッキーが setAll で設定されるまで待つ（onAuthStateChange が非同期のため）
      await Promise.race([
        setAllPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('setAll timeout')), 3000)),
      ]).catch(() => {
        // タイムアウトしてもリダイレクトは返す（pendingCookies が空の可能性あり）
      });
      const response = NextResponse.redirect(`${origin}${next}`);
      pendingCookies.forEach(({ name, value }) => response.cookies.set(name, value, cookieOpts));
      return response;
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
