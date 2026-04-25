export interface AuditEntry {
  action: string;
  userId: string;
  resource: string;
  resourceId: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export async function logAuditEntry(entry: AuditEntry): Promise<void> {
  void entry;
}
