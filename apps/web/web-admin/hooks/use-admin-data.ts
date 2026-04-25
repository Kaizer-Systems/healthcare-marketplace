'use client';

import { useMemo } from 'react';
import { adminDashboardStats } from '@/lib/mocks/admin-data';

export function useAdminData() {
  return useMemo(
    () => ({
      data: adminDashboardStats,
      isLoading: false,
    }),
    [],
  );
}
