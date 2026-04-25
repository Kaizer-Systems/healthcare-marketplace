export async function GET() {
  return new Response(JSON.stringify({ message: 'Auth handler placeholder' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST() {
  return new Response(JSON.stringify({ message: 'Auth handler placeholder' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
}
