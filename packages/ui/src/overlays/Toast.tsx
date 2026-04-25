import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils.js';

export function Toast({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3 text-sm text-[var(--color-foreground)] shadow-md',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
