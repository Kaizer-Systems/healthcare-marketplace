'use client';

import { useState } from 'react';

export function useCart() {
  const [items, setItems] = useState<unknown[]>([]);
  return {
    items,
    addItem: (_item: unknown) => setItems((prev) => [...prev, _item]),
    clearCart: () => setItems([]),
  };
}
