import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface FootfallParams {
  siteId?: string;
  fromUtc?: number;
  toUtc?: number;
}

export interface FootfallResponse {
  siteId: string;
  fromUtc: number;
  toUtc: number;
  footfall: number;
}

export function useFootfall(params: FootfallParams, enabled: boolean = true) {
  return useQuery<FootfallResponse>({
    queryKey: ['footfall', params.siteId, params.fromUtc, params.toUtc],
    queryFn: async () => {
      const response = await api.post<FootfallResponse>('/api/analytics/footfall', {
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
