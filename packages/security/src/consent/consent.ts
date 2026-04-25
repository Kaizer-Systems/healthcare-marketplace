export interface ConsentRecord {
  userId: string;
  purpose: string;
  granted: boolean;
  timestamp: Date;
  version: string;
}

export async function captureConsent(record: ConsentRecord): Promise<void> {
  void record;
}

export async function withdrawConsent(userId: string, purpose: string): Promise<void> {
  void userId;
  void purpose;
}

export async function getConsentHistory(userId: string): Promise<ConsentRecord[]> {
  void userId;
  return [];
}
