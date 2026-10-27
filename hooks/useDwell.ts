import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DwellParams {
  siteId?: string;
  fromUtc?: number;
  toUtc?: number;
}

export interface DwellResponse {
  siteId: string;
  fromUtc: number;
  toUtc: number;
  avgDwellMinutes: number;
  dwellRecords: number;
}

export function useDwell(params: DwellParams, enabled: boolean = true) {
  return useQuery<DwellResponse>({
    queryKey: ['dwell', params.siteId, params.fromUtc, params.toUtc],
    queryFn: async () => {
      const response = await api.post<DwellResponse>('/api/analytics/dwell', {
        siteId: params.siteId,
        fromUtc: params.fromUtc,
        toUtc: params.toUtc,
      });
      return response.data;
    },
    enabled: enabled && Boolean(params.siteId && params.fromUtc && params.toUtc),
    // Keep showing the last result while the time window refreshes, but never across sites
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[1] === params.siteId ? prev : undefined),
  });
}
