'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { CalendarIcon } from 'lucide-react';
import { format, isValid } from 'date-fns';

export default function DateSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');

  // URLパラメータから日付を取得、なければ今日
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    dateParam ? new Date(dateParam) : new Date()
  );
  const [open, setOpen] = useState(false);

  // URLパラメータが変更されたときに日付を更新
  useEffect(() => {
    const newDateParam = searchParams.get('date');
    if (newDateParam) {
      const newDate = new Date(newDateParam);
      if (isValid(newDate)) {
        setSelectedDate(newDate);
      }
    } else {
      setSelectedDate(new Date());
    }
  }, [searchParams]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    setSelectedDate(date);
    const dateString = format(date, 'yyyy-MM-dd');

    const params = new URLSearchParams(searchParams.toString());
    params.set('date', dateString);
    router.push(`/dashboard?${params.toString()}`);

    setOpen(false);
  };

  const handleToday = () => {
    handleDateSelect(new Date());
  };

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="default"
            className="h-10 w-10 p-0 bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
            aria-label="日付を選ぶ"
          >
            <CalendarIcon className="h-5 w-5" />
          </Button>
        </DialogTrigger>
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
    </div>
  );
}
