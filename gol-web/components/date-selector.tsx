'use client';

import { useCalendarDialog } from '@/contexts/calendar-dialog-context';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';

export default function DateSelector() {
  const { openCalendar } = useCalendarDialog() ?? { openCalendar: () => {} };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={openCalendar}
        variant="outline"
        size="default"
        className="h-10 gap-2 px-3 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-white"
        aria-label="日付を選ぶ"
      >
        <CalendarIcon className="h-5 w-5 shrink-0" />
        <span className="text-white">カレンダー</span>
      </Button>
    </div>
  );
}
