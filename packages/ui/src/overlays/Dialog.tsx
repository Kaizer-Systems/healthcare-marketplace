import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils.js';

export function Dialog({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div
      role="dialog"
      className={cn(
        'rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-lg',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
