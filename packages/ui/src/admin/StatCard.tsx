import { Card } from '../primitives/Card.js';

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div className="text-sm text-[var(--color-muted-foreground)]">{label}</div>
      <div className="text-2xl font-semibold text-[var(--color-foreground)]">{value}</div>
    </Card>
  );
}
