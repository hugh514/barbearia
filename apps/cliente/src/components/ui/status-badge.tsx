import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badge = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-secondary text-muted-foreground',
        brand: 'bg-accent text-accent-foreground',
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-warning',
        danger: 'bg-destructive-soft text-destructive',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badge>['tone']>;

export function StatusBadge({
  children,
  tone,
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return <span className={cn(badge({ tone }), className)}>{children}</span>;
}
