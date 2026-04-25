export interface PhoneOtpChallenge {
  userId: string;
  phone: string;
}

export interface PhoneOtpVerification {
  userId: string;
  otp: string;
}

export async function sendPhoneOtp(_challenge: PhoneOtpChallenge): Promise<void> {
  throw new Error('NOT_IMPLEMENTED: phone-otp.factor.sendPhoneOtp');
}

export async function verifyPhoneOtp(_verification: PhoneOtpVerification): Promise<boolean> {
  throw new Error('NOT_IMPLEMENTED: phone-otp.factor.verifyPhoneOtp');
}
