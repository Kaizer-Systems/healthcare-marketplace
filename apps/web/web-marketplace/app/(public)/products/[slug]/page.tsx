export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div>
      <h1>Product: {slug}</h1>
      <p>Placeholder</p>
    </div>
  );
}
