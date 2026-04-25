export default async function SellerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div>
      <h1>Seller: {slug}</h1>
      <p>Placeholder</p>
    </div>
  );
}
