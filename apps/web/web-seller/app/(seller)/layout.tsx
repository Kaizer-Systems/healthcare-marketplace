export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r p-4">Seller Navigation</aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
