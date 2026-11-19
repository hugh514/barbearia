import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /** Uma por tela: a ação principal. */
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        /** Contornada: ações secundárias. */
        secondary:
          'border border-input bg-card text-foreground hover:bg-secondary',
        ghost: 'text-foreground hover:bg-secondary',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive-hover',
        link: 'text-primary-text underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4 text-base',
        sm: 'h-11 px-3',
        /** No cliente todo botão tem pelo menos 44px de altura. */
        lg: 'h-12 px-5 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
