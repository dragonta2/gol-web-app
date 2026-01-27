'use client';

import { useFontSize } from '@/contexts/font-size-context';
import { Button } from '@/components/ui/button';

export default function FontSizeControl() {
  const { fontSize, setFontSize } = useFontSize();

  return (
    <div className="flex items-center gap-1 bg-zinc-800 rounded p-1">
      <Button
        onClick={() => setFontSize('small')}
        variant="ghost"
        size="sm"
        className={`h-7 px-2 text-sm sm:text-base ${
          fontSize === 'small'
            ? 'bg-zinc-700 text-cyan-400'
            : 'text-zinc-400 hover:text-zinc-300'
        }`}
        aria-label="小さいフォントサイズ"
        title="小"
      >
        小
      </Button>
      <Button
        onClick={() => setFontSize('medium')}
        variant="ghost"
        size="sm"
        className={`h-7 px-2 text-sm sm:text-base ${
          fontSize === 'medium'
            ? 'bg-zinc-700 text-cyan-400'
            : 'text-zinc-400 hover:text-zinc-300'
        }`}
        aria-label="中くらいのフォントサイズ"
        title="中"
      >
        中
      </Button>
      <Button
        onClick={() => setFontSize('large')}
        variant="ghost"
        size="sm"
        className={`h-7 px-2 text-sm sm:text-base ${
          fontSize === 'large'
            ? 'bg-zinc-700 text-cyan-400'
            : 'text-zinc-400 hover:text-zinc-300'
        }`}
        aria-label="大きいフォントサイズ"
        title="大"
      >
        大
      </Button>
    </div>
  );
}
