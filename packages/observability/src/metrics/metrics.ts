export type MetricType = 'counter' | 'gauge' | 'histogram';

export function recordMetric(name: string, value: number, type: MetricType): void {
  console.log(`[metric] ${type} ${name}=${value}`);
}
