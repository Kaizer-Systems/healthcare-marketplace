import { getConfig } from '../env/env.js';

export type RuntimeMode =
  | 'dev-lite'
  | 'dev-module'
  | 'dev-integrated'
  | 'local-prod'
  | 'production';

export function getCurrentMode(): RuntimeMode {
  return getConfig().APP_RUNTIME_MODE;
}

export function isDevMode(): boolean {
  const m = getCurrentMode();
  return m === 'dev-lite' || m === 'dev-module' || m === 'dev-integrated';
}

export function isProductionMode(): boolean {
  const m = getCurrentMode();
  return m === 'production' || m === 'local-prod';
}

export function isLiteMode(): boolean {
  return getCurrentMode() === 'dev-lite';
}

export function requiresRealApi(): boolean {
  return getConfig().USE_REAL_API;
}
