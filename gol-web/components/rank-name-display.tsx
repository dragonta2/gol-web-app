'use client';

import { useState, useEffect } from 'react';
import { getRankName, type RankMode } from '@/lib/rank-utils';
import {
  STORAGE_STORY_WORLD,
  STORY_WORLD_CHANGED_EVENT,
} from '@/lib/story-world-storage';

function getModeFromStorage(): RankMode {
  if (typeof window === 'undefined') return 'ghost';
  const stored = localStorage.getItem(STORAGE_STORY_WORLD);
  return stored === 'dq' || stored === 'ghost' ? stored : 'ghost';
}

/**
 * レベルからランク名を表示（localStorageの世界観に応じてヨウテイ/ドラクエを切り替え）
 */
export function RankNameDisplay({ level, className }: { level: number; className?: string }) {
  const [mode, setMode] = useState<RankMode>('ghost');

  useEffect(() => {
    const handler = () => setMode(getModeFromStorage());
    queueMicrotask(handler);
    window.addEventListener('storage', handler);
    window.addEventListener(STORY_WORLD_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener(STORY_WORLD_CHANGED_EVENT, handler);
    };
  }, []);

  return <span className={className}>{getRankName(level, mode)}</span>;
}

/**
 * ランク変更履歴1件の表示（from_level → to_level）
 */
export function RankHistoryItem({
  fromLevel,
  toLevel,
  changedAt,
}: {
  fromLevel: number;
  toLevel: number;
  changedAt: string;
}) {
  const [mode, setMode] = useState<RankMode>('ghost');

  useEffect(() => {
    const handler = () => setMode(getModeFromStorage());
    queueMicrotask(handler);
    window.addEventListener('storage', handler);
    window.addEventListener(STORY_WORLD_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener(STORY_WORLD_CHANGED_EVENT, handler);
    };
  }, []);

  const fromName = getRankName(fromLevel, mode);
  const toName = getRankName(toLevel, mode);
  const dateStr = new Date(changedAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <li className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0 text-sm">
      <span className="text-zinc-300">
        {fromName} → <span className="text-cyan-400 font-medium">{toName}</span>
      </span>
      <span className="text-zinc-500">{dateStr}</span>
    </li>
  );
}
