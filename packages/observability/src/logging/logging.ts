export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function createLogger(context: string) {
  const prefix = `[${context}]`;
  return {
    debug: (...args: unknown[]) => {
      console.log(prefix, ...args);
    },
    info: (...args: unknown[]) => {
      console.log(prefix, ...args);
    },
    warn: (...args: unknown[]) => {
      console.warn(prefix, ...args);
    },
    error: (...args: unknown[]) => {
      console.error(prefix, ...args);
    },
  };
}
