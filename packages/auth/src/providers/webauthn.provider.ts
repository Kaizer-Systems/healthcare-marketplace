export interface WebAuthnAssertion {
  credentialId: string;
  signature: string;
  clientDataJSON: string;
  authenticatorData: string;
}

export interface WebAuthnUser {
  id: string;
  email: string;
  role: string;
}

export async function authorizeWebAuthn(
  _assertion: WebAuthnAssertion,
): Promise<WebAuthnUser | null> {
  throw new Error('NOT_IMPLEMENTED: webauthn.provider.authorizeWebAuthn');
}
