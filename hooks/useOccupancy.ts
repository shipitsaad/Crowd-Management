import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface OccupancyParams {
  siteId?: string;
  fromUtc?: number;
  toUtc?: number;
}

export interface OccupancyBucket {
  utc: number;
  local: string;
  avg: number;
}

export interface OccupancyResponse {
  siteId: string;
  fromUtc: number;
  toUtc: number;
  timezone: string;
  buckets: OccupancyBucket[];
}

export function useOccupancy(params: OccupancyParams, enabled: boolean = true) {
  return useQuery<OccupancyResponse>({
    queryKey: ['occupancy', params.siteId, params.fromUtc, params.toUtc],
    queryFn: async () => {
      const response = await api.post<OccupancyResponse>('/api/analytics/occupancy', {
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
