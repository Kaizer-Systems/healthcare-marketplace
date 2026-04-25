'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('error') ?? 'An error occurred';
  return (
    <div>
      <h1>Authentication Error</h1>
      <p>{message}</p>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <AuthErrorContent />
    </Suspense>
  );
}
