export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function validateFileUpload(
  file: { size: number; type: string },
  maxSize = 10 * 1024 * 1024,
  allowedTypes?: string[],
): boolean {
  if (file.size > maxSize) {
    return false;
  }
  if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return false;
  }
  return true;
}
