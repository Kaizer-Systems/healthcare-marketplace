export interface PrivacyNotice {
  version: string;
  effectiveDate: Date;
  content: string;
  locale: string;
}

export async function getCurrentNotice(locale?: string): Promise<PrivacyNotice | null> {
  void locale;
  return null;
}
