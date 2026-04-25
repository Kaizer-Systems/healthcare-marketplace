export interface PhoneOtpInput {
  phone: string;
  otp: string;
}

export interface PhoneOtpUser {
  id: string;
  phone: string;
  role: string;
}

export async function authorizePhoneOtp(
  _input: PhoneOtpInput,
): Promise<PhoneOtpUser | null> {
  throw new Error('NOT_IMPLEMENTED: phone-otp.provider.authorizePhoneOtp');
}
