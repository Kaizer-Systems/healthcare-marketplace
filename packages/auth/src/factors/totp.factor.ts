export interface TotpEnrollment {
  userId: string;
  secret: string;
  otpauthUrl: string;
}

export interface TotpVerification {
  userId: string;
  code: string;
}

export async function enrollTotp(_userId: string): Promise<TotpEnrollment> {
  throw new Error('NOT_IMPLEMENTED: totp.factor.enrollTotp');
}

export async function verifyTotp(_verification: TotpVerification): Promise<boolean> {
  throw new Error('NOT_IMPLEMENTED: totp.factor.verifyTotp');
}
