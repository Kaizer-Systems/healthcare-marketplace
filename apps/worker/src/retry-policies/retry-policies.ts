export interface RetryPolicy {
  maxAttempts: number;
  backoffType: 'fixed' | 'exponential';
  initialDelay: number;
}

export const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 3,
  backoffType: 'exponential',
  initialDelay: 1000,
};

export const criticalRetryPolicy: RetryPolicy = {
  maxAttempts: 5,
  backoffType: 'exponential',
  initialDelay: 2000,
};
