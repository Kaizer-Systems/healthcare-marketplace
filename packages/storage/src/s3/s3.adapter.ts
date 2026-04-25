import type { StorageAdapter } from '../types.js';

export class S3Adapter implements StorageAdapter {
  upload(): Promise<string> {
    throw new Error('S3Adapter: not yet implemented');
  }

  download(): Promise<Buffer> {
    throw new Error('S3Adapter: not yet implemented');
  }

  delete(): Promise<void> {
    throw new Error('S3Adapter: not yet implemented');
  }

  getSignedUrl(): Promise<string> {
    throw new Error('S3Adapter: not yet implemented');
  }

  getPublicUrl(): string {
    throw new Error('S3Adapter: not yet implemented');
  }
}
