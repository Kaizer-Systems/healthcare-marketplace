import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils.js';

export function Modal({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div role="dialog" className={cn('rounded-[var(--radius)] border border-[var(--color-border)] p-4', className)} {...props}>
      {children}
    </div>
  );
}
