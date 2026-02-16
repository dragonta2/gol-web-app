'use client';

import Link from 'next/link';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { AnnouncementsContent } from '@/components/announcements-content';

export default function AnnouncementsClient({
  canManageAnnouncements = false,
}: {
  canManageAnnouncements?: boolean;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ダッシュボードに戻る</span>
        </Link>

        <h1 className="text-xl sm:text-2xl font-bold text-cyan-400 mb-6 flex items-center gap-2">
          <Megaphone className="w-6 h-6" />
          お知らせ
        </h1>

        <AnnouncementsContent canManageAnnouncements={canManageAnnouncements} />
      </div>
    </div>
  );
}
