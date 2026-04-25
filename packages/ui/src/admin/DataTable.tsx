export function DataTable({ columns, data }: { columns: string[]; data: unknown[] }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--color-border)]">
      <table className="w-full min-w-[20rem] text-left text-sm">
        <thead className="bg-[var(--color-muted)]">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 font-medium text-[var(--color-foreground)]">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t border-[var(--color-border)]">
              <td className="px-3 py-2 text-[var(--color-muted-foreground)]" colSpan={columns.length}>
                {String(row)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
