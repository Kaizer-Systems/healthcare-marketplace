import type { StorageAdapter } from '../types.js';

export class R2Adapter implements StorageAdapter {
  upload(): Promise<string> {
    throw new Error('R2Adapter: not yet implemented');
  }

  download(): Promise<Buffer> {
    throw new Error('R2Adapter: not yet implemented');
  }

  delete(): Promise<void> {
    throw new Error('R2Adapter: not yet implemented');
  }

  getSignedUrl(): Promise<string> {
    throw new Error('R2Adapter: not yet implemented');
  }

  getPublicUrl(): string {
    throw new Error('R2Adapter: not yet implemented');
  }
}
