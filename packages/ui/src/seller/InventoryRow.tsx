export function InventoryRow({
  sku,
  name,
  quantity,
}: {
  sku: string;
  name: string;
  quantity: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] py-2 text-sm">
      <div>
        <div className="font-medium text-[var(--color-foreground)]">{name}</div>
        <div className="text-[var(--color-muted-foreground)]">{sku}</div>
      </div>
      <div className="tabular-nums text-[var(--color-foreground)]">{quantity}</div>
    </div>
  );
}
