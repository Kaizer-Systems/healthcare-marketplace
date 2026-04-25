import { Card } from '../primitives/Card.js';

export function CategoryCard({ title, count }: { title: string; count: string }) {
  return (
    <Card>
      <div className="font-medium text-[var(--color-foreground)]">{title}</div>
      <div className="text-sm text-[var(--color-muted-foreground)]">{count}</div>
    </Card>
  );
}
