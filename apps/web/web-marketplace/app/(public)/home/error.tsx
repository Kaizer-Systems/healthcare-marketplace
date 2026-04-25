'use client';

export default function Error({ error }: { error: Error }) {
  return <div>Something went wrong: {error.message}</div>;
}
