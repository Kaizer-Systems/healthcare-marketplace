export function buildAutocompletePipeline(prefix: string, field: string): object[] {
  return [{ $search: { autocomplete: { query: prefix, path: field } } }];
}

export function buildSuggestionPipeline(text: string): object[] {
  return [{ $search: { text: { query: text, path: 'default' } } }];
}
