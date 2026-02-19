'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format, isValid } from 'date-fns';

interface CalendarDialogContextValue {
  openCalendar: () => void;
}

const CalendarDialogContext = createContext<CalendarDialogContextValue | null>(null);

export function useCalendarDialog() {
  const ctx = useContext(CalendarDialogContext);
  if (!ctx) return null;
  return ctx;
}

export function CalendarDialogProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    dateParam ? new Date(dateParam) : new Date()
  );
  const [open, setOpen] = useState(false);
  /** カレンダーで日付変更して遷移中の場合、その日付（yyyy-MM-dd）。同じスピナー表示用 */
  const [navigatingToDate, setNavigatingToDate] = useState<string | null>(null);

  useEffect(() => {
    const newDateParam = searchParams.get('date');
    queueMicrotask(() => {
      if (newDateParam) {
        const newDate = new Date(newDateParam);
        if (isValid(newDate)) {
          setSelectedDate(newDate);
        }
      } else {
        setSelectedDate(new Date());
      }
    });
  }, [searchParams]);

  /** URLのdateが遷移先と一致したらスピナーを消す */
  useEffect(() => {
    if (!navigatingToDate) return;
    if (searchParams.get('date') === navigatingToDate) {
      queueMicrotask(() => setNavigatingToDate(null));
    }
  }, [navigatingToDate, searchParams]);

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;

      setSelectedDate(date);
      const dateString = format(date, 'yyyy-MM-dd');
      setNavigatingToDate(dateString);
      setOpen(false);

      const params = new URLSearchParams(searchParams.toString());
      params.set('date', dateString);
      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleToday = useCallback(() => {
    handleDateSelect(new Date());
  }, [handleDateSelect]);

  const openCalendar = useCallback(() => {
    setOpen(true);
  }, []);

  return (
    <CalendarDialogContext.Provider value={{ openCalendar }}>
      {children}
      {navigatingToDate && (
        <div className="fixed inset-0 z-50 min-h-screen bg-zinc-950 flex items-center justify-center" aria-busy>
          <div
            className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-400 border-t-transparent"
            aria-hidden
          />
          <span className="sr-only">読み込み中</span>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[90vw] w-full sm:max-w-4xl bg-zinc-900 border-zinc-700 p-8"
        >
          <div className="flex flex-col items-center justify-center gap-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date > today;
              }}
              className="[--cell-size:5rem] w-full"
            />
            <div className="w-full max-w-md border-t border-zinc-800 pt-4">
              <Button
                onClick={handleToday}
                variant="outline"
                className="w-full bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-100 h-12 text-base"
                size="default"
              >
                今日に戻る
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CalendarDialogContext.Provider>
  );
}
