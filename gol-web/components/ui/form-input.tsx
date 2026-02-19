'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// FormInput: 標準サイズのInput（bg-zinc-800）
interface FormInputProps extends React.ComponentProps<typeof Input> {
  label?: string;
  required?: boolean;
  error?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, required, error, className, id, ...props }, ref) => {
    const fallbackId = React.useId().replace(/:/g, '');
    const inputId = id || `input-${fallbackId}`;

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={inputId} className="text-zinc-300">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </Label>
        )}
        <Input
          ref={ref}
          id={inputId}
          className={cn(
            'bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-cyan-500',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);
FormInput.displayName = 'FormInput';

// FormInputSmall: 小さなInput（bg-zinc-900、text-sm）
interface FormInputSmallProps extends React.ComponentProps<typeof Input> {
  label?: string;
  required?: boolean;
  error?: string;
  labelClassName?: string;
}

export const FormInputSmall = React.forwardRef<HTMLInputElement, FormInputSmallProps>(
  ({ label, required, error, className, id, labelClassName, ...props }, ref) => {
    const fallbackId = React.useId().replace(/:/g, '');
    const inputId = id || `input-small-${fallbackId}`;

    return (
      <div className="space-y-1">
        {label && (
          <Label htmlFor={inputId} className={cn('text-xs text-zinc-400', labelClassName)}>
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </Label>
        )}
        <Input
          ref={ref}
          id={inputId}
          className={cn(
            'bg-zinc-900 border-zinc-700 text-zinc-100 text-sm focus:ring-cyan-500',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
FormInputSmall.displayName = 'FormInputSmall';

// FormTextarea: Textarea
interface FormTextareaProps extends React.ComponentProps<typeof Textarea> {
  label?: string;
  required?: boolean;
  error?: string;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, required, error, className, id, ...props }, ref) => {
    const fallbackId = React.useId().replace(/:/g, '');
    const textareaId = id || `textarea-${fallbackId}`;

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={textareaId} className="text-zinc-300">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </Label>
        )}
        <Textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'bg-zinc-800 border-zinc-600 text-zinc-100 focus:border-cyan-500 resize-none',
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);
FormTextarea.displayName = 'FormTextarea';

// FormLabel: 共通スタイルのLabel
interface FormLabelProps extends React.ComponentProps<typeof Label> {
  required?: boolean;
}

export const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  FormLabelProps
>(({ required, children, className, ...props }, ref) => {
  return (
    <Label
      ref={ref}
      className={cn('text-zinc-300', className)}
      {...props}
    >
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </Label>
  );
});
FormLabel.displayName = 'FormLabel';
