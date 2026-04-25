import { LocalFsAdapter } from './local-fs/local-fs.adapter.js';
import { R2Adapter } from './r2/r2.adapter.js';
import { S3Adapter } from './s3/s3.adapter.js';
import type { StorageAdapter, StorageProvider } from './types.js';

export type { StorageAdapter, StorageProvider } from './types.js';

export function createStorageAdapter(provider: StorageProvider): StorageAdapter {
  switch (provider) {
    case 'local-fs':
      return new LocalFsAdapter();
    case 's3':
      return new S3Adapter();
    case 'r2':
      return new R2Adapter();
  }
}

export { LocalFsAdapter } from './local-fs/local-fs.adapter.js';
export { S3Adapter } from './s3/s3.adapter.js';
export { R2Adapter } from './r2/r2.adapter.js';
export { generatePresignedUploadUrl } from './signing/signing.js';
export { buildCdnUrl, buildMediaUrl } from './urls/urls.js';
