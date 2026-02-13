'use client';

import { Dumbbell, Brain, Sparkles } from 'lucide-react';

/** 身体・頭脳・精神をヘッダーと同じアイコンで表示（スペース節約・切れ防止） */
export function ExpWithIcons({
  body,
  mind,
  spirit,
  signed = false,
  minus = false,
}: {
  body: number;
  mind: number;
  spirit: number;
  signed?: boolean;
  minus?: boolean;
}) {
  const items: { icon: React.ReactNode; val: number; label: string; colorClass: string }[] = [];
  if (body !== 0)
    items.push({
      icon: <Dumbbell className="w-3.5 h-3.5 inline-block shrink-0" aria-hidden />,
      val: body,
      label: '身体',
      colorClass: 'text-exp-body',
    });
  if (mind !== 0)
    items.push({
      icon: <Brain className="w-3.5 h-3.5 inline-block shrink-0" aria-hidden />,
      val: mind,
      label: '頭脳',
      colorClass: 'text-exp-intelligence',
    });
  if (spirit !== 0)
    items.push({
      icon: <Sparkles className="w-3.5 h-3.5 inline-block shrink-0" aria-hidden />,
      val: spirit,
      label: '精神',
      colorClass: 'text-exp-mind',
    });
  if (items.length === 0) return null;
  const signStr = (val: number) =>
    minus ? '- ' : signed && val < 0 ? '- ' : '+ ';
  return (
    <span
      className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 shrink-0"
      role="list"
      aria-label="EXP内訳"
    >
      {items.map(({ icon, val, label, colorClass }) => (
        <span
          key={label}
          className={`inline-flex items-center gap-0.5 shrink-0 ${colorClass}`}
          role="listitem"
        >
          {icon}
          <span>
            {signStr(val)}
            {Math.abs(val)}
          </span>
        </span>
      ))}
    </span>
  );
}
