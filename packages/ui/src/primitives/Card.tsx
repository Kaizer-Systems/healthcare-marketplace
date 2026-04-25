import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils.js';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-[var(--color-foreground)] shadow-sm',
        className,
      )}
      {...props}
    />
  );
}
