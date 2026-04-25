import { Card } from '../primitives/Card.js';

export function ConsentCenter({ title }: { title?: string }) {
  return (
    <Card>
      <div className="font-medium text-[var(--color-foreground)]">{title ?? 'Consent center'}</div>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">Manage your privacy preferences.</p>
    </Card>
  );
}
