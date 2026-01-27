'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function DateSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  
  // URLパラメータから日付を取得、なければ今日
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    dateParam ? new Date(dateParam) : new Date()
  );
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // URLパラメータが変更されたときに日付を更新
  useEffect(() => {
    const newDateParam = searchParams.get('date');
    if (newDateParam) {
      const newDate = new Date(newDateParam);
      if (isValid(newDate)) {
        setSelectedDate(newDate);
        setInputValue(format(newDate, 'yyyy-MM-dd'));
      }
    } else {
      const today = new Date();
      setSelectedDate(today);
      setInputValue(format(today, 'yyyy-MM-dd'));
    }
  }, [searchParams]);

  // 選択日付が変更されたときにinputValueを更新
  useEffect(() => {
    if (selectedDate) {
      setInputValue(format(selectedDate, 'yyyy-MM-dd'));
    }
  }, [selectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    const dateString = format(date, 'yyyy-MM-dd');
    
    // URLパラメータを更新（ページリロードなし）
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', dateString);
    router.push(`/dashboard?${params.toString()}`);
    
    // カレンダーを閉じる
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // YYYY-MM-DD形式でパースを試みる
    if (value.length === 10) {
      const parsed = parse(value, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) {
        handleDateSelect(parsed);
      }
    }
  };

  const handleInputBlur = () => {
    // 入力値が無効な場合は、現在の選択日付に戻す
    if (selectedDate) {
      const formatted = format(selectedDate, 'yyyy-MM-dd');
      if (inputValue !== formatted) {
        const parsed = parse(inputValue, 'yyyy-MM-dd', new Date());
        if (!isValid(parsed)) {
          setInputValue(format(selectedDate, 'yyyy-MM-dd'));
        }
      }
    }
  };

  const handleToday = () => {
    const today = new Date();
    handleDateSelect(today);
  };

  const handlePreviousDay = () => {
    if (!selectedDate) return;
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    handleDateSelect(prevDate);
  };

  const handleNextDay = () => {
    if (!selectedDate) return;
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    handleDateSelect(nextDate);
  };

  const isToday = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 前の日 */}
      <Button
        onClick={handlePreviousDay}
        variant="ghost"
        size="default"
        className="h-10 w-10 p-0 hover:bg-zinc-800"
        aria-label="前の日"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      {/* 日付入力・選択 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className="w-[140px] h-10 bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-cyan-500 focus:ring-cyan-500"
            />
            <Button
              variant="outline"
              size="default"
              className="h-10 px-3 bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
              onClick={() => setOpen(!open)}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>
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
                // 今日以降の未来の日付を無効化
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

      {/* 次の日 */}
      <Button
        onClick={handleNextDay}
        variant="ghost"
        size="default"
        className="h-10 w-10 p-0 hover:bg-zinc-800"
        aria-label="次の日"
        disabled={isToday}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      {/* 今日のバッジ */}
      {isToday && (
        <span className="text-xs text-cyan-400 px-2 py-1.5 bg-cyan-400/10 rounded font-medium">
          今日
        </span>
      )}
    </div>
  );
}
