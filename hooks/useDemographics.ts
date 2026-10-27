import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DemographicsParams {
  siteId?: string;
  fromUtc?: number;
  toUtc?: number;
}

export interface DemographicsBucket {
  utc: number;
  local: string;
  male: number;
  female: number;
}

export interface DemographicsResponse {
  siteId: string;
  fromUtc: number;
  toUtc: number;
  timezone: string;
  buckets: DemographicsBucket[];
}

export function useDemographics(params: DemographicsParams, enabled: boolean = true) {
  return useQuery<DemographicsResponse>({
    queryKey: ['demographics', params.siteId, params.fromUtc, params.toUtc],
    queryFn: async () => {
      const response = await api.post<DemographicsResponse>('/api/analytics/demographics', {
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
