'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  maxWidth = '2xl',
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'bg-zinc-900 border-zinc-700 max-h-[90vh] overflow-y-auto',
          'w-[95vw] sm:w-full', // モバイルでは幅を95vwに
          maxWidthClasses[maxWidth],
          className
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-cyan-400">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-zinc-400!">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">{children}</div>

        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
