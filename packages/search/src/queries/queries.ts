export interface SearchQuery {
  text: string;
  filters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export function buildSearchPipeline(query: SearchQuery): object[] {
  return [
    {
      $search: {
        index: 'default',
        text: {
          query: query.text,
          path: 'default',
        },
      },
    },
  ];
}
