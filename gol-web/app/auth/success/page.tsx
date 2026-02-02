'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const REDIRECT_DELAY_MS = 3000;

/**
 * OAuth コールバック後に一度ここへ飛ばし、
 * クライアント側で /dashboard へ遷移する。
 * 遷移元を確認できるよう、数秒間 URL を表示してからリダイレクトする。
 */
export default function AuthSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(REDIRECT_DELAY_MS / 1000);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.replace('/dashboard');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 gap-4">
      <p className="text-zinc-300">ダッシュボードへ {countdown} 秒後に移動します...</p>
      <p className="text-zinc-500 text-sm font-mono break-all">
        現在: {typeof window !== 'undefined' ? window.location.href : ''}
      </p>
    </div>
  );
}
