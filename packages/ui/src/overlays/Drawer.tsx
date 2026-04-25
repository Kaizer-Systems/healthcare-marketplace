import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils.js';

export function Drawer({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-lg',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
