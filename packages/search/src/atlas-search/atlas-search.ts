export interface AtlasSearchIndex {
  name: string;
  collection: string;
  mappings: Record<string, unknown>;
}

export function getSearchIndexDefinitions(): AtlasSearchIndex[] {
  return [];
}
