import { Card } from '../primitives/Card.js';

export function ModerationCard({ title, status }: { title: string; status: string }) {
  return (
    <Card>
      <div className="font-medium text-[var(--color-foreground)]">{title}</div>
      <div className="text-sm text-[var(--color-muted-foreground)]">{status}</div>
    </Card>
  );
}
