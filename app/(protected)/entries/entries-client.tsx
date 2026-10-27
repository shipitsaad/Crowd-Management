'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useSites } from '@/hooks/useSites';
import { useEntries } from '@/hooks/useEntries';
import { useSiteStore } from '@/store/site';
import { getSiteDayBounds, formatTime12hInTz } from '@/lib/date';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';


function formatFigmaDwell(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '--';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export default function EntriesClient() {
  const { data: sites } = useSites();
  const { selectedSiteId } = useSiteStore();
  const pageSize = 11;

  const activeSiteId = selectedSiteId || sites?.[0]?.siteId || '';
  const activeSite = sites?.find((s) => s.siteId === activeSiteId) || sites?.[0];

  const [referenceTime] = useState(() => Date.now());

  // Page is keyed by site so it resets to 1 whenever the active site changes
  const [pageState, setPageState] = useState<{ siteId?: string; page: number }>({ page: 1 });
  const page = pageState.siteId === activeSiteId ? pageState.page : 1;
  const setPage = (next: number | ((p: number) => number)) =>
    setPageState({ siteId: activeSiteId, page: typeof next === 'function' ? next(page) : next });

  const { startOfDayUtc: todayStart, toUtc: now } = useMemo(
    () => getSiteDayBounds(activeSite?.timezone, referenceTime),
    [activeSite?.timezone, referenceTime]
  );

  const { data: entriesData, isLoading: isLoadingEntries, isFetching, error: entriesError, refetch: refetchEntries } = useEntries({
    siteId: activeSiteId,
    fromUtc: todayStart,
    toUtc: now,
    pageSize,
    pageNumber: page,
  });

  const totalPages = entriesData?.totalPages ?? 1;

  const displayRecords = useMemo(() => {
    return (entriesData?.records ?? []).map((r, idx) => ({
      personId: r.personId,
      personName: r.personName,
      gender: r.gender
        ? r.gender.charAt(0).toUpperCase() + r.gender.slice(1).toLowerCase()
        : '--',
      entryLocal: formatTime12hInTz(r.entryUtc, activeSite?.timezone),
      exitLocal: r.exitUtc === null ? '--' : formatTime12hInTz(r.exitUtc, activeSite?.timezone),
      dwellDisplay: r.exitUtc === null ? '--' : formatFigmaDwell(r.dwellMinutes),
      avatar: `/avatars/avatar-${(idx % 11) + 1}.png`,
    }));
  }, [entriesData?.records, activeSite?.timezone]);

  return (
    <div className="space-y-4">
      {/* Header: Overview Title on Left, Today button on Right matching Figma screenshot 1:1 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-[#1D1D1B]">Crowd Entries</h1>

        {/* Today Filter Pill Button */}
        <button
          type="button"
          className="px-3.5 py-1.5 border border-[#D2D4D9] rounded-md text-xs sm:text-sm bg-white text-[#1D1D1B] font-normal flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <CalendarIcon size={15} className="text-[#1D1D1B] shrink-0" />
          <span>Today</span>
        </button>
      </div>

      {/* Table Card (Figma: rounded-lg border border-[#E5E7EB] bg-white overflow-hidden) */}
      <div className="rounded-md border border-[#E5E7EB] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#E7E8E7] border-b border-[#E5E7EB] text-sm font-semibold text-[#1D1D1B]">
                <th className="py-2.5 px-6 font-semibold w-[28%]">Name</th>
                <th className="py-2.5 px-6 font-semibold w-[18%]">Sex</th>
                <th className="py-2.5 px-6 font-semibold w-[18%]">Entry</th>
                <th className="py-2.5 px-6 font-semibold w-[18%]">Exit</th>
                <th className="py-2.5 px-6 font-semibold w-[18%]">Dwell Time</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-[#ECECED] transition-opacity duration-150 ${isFetching && !isLoadingEntries ? 'opacity-40' : 'opacity-100'}`}>
              {isLoadingEntries ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-2.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse shrink-0" />
                        <div className="h-3.5 w-32 bg-gray-200 animate-pulse rounded" />
                      </div>
                    </td>
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="py-2.5 px-6">
                        <div className="h-3.5 w-16 bg-gray-200 animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : entriesError ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <p className="text-sm text-rose-500 mb-2">Failed to load entries.</p>
                    <button type="button" onClick={() => refetchEntries()} className="text-xs text-[#009490] font-medium underline hover:opacity-70">Retry</button>
                  </td>
                </tr>
              ) : displayRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-gray-400">
                    No entries recorded for today.
                  </td>
                </tr>
              ) : (
                displayRecords.map((record) => (
                  <tr
                    key={record.personId}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="py-2.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-gray-100">
                          <Image
                            src={record.avatar}
                            alt={record.personName}
                            width={24}
                            height={24}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-sm text-[#384250] font-normal">
                          {record.personName}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-6 text-sm text-[#384250] font-normal">
                      {record.gender}
                    </td>
                    <td className="py-2.5 px-6 text-sm text-[#384250] font-normal">
                      {record.entryLocal}
                    </td>
                    <td className="py-2.5 px-6 text-sm text-[#384250] font-normal">
                      {record.exitLocal}
                    </td>
                    <td className="py-2.5 px-6 text-sm text-[#384250] font-normal">
                      {record.dwellDisplay}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="py-4 flex items-center justify-center gap-3 text-sm">
          {/* Prev Chevron */}
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-[#71717A] hover:text-[#1D1D1B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-1"
            aria-label="Previous Page"
          >
            <ChevronLeftIcon size={14} />
          </button>

          {/* Page numbers */}
          {(() => {
            const items: React.ReactNode[] = [];
            const pageBtn = (n: number) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`relative px-2 py-0.5 text-sm transition-colors ${
                  page === n
                    ? 'font-medium text-[#1D1D1B]'
                    : 'font-normal text-[#71717A] hover:text-[#1D1D1B]'
                }`}
              >
                <span>{n}</span>
                {page === n && (
                  <span className="block w-4 h-0.5 bg-[#009490] mx-auto mt-0.5 rounded-full" />
                )}
              </button>
            );
            const ellipsis = (key: string) => (
              <span
                key={key}
                className="px-1.5 py-0.5 text-[11px] leading-tight text-[#71717A] border border-[#71717A] rounded font-medium flex items-center justify-center"
              >
                ...
              </span>
            );

            if (totalPages <= 5) {
              for (let i = 1; i <= totalPages; i++) items.push(pageBtn(i));
            } else if (page <= 3) {
              items.push(pageBtn(1), pageBtn(2), pageBtn(3), ellipsis('e1'), pageBtn(totalPages));
            } else if (page >= totalPages - 2) {
              items.push(pageBtn(1), ellipsis('e1'), pageBtn(totalPages - 2), pageBtn(totalPages - 1), pageBtn(totalPages));
            } else {
              items.push(pageBtn(1), ellipsis('e1'), pageBtn(page - 1), pageBtn(page), pageBtn(page + 1), ellipsis('e2'), pageBtn(totalPages));
            }
            return items;
          })()}

          {/* Next Chevron */}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-[#71717A] hover:text-[#1D1D1B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-1"
            aria-label="Next Page"
          >
            <ChevronRightIcon size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
