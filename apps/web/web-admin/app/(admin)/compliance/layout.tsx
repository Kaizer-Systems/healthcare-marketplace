import Link from 'next/link';

export default function ComplianceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="mb-4 flex flex-wrap gap-4 border-b pb-2">
        <Link href="/compliance/consent">Consent</Link>
        <Link href="/compliance/dsr">DSR</Link>
        <Link href="/compliance/ropa">ROPA</Link>
        <Link href="/compliance/breach">Breach</Link>
      </nav>
      {children}
    </div>
  );
}
