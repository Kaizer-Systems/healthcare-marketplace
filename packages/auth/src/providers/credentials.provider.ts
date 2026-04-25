export interface CredentialsInput {
  email: string;
  password: string;
}

export interface CredentialsUser {
  id: string;
  email: string;
  role: string;
}

export async function authorizeCredentials(
  _input: CredentialsInput,
): Promise<CredentialsUser | null> {
  throw new Error('NOT_IMPLEMENTED: credentials.provider.authorizeCredentials');
}
