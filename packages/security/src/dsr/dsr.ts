export interface DsrRequest {
  id: string;
  type: 'access' | 'erasure' | 'rectification' | 'portability';
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  createdAt: Date;
}

export async function submitDsrRequest(
  request: Omit<DsrRequest, 'id' | 'status'>,
): Promise<DsrRequest> {
  return {
    id: crypto.randomUUID(),
    type: request.type,
    userId: request.userId,
    createdAt: request.createdAt,
    status: 'pending',
  };
}

export async function processDsrRequest(id: string): Promise<DsrRequest> {
  return {
    id,
    type: 'access',
    userId: '',
    status: 'processing',
    createdAt: new Date(),
  };
}
