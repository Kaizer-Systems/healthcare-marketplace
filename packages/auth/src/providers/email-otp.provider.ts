export interface EmailOtpInput {
  email: string;
  otp: string;
}

export interface EmailOtpUser {
  id: string;
  email: string;
  role: string;
}

export async function authorizeEmailOtp(
  _input: EmailOtpInput,
): Promise<EmailOtpUser | null> {
  throw new Error('NOT_IMPLEMENTED: email-otp.provider.authorizeEmailOtp');
}
