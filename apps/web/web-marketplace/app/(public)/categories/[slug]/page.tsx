export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div>
      <h1>Category: {slug}</h1>
      <p>Placeholder</p>
    </div>
  );
}
