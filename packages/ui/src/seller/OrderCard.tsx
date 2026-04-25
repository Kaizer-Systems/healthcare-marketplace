import { Card } from '../primitives/Card.js';

export function OrderCard({ orderId, total }: { orderId: string; total: string }) {
  return (
    <Card>
      <div className="font-medium text-[var(--color-foreground)]">{orderId}</div>
      <div className="text-sm text-[var(--color-muted-foreground)]">{total}</div>
    </Card>
  );
}
