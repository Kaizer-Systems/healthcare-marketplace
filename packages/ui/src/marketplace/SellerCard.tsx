import { Card } from '../primitives/Card.js';

export function SellerCard({ name, rating }: { name: string; rating: string }) {
  return (
    <Card>
      <div className="font-medium text-[var(--color-foreground)]">{name}</div>
      <div className="text-sm text-[var(--color-muted-foreground)]">{rating}</div>
    </Card>
  );
}
