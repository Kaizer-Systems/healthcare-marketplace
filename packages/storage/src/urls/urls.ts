export function buildCdnUrl(key: string, cdnBase?: string): string {
  const base = cdnBase ?? 'https://cdn.example.com';
  return `${base.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
}

export function buildMediaUrl(key: string): string {
  return `https://media.example.com/${key.replace(/^\//, '')}`;
}
