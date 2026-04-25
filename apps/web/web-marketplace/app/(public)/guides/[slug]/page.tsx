export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div>
      <h1>Guide: {slug}</h1>
      <p>Placeholder</p>
    </div>
  );
}
