import { Card } from '../primitives/Card.js';

export function ProductCard({ title, price }: { title: string; price: string }) {
  return (
    <Card>
      <div className="font-medium text-[var(--color-foreground)]">{title}</div>
      <div className="text-sm text-[var(--color-muted-foreground)]">{price}</div>
    </Card>
  );
}
