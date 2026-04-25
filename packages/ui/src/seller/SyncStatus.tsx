export function SyncStatus({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: ok ? 'var(--color-accent)' : 'var(--color-destructive)' }}
        aria-hidden
      />
      <span className="text-[var(--color-foreground)]">{label}</span>
    </div>
  );
}
