export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div>
      <h1>Brand: {slug}</h1>
      <p>Placeholder</p>
    </div>
  );
}
