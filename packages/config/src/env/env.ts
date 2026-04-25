import { z } from 'zod';

const boolFromEnv = z
  .string()
  .optional()
  .default('false')
  .transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
  APP_RUNTIME_MODE: z
    .enum(['dev-lite', 'dev-module', 'dev-integrated', 'local-prod', 'production'])
    .default('dev-lite'),
  AUTH_MODE: z.enum(['mock', 'real']).default('mock'),
  SEARCH_MODE: z.enum(['mock', 'atlas']).default('mock'),
  STORAGE_MODE: z.enum(['local-fs', 'provider']).default('local-fs'),
  CACHE_MODE: z.enum(['memory', 'redis']).default('memory'),
  QUEUE_MODE: z.enum(['inline', 'redis']).default('inline'),
  USE_REAL_API: boolFromEnv,
  USE_REAL_DB: boolFromEnv,
  USE_REAL_AUTH: boolFromEnv,
  USE_REAL_SEARCH: boolFromEnv,
  ENABLED_APPS: z.string().default(''),
  ENABLED_MODULES: z.string().default(''),
  MFA_MODE: z.enum(['disabled', 'optional', 'required']).default('disabled'),
  ENABLE_RATE_LIMITING: boolFromEnv,
  ENABLE_AUDIT_LOGGING: boolFromEnv,
  ENABLE_CONSENT_MANAGEMENT: boolFromEnv,
  ENABLE_COOKIE_CONSENT_BANNER: boolFromEnv,
  ENABLE_DSR_WORKFLOWS: boolFromEnv,
  ENABLE_GDPR_MODE: boolFromEnv,
  ENABLE_DPDP_MODE: boolFromEnv,
  ENABLE_DATA_RETENTION_JOBS: boolFromEnv,
  ENABLE_BREACH_NOTIFICATION_WORKFLOW: boolFromEnv,
  DATA_RESIDENCY_REGION: z.string().default(''),
  CHILDREN_DATA_PROTECTION_MODE: boolFromEnv,
  PUBLIC_DOMAIN_ROOT: z.string().default('local'),
  ENV_SUBDOMAIN_PREFIX: z.string().default(''),
  MARKETPLACE_HOST: z.string().default('marketplace.local'),
  SELLER_HOST: z.string().default('seller.local'),
  ADMIN_HOST: z.string().default('admin.local'),
  API_HOST: z.string().default('api.local'),
  MEDIA_HOST: z.string().default('media.local'),
  SSL_CERT_MODE: z.enum(['shared', 'dedicated']).default('shared'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cached: EnvConfig | null = null;

export function parseEnv(
  env: NodeJS.ProcessEnv = process.env,
): EnvConfig {
  return envSchema.parse(env);
}

export function getConfig(): EnvConfig {
  if (!cached) {
    cached = parseEnv();
  }
  return cached;
}
