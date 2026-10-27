import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface EntryExitParams {
  siteId?: string;
  fromUtc?: number;
  toUtc?: number;
  pageSize?: number;
  pageNumber?: number;
}

export interface EntryExitRecord {
  personId: string;
  personName: string;
  gender: string;
  zoneId: string;
  zoneName: string;
  severity: string;
  entryUtc: number;
  entryLocal: string;
  exitUtc: number | null;
  exitLocal: string | null;
  dwellMinutes: number | null;
}

export interface EntryExitResponse {
  siteId: string;
  fromUtc: number;
  toUtc: number;
  pageSize: number;
  pageNumber: number;
  totalRecords: number;
  totalPages: number;
  records: EntryExitRecord[];
}

export function useEntries(params: EntryExitParams, enabled: boolean = true) {
  return useQuery<EntryExitResponse>({
    queryKey: [
      'entry-exit',
      params.siteId,
      params.fromUtc,
      params.toUtc,
      params.pageSize,
      params.pageNumber,
    ],
    queryFn: async () => {
      const response = await api.post<EntryExitResponse>(
        '/api/analytics/entry-exit',
        {
          siteId: params.siteId,
          fromUtc: params.fromUtc,
          toUtc: params.toUtc,
          pageSize: params.pageSize ?? 10,
          pageNumber: params.pageNumber ?? 1,
        }
      );
      return response.data;
    },
    placeholderData: keepPreviousData,
    enabled: enabled && Boolean(params.siteId && params.fromUtc && params.toUtc),
  });
}
