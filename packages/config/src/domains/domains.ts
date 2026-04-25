import { getConfig } from '../env/env.js';

export interface DomainConfig {
  publicDomainRoot: string;
  envSubdomainPrefix: string;
  hosts: {
    marketplace: string;
    seller: string;
    admin: string;
    api: string;
    media: string;
  };
  sslCertMode: 'shared' | 'dedicated';
}

export function getDomainConfig(): DomainConfig {
  const c = getConfig();
  return {
    publicDomainRoot: c.PUBLIC_DOMAIN_ROOT,
    envSubdomainPrefix: c.ENV_SUBDOMAIN_PREFIX,
    hosts: {
      marketplace: c.MARKETPLACE_HOST,
      seller: c.SELLER_HOST,
      admin: c.ADMIN_HOST,
      api: c.API_HOST,
      media: c.MEDIA_HOST,
    },
    sslCertMode: c.SSL_CERT_MODE,
  };
}

export function buildHost(app: 'marketplace' | 'seller' | 'admin' | 'api' | 'media'): string {
  return getDomainConfig().hosts[app];
}

export function buildUrl(
  app: 'marketplace' | 'seller' | 'admin' | 'api' | 'media',
  scheme: 'http' | 'https' = 'https',
  pathname = '/',
): string {
  const host = buildHost(app);
  return `${scheme}://${host}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}
