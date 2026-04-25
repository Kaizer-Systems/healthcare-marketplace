import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils.js';

export function FormSection({
  title,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { title: string; children?: ReactNode }) {
  return (
    <section className={cn('flex flex-col gap-4', className)} {...props}>
      <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
