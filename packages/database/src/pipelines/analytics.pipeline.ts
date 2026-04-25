export function buildOrderAnalyticsPipeline(_filters: {
  startDate?: Date;
  endDate?: Date;
}): object[] {
  return [{ $match: {} }];
}
