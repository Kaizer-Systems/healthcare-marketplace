export interface RetentionPolicy {
  collection: string;
  retentionDays: number;
  purgeStrategy: 'delete' | 'anonymize';
}

export function getRetentionPolicies(): RetentionPolicy[] {
  return [];
}

export async function enforcePurge(policy: RetentionPolicy): Promise<void> {
  void policy;
}
