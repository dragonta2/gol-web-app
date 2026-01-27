'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// FormCard: フォーム用のカード（bg-zinc-900, border-zinc-700）
interface FormCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'nested'; // nested = bg-zinc-800（ネストされたカード）
}

export const FormCard = React.forwardRef<HTMLDivElement, FormCardProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          variant === 'default'
            ? 'bg-zinc-900 border-zinc-700'
            : 'bg-zinc-800 border-zinc-700',
          className
        )}
        {...props}
      >
        {children}
      </Card>
    );
  }
);
FormCard.displayName = 'FormCard';

// FormCardHeader: カードヘッダー
interface FormCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export const FormCardHeader = React.forwardRef<HTMLDivElement, FormCardHeaderProps>(
  ({ title, description, className, children, ...props }, ref) => {
    return (
      <CardHeader ref={ref} className={cn('pb-4', className)} {...props}>
        {title && (
          <CardTitle className="text-cyan-400">{title}</CardTitle>
        )}
        {description && (
          <CardDescription className="text-zinc-400">{description}</CardDescription>
        )}
        {children}
      </CardHeader>
    );
  }
);
FormCardHeader.displayName = 'FormCardHeader';

// FormCardContent: カードコンテンツ
export const FormCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <CardContent
      ref={ref}
      className={cn('text-zinc-100', className)}
      {...props}
    />
  );
});
FormCardContent.displayName = 'FormCardContent';
