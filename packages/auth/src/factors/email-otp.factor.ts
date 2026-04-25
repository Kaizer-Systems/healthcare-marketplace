export interface EmailOtpChallenge {
  userId: string;
  email: string;
}

export interface EmailOtpVerification {
  userId: string;
  otp: string;
}

export async function sendEmailOtp(_challenge: EmailOtpChallenge): Promise<void> {
  throw new Error('NOT_IMPLEMENTED: email-otp.factor.sendEmailOtp');
}

export async function verifyEmailOtp(_verification: EmailOtpVerification): Promise<boolean> {
  throw new Error('NOT_IMPLEMENTED: email-otp.factor.verifyEmailOtp');
}
