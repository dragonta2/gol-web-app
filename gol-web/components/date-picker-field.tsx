'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { FormLabel } from '@/components/ui/form-input';
import { CalendarIcon } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DatePickerFieldProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** 任意の場合はクリアボタンを表示 */
  optional?: boolean;
  className?: string;
}

export function DatePickerField({
  id,
  label,
  value,
  onChange,
  placeholder = '年/月/日',
  optional = true,
  className,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = value && isValid(parse(value, 'yyyy-MM-dd', new Date()))
    ? parse(value, 'yyyy-MM-dd', new Date())
    : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange(format(date, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const handleToday = () => {
    handleSelect(new Date());
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  const   displayText = value
    ? format(parse(value, 'yyyy-MM-dd', new Date()), "yyyy年MM月dd日'-'EEE", { locale: ja })
    : '';

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <FormLabel htmlFor={id} className="text-zinc-300">
          {label}
        </FormLabel>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            id={id}
            className={cn(
              'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-base text-zinc-100',
              'shadow-sm transition-colors hover:bg-zinc-750 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 focus-visible:ring-offset-0'
            )}
          >
            <span className={value ? '' : 'text-zinc-500'}>{displayText || placeholder}</span>
            <CalendarIcon className="h-4 w-4 shrink-0 text-zinc-100" aria-hidden />
          </button>
        </DialogTrigger>
        <DialogContent
          className="max-w-[90vw] w-full sm:max-w-md bg-zinc-900 border-zinc-700 p-6"
        >
          <div className="flex flex-col gap-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              initialFocus
              className="[--cell-size:2.75rem] w-full"
            />
            <div className="flex flex-col gap-2 border-t border-zinc-800 pt-4">
              <Button
                onClick={handleToday}
                variant="outline"
                className="w-full bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-100"
                size="default"
              >
                今日
              </Button>
              {optional && (
                <Button
                  onClick={handleClear}
                  variant="ghost"
                  className="w-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                  size="default"
                >
                  クリア
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
