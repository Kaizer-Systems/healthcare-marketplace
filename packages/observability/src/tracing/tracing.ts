export type SpanContext = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
};

export function createSpan(name: string, parentContext?: SpanContext): SpanContext {
  void name;
  if (parentContext) {
    return {
      traceId: parentContext.traceId,
      spanId: crypto.randomUUID(),
      parentSpanId: parentContext.spanId,
    };
  }
  return {
    traceId: crypto.randomUUID(),
    spanId: crypto.randomUUID(),
  };
}
