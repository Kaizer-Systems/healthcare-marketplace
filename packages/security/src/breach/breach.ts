export interface BreachIncident {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  reportedAt?: Date;
  status: 'detected' | 'investigating' | 'contained' | 'resolved';
}

export async function reportBreach(incident: Omit<BreachIncident, 'id' | 'status'>): Promise<BreachIncident> {
  return {
    id: crypto.randomUUID(),
    ...incident,
    status: 'detected',
  };
}

export async function escalateBreach(id: string): Promise<void> {
  void id;
}
