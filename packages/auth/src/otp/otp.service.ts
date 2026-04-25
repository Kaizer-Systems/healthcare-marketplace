export interface OtpService {
  generate(userId: string, factor: string): Promise<string>;
  hash(otp: string): Promise<string>;
  verify(userId: string, factor: string, otp: string): Promise<boolean>;
  expire(userId: string, factor: string): Promise<void>;
}

export async function generate(_userId: string, _factor: string): Promise<string> {
  throw new Error('NOT_IMPLEMENTED: otp.service.generate');
}

export async function hash(_otp: string): Promise<string> {
  throw new Error('NOT_IMPLEMENTED: otp.service.hash');
}

export async function verify(
  _userId: string,
  _factor: string,
  _otp: string,
): Promise<boolean> {
  throw new Error('NOT_IMPLEMENTED: otp.service.verify');
}

export async function expire(_userId: string, _factor: string): Promise<void> {
  throw new Error('NOT_IMPLEMENTED: otp.service.expire');
}
