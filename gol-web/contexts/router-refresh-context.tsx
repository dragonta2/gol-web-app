'use client';

import {
  createContext,
  useCallback,
  useContext,
  useTransition,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

type RouterRefreshContextValue = {
  /** RSC 再取得＋全画面オーバーレイ（確定・AI一括・設定反映など、待ちが分かりやすい操作向け） */
  refresh: () => void;
  /** RSC 再取得のみ（オーバーレイなし）。習慣チェック・ToDo状態・日誌の自動保存など高頻度向け */
  refreshQuiet: () => void;
};

const RouterRefreshContext = createContext<RouterRefreshContextValue | null>(
  null,
);

export function RouterRefreshProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition]);

  const refreshQuiet = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <RouterRefreshContext.Provider value={{ refresh, refreshQuiet }}>
      {children}
      {isPending ? (
        <div
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-3 bg-zinc-950/55 backdrop-blur-[2px] pointer-events-auto"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-8 py-6 shadow-xl">
            <div
              className="animate-spin rounded-full h-11 w-11 border-2 border-cyan-400 border-t-transparent"
              aria-hidden
            />
            <p className="text-sm text-zinc-300">更新を反映しています…</p>
          </div>
          <span className="sr-only">更新を反映しています</span>
        </div>
      ) : null}
    </RouterRefreshContext.Provider>
  );
}

export function useRouterRefresh() {
  const ctx = useContext(RouterRefreshContext);
  if (!ctx) {
    throw new Error('useRouterRefresh must be used within RouterRefreshProvider');
  }
  return ctx;
}
