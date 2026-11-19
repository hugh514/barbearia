import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

/** Classes do campo, reaproveitadas em select e textarea. */
export const fieldClass = cn(
  'flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground transition-colors',
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:outline-destructive',
);

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(fieldClass, className)}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
