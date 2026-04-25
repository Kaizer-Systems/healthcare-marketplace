import type { InputHTMLAttributes } from 'react';
import { Input } from '../primitives/Input.js';

export function FormField({
  label,
  id,
  ...inputProps
}: {
  label: string;
  id: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-foreground)]">
        {label}
      </label>
      <Input id={id} {...inputProps} />
    </div>
  );
}
