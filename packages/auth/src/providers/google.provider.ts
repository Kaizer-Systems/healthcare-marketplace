export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface GoogleUser {
  id: string;
  email: string;
  role: string;
}

export async function authorizeGoogle(_profile: GoogleProfile): Promise<GoogleUser | null> {
  throw new Error('NOT_IMPLEMENTED: google.provider.authorizeGoogle');
}
