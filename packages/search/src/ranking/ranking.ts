export interface RankingConfig {
  boostFields?: string[];
  sponsoredIds?: string[];
}

export function applyRanking(results: unknown[], _config: RankingConfig): unknown[] {
  return results;
}
