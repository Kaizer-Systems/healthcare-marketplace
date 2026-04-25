import type { StorageAdapter } from '../types.js';

export class LocalFsAdapter implements StorageAdapter {
  upload(): Promise<string> {
    throw new Error('LocalFsAdapter: not yet implemented');
  }

  download(): Promise<Buffer> {
    throw new Error('LocalFsAdapter: not yet implemented');
  }

  delete(): Promise<void> {
    throw new Error('LocalFsAdapter: not yet implemented');
  }

  getSignedUrl(): Promise<string> {
    throw new Error('LocalFsAdapter: not yet implemented');
  }

  getPublicUrl(): string {
    throw new Error('LocalFsAdapter: not yet implemented');
  }
}
