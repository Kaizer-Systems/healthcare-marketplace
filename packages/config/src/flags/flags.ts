import { getConfig } from '../env/env.js';

export function isFeatureEnabled(flag: string): boolean {
  const cfg = getConfig();
  const apps = cfg.ENABLED_APPS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const modules = cfg.ENABLED_MODULES.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return apps.includes(flag) || modules.includes(flag);
}

export function getComplianceFlags(): {
  mfaMode: 'disabled' | 'optional' | 'required';
  enableRateLimiting: boolean;
  enableAuditLogging: boolean;
  enableConsentManagement: boolean;
  enableCookieConsentBanner: boolean;
  enableDsrWorkflows: boolean;
  enableGdprMode: boolean;
  enableDpdpMode: boolean;
  enableDataRetentionJobs: boolean;
  enableBreachNotificationWorkflow: boolean;
  dataResidencyRegion: string;
  childrenDataProtectionMode: boolean;
} {
  const c = getConfig();
  return {
    mfaMode: c.MFA_MODE,
    enableRateLimiting: c.ENABLE_RATE_LIMITING,
    enableAuditLogging: c.ENABLE_AUDIT_LOGGING,
    enableConsentManagement: c.ENABLE_CONSENT_MANAGEMENT,
    enableCookieConsentBanner: c.ENABLE_COOKIE_CONSENT_BANNER,
    enableDsrWorkflows: c.ENABLE_DSR_WORKFLOWS,
    enableGdprMode: c.ENABLE_GDPR_MODE,
    enableDpdpMode: c.ENABLE_DPDP_MODE,
    enableDataRetentionJobs: c.ENABLE_DATA_RETENTION_JOBS,
    enableBreachNotificationWorkflow: c.ENABLE_BREACH_NOTIFICATION_WORKFLOW,
    dataResidencyRegion: c.DATA_RESIDENCY_REGION,
    childrenDataProtectionMode: c.CHILDREN_DATA_PROTECTION_MODE,
  };
}
