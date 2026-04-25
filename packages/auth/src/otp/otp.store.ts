export interface OtpStore {
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  incrementAttempts(key: string, ttlSeconds: number): Promise<number>;
}

export function otpKey(userId: string, factor: string): string {
  return `otp:${userId}:${factor}`;
}

export function otpAttemptsKey(userId: string, factor: string): string {
  return `otp:attempts:${userId}:${factor}`;
}

export const OTP_TTL_SECONDS = 600;
export const OTP_MAX_ATTEMPTS = 5;
