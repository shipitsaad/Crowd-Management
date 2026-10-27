import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SiteZone {
  zoneId: string;
  name: string;
  securityLevel: 'high' | 'medium' | 'low';
}

export interface Site {
  siteId: string;
  name: string;
  city?: string;
  country?: string;
  timezone?: string;
  zones: SiteZone[];
}

export function useSites() {
  return useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await api.get<Site[]>('/api/sites');
      return response.data;
    },
  });
}
