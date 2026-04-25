export interface MagicLinkRequest {
  userId: string;
  email: string;
  callbackUrl: string;
}

export interface MagicLinkVerification {
  token: string;
}

export async function sendMagicLink(_request: MagicLinkRequest): Promise<void> {
  throw new Error('NOT_IMPLEMENTED: magic-link.factor.sendMagicLink');
}

export async function verifyMagicLink(
  _verification: MagicLinkVerification,
): Promise<{ userId: string } | null> {
  throw new Error('NOT_IMPLEMENTED: magic-link.factor.verifyMagicLink');
}
