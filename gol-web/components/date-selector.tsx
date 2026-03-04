'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCalendarDialog } from '@/contexts/calendar-dialog-context';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { isValid, format } from 'date-fns';

export default function DateSelector() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const ctx = useCalendarDialog();
  const pickerInputRef = useRef<HTMLInputElement>(null);

  const todayString = format(new Date(), 'yyyy-MM-dd');
  const initialDate = dateParam && isValid(new Date(dateParam)) ? dateParam : todayString;
  const [dateValue, setDateValue] = useState(initialDate);

  useEffect(() => {
    const next = searchParams.get('date');
    if (next && isValid(new Date(next))) setDateValue(next);
    else setDateValue(format(new Date(), 'yyyy-MM-dd'));
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = new Date(dateValue);
    if (!isValid(d)) return;
    const dateString = format(d, 'yyyy-MM-dd');
    ctx?.navigateToDate(dateString);
  };

  const openPicker = () => {
    pickerInputRef.current?.showPicker?.();
  };

  const handleDateAreaMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    pickerInputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="group relative flex items-center h-11 min-w-44 w-52 rounded-md border border-zinc-700 bg-zinc-900 focus-within:ring-2 focus-within:ring-cyan-500 focus-within:ring-offset-2 focus-within:ring-offset-zinc-900 transition-colors overflow-hidden">
        <button
          type="button"
          onClick={openPicker}
          className="flex items-center justify-center h-full min-w-11 shrink-0 text-zinc-400 hover:text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-inset rounded-l-md"
          aria-label="カレンダーを開く"
        >
          <CalendarIcon className="h-5 w-5 shrink-0" />
        </button>
        <input
          ref={pickerInputRef}
          type="date"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
          onMouseDown={handleDateAreaMouseDown}
          max={todayString}
          className="date-selector-segment-input relative flex-1 min-w-0 h-full bg-transparent border-0 pl-2 pr-8 text-white text-base text-right focus:outline-none scheme-dark rounded-r-md [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-8"
          aria-label="表示する日付を選択（クリックでセグメント選択、左アイコンでカレンダーを開く）"
        />
      </div>
      <Button
        type="submit"
        variant="outline"
        size="default"
        className="h-11 gap-2 px-3 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-white text-xs focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
        aria-label="その日の日誌を表示"
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-zinc-400" />
        <span className="text-white">日付へ移動</span>
      </Button>
    </form>
  );
}
