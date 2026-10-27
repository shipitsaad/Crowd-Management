'use client';

import React, { useState, useMemo, useEffect, useSyncExternalStore } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import { useSites } from '@/hooks/useSites';
import { useFootfall } from '@/hooks/useFootfall';
import { useDwell } from '@/hooks/useDwell';
import { useOccupancy } from '@/hooks/useOccupancy';
import { useDemographics } from '@/hooks/useDemographics';
import { useSocket, AlertEvent } from '@/hooks/useSocket';
import { useNotificationStore } from '@/store/notifications';
import { useSiteStore } from '@/store/site';
import { getSiteDayBounds, formatTimeInTz, getHourTicksInTz } from '@/lib/date';
import {
  CalendarIcon,
  MaleIcon,
  FemaleIcon,
  SquigglyTrendUpIcon,
  SquigglyTrendDownIcon,
  CloseIcon,
} from '@/components/icons';

// Charts always end at 17:00 in the site timezone, regardless of the current time
const CHART_END_HOUR = 17;

// X-axis domain from the first point of the day to the fixed chart end
function getTimeDomain(points: { utc: number }[], endUtc: number): [number, number] {
  const first = points[0].utc;
  // Avoid a zero-width domain when the only point sits on the end
  return first === endUtc ? [first - 30 * 60 * 1000, endUtc] : [first, endUtc];
}

// 0, 50, 100 … up to at least minMax, rounded up to cover the data
function getCountTicks(dataMax: number, minMax: number): number[] {
  const top = Math.max(minMax, Math.ceil(dataMax / 50) * 50);
  return Array.from({ length: top / 50 + 1 }, (_, i) => i * 50);
}

function formatDwell(minutes?: number): string {
  if (minutes === undefined || minutes === null) return '--';
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  return `${mins.toString().padStart(2, '0')}min ${secs.toString().padStart(2, '0')}sec`;
}

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

// Custom SVG renderer for the vertical dashed LIVE line badge matching Figma frame 1:1382
const renderLiveBadge = (props: { viewBox?: { x?: number; y?: number } }) => {
  const { viewBox } = props;
  if (!viewBox) return null;
  const { x, y } = viewBox;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={-9}
        y={-12}
        width={18}
        height={38}
        rx={3}
        fill="#9F1D17"
      />
      <text
        x={0}
        y={7}
        fill="#FFFFFF"
        fontSize={10}
        fontWeight={700}
        fontFamily="IBM Plex Sans, sans-serif"
        letterSpacing="0.08em"
        textAnchor="middle"
        transform="rotate(90, 0, 7)"
      >
        LIVE
      </text>
    </g>
  );
};

export default function DashboardClient() {
  const mounted = useIsClient();
  const { addAlert, setAlerts } = useNotificationStore();

  const { data: sites, error: sitesError, refetch: refetchSites } = useSites();
  const { selectedSiteId } = useSiteStore();

  const activeSiteId = selectedSiteId || sites?.[0]?.siteId || '';
  const activeSite = sites?.find((s) => s.siteId === activeSiteId) || sites?.[0];

  // Advances every minute so today's KPIs and charts refresh without a reload
  const [referenceTime, setReferenceTime] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setReferenceTime(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const {
    startOfDayUtc: todayStart,
    toUtc: now,
    yesterdayStartUtc: yesterdayStart,
    yesterdayEndUtc: yesterdayEnd,
  } = useMemo(
    () => getSiteDayBounds(activeSite?.timezone, referenceTime),
    [activeSite?.timezone, referenceTime]
  );

  // Real-time points state
  const [realtimeHistory, setRealtimeHistory] = useState<{
    siteId?: string;
    points: { utc: number; avg: number }[];
  }>({ points: [] });

  // Small toast for new incoming alerts
  const [toastAlert, setToastAlert] = useState<AlertEvent | null>(null);

  // Callbacks for socket events
  const handleOccupancy = React.useCallback(
    (data: { ts: number; siteOccupancy: number }) => {
      setRealtimeHistory((prev) => {
        const existing = prev.siteId === activeSiteId ? prev.points : [];
        const next = [...existing, { utc: data.ts, avg: data.siteOccupancy }];
        return {
          siteId: activeSiteId,
          points: next.slice(-200),
        };
      });
    },
    [activeSiteId]
  );

  const handleAlert = React.useCallback((data: AlertEvent) => {
    setToastAlert(data);
    addAlert(data);
    setTimeout(() => {
      setToastAlert((current) =>
        current?.eventId === data.eventId ? null : current
      );
    }, 4000);
  }, [addAlert]);

  // Socket.IO hook with site filtering and event callbacks
  const { latestOccupancy, alerts } = useSocket({
    activeSiteId,
    onOccupancy: handleOccupancy,
    onAlert: handleAlert,
  });

  useEffect(() => {
    if (alerts.length > 0) {
      setAlerts(alerts);
    }
  }, [alerts, setAlerts]);

  const realtimeOccupancy = useMemo(
    () => (realtimeHistory.siteId === activeSiteId ? realtimeHistory.points : []),
    [realtimeHistory, activeSiteId]
  );

  // Queries for Cards
  const { data: footfallToday, isLoading: isLoadingFootfall, isError: isErrorFootfall, refetch: refetchFootfall } = useFootfall({
    siteId: activeSiteId,
    fromUtc: todayStart,
    toUtc: now,
  });

  const { data: footfallYesterday } = useFootfall({
    siteId: activeSiteId,
    fromUtc: yesterdayStart,
    toUtc: yesterdayEnd,
  });

  const { data: dwellToday, isLoading: isLoadingDwellToday, isError: isErrorDwell, refetch: refetchDwell } = useDwell({
    siteId: activeSiteId,
    fromUtc: todayStart,
    toUtc: now,
  });

  const { data: dwellYesterday } = useDwell({
    siteId: activeSiteId,
    fromUtc: yesterdayStart,
    toUtc: yesterdayEnd,
  });

  // Queries for Charts
  const {
    data: occupancyData,
    isLoading: isLoadingOccupancy,
    error: occupancyError,
    refetch: refetchOccupancy,
  } = useOccupancy({
    siteId: activeSiteId,
    fromUtc: todayStart,
    toUtc: now,
  });

  const {
    data: demographicsData,
    isLoading: isLoadingDemographics,
    error: demographicsError,
    refetch: refetchDemographics,
  } = useDemographics({
    siteId: activeSiteId,
    fromUtc: todayStart,
    toUtc: now,
  });

  // live_occupancy: update Live Occupancy card with siteOccupancy
  const liveOccupancy = useMemo(() => {
    if (latestOccupancy) return latestOccupancy.siteOccupancy;
    if (!occupancyData?.buckets?.length) return null;
    const last = occupancyData.buckets[occupancyData.buckets.length - 1];
    return Math.round(last.avg);
  }, [latestOccupancy, occupancyData]);

  // Dwell comparison vs yesterday
  const dwellComparison = useMemo(() => {
    const today = dwellToday?.avgDwellMinutes;
    const yest = dwellYesterday?.avgDwellMinutes;
    if (today === undefined || yest === undefined || yest === 0) return null;
    const diff = today - yest;
    const pct = Math.abs(Math.round((diff / yest) * 100));
    return {
      pct: `${pct}%`,
      isMore: diff >= 0,
    };
  }, [dwellToday, dwellYesterday]);

  // Footfall comparison vs yesterday
  const footfallComparison = useMemo(() => {
    const today = footfallToday?.footfall;
    const yest = footfallYesterday?.footfall;
    if (today === undefined || yest === undefined || yest === 0) return null;
    const diff = today - yest;
    const pct = Math.abs(Math.round((diff / yest) * 100));
    return {
      pct: `${pct}%`,
      isMore: diff >= 0,
    };
  }, [footfallToday, footfallYesterday]);

  // The API's `local` strings are inconsistent, so all chart times are plotted on `utc`
  // and only formatted in the site's timezone for display.
  const chartTz = occupancyData?.timezone || demographicsData?.timezone || activeSite?.timezone;
  const formatChartTime = React.useCallback(
    (utc: number) => formatTimeInTz(utc, chartTz),
    [chartTz]
  );

  const chartEndUtc = todayStart + CHART_END_HOUR * 3600 * 1000;

  // Charts run up to the current time, or 17:00 once the day is over
  const chartNowUtc = Math.min(now, chartEndUtc);

  // Combine historical occupancy with real-time socket points, limited to today (until 17:00) in the site timezone
  const occupancyChartData = useMemo(() => {
    const byUtc = new Map<number, number>();
    for (const b of occupancyData?.buckets ?? []) byUtc.set(b.utc, Math.round(b.avg));
    for (const pt of realtimeOccupancy) byUtc.set(pt.utc, Math.round(pt.avg));

    const points = [...byUtc.entries()]
      .filter(([utc]) => utc >= todayStart && utc <= chartEndUtc)
      .sort(([a], [b]) => a - b)
      .map(([utc, count]) => ({ utc, count }));

    // Hourly buckets are stamped at their start; carry the latest value forward to "now"
    const last = points[points.length - 1];
    if (last && last.utc < chartNowUtc) points.push({ utc: chartNowUtc, count: last.count });
    return points;
  }, [occupancyData, realtimeOccupancy, todayStart, chartEndUtc, chartNowUtc]);

  const demographicsChartData = useMemo(() => {
    const points = (demographicsData?.buckets ?? [])
      .filter((b) => b.utc >= todayStart && b.utc <= chartEndUtc)
      .sort((a, b) => a.utc - b.utc)
      .map((b) => ({ utc: b.utc, male: Math.round(b.male), female: Math.round(b.female) }));

    const last = points[points.length - 1];
    if (last && last.utc < chartNowUtc) points.push({ ...last, utc: chartNowUtc });
    return points;
  }, [demographicsData, todayStart, chartEndUtc, chartNowUtc]);

  // X-axis always ends at 17:00; the LIVE cursor marks the latest point while the day is still running
  const occupancyDomain = useMemo(
    () => (occupancyChartData.length ? getTimeDomain(occupancyChartData, chartEndUtc) : null),
    [occupancyChartData, chartEndUtc]
  );
  // Y-axis keeps the design's scale but grows in steps of 50 if a site exceeds it
  const occupancyYTicks = useMemo(
    () => getCountTicks(Math.max(0, ...occupancyChartData.map((p) => p.count)), 250),
    [occupancyChartData]
  );
  const demographicsYTicks = useMemo(
    () => getCountTicks(Math.max(0, ...demographicsChartData.flatMap((p) => [p.male, p.female])), 350),
    [demographicsChartData]
  );

  const liveUtc = occupancyChartData.length && now < chartEndUtc ? chartNowUtc : null;
  const occupancyTicks = useMemo(
    () => (occupancyDomain ? getHourTicksInTz(occupancyDomain[0], occupancyDomain[1], chartTz) : []),
    [occupancyDomain, chartTz]
  );

  const demographicsDomain = useMemo(
    () => (demographicsChartData.length ? getTimeDomain(demographicsChartData, chartEndUtc) : null),
    [demographicsChartData, chartEndUtc]
  );
  const demographicsTicks = useMemo(
    () => (demographicsDomain ? getHourTicksInTz(demographicsDomain[0], demographicsDomain[1], chartTz) : []),
    [demographicsDomain, chartTz]
  );

  const pieMetrics = useMemo(() => {
    if (latestOccupancy?.genderCount) {
      const { male, female } = latestOccupancy.genderCount;
      const sum = male + female;
      if (sum === 0) return null;
      const malePct = Math.round((male / sum) * 100);
      return {
        malePct,
        femalePct: 100 - malePct,
        data: [
          { name: 'Male', value: male, color: '#639F9E' },
          { name: 'Female', value: female, color: '#A5D6D5' },
        ],
      };
    }

    if (!demographicsData?.buckets?.length) return null;

    const totalMale = demographicsData.buckets.reduce((acc, b) => acc + b.male, 0);
    const totalFemale = demographicsData.buckets.reduce((acc, b) => acc + b.female, 0);
    const sum = totalMale + totalFemale;
    if (sum === 0) return null;

    const malePct = Math.round((totalMale / sum) * 100);
    return {
      malePct,
      femalePct: 100 - malePct,
      data: [
        { name: 'Male', value: totalMale, color: '#639F9E' },
        { name: 'Female', value: totalFemale, color: '#A5D6D5' },
      ],
    };
  }, [latestOccupancy, demographicsData]);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-10">
      {/* Toast Notification for New Alerts */}
      {toastAlert && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3.5 flex items-center gap-3 transition-all transform ease-out duration-300 max-w-sm"
        >
          <span
            className={`w-3 h-3 rounded-full shrink-0 ${
              toastAlert.severity === 'high'
                ? 'bg-rose-500'
                : toastAlert.severity === 'medium'
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
          />
          <div className="text-xs">
            <div className="font-semibold text-gray-900">
              {toastAlert.personName || 'Visitor'}{' '}
              <span className="font-normal text-gray-600">
                ({toastAlert.direction})
              </span>
            </div>
            <div className="text-gray-500 truncate">{toastAlert.zoneName}</div>
          </div>
          <button
            type="button"
            onClick={() => setToastAlert(null)}
            className="text-gray-400 hover:text-gray-600 text-sm ml-auto p-1"
            aria-label="Dismiss"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      {/* Header: Overview Title on Left, Today button on Right matching Figma 1:1009 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-[#1D1D1B]">Overview</h1>

        {/* Today Filter Pill Button */}
        <button
          type="button"
          className="px-3.5 py-1.5 border border-[#D2D4D9] rounded-md text-xs sm:text-sm bg-white text-[#1D1D1B] font-normal flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <CalendarIcon size={15} className="text-[#1D1D1B] shrink-0" />
          <span>Today</span>
        </button>
      </div>

      {sitesError && (
        <div className="p-3 text-sm text-red-700 bg-red-100 rounded border border-red-300 flex items-center justify-between gap-4">
          <span>Failed to load sites. Some data may be unavailable.</span>
          <button type="button" onClick={() => refetchSites()} className="text-xs font-medium underline shrink-0 hover:opacity-70">Retry</button>
        </div>
      )}


      {/* Section 1: Occupancy (matching Figma 1:1044) */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-[#1D1D1B]">Occupancy</h2>

        {/* Metric Cards Row: 2-in-1 Combined Card (747px) + Dwell Time Card (400px) */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Combined Card: Live Occupancy + Today's Footfall */}
          <div className="w-full lg:flex-[1.86] rounded-lg bg-white p-5 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#F0F2F5] gap-4 sm:gap-0">
            {/* Left: Live Occupancy */}
            <div className="sm:pr-8 flex flex-col justify-between">
              <div className="text-sm font-medium text-gray-500">Live Occupancy</div>
              {isLoadingOccupancy
                ? <div className="h-8 w-20 bg-gray-200 animate-pulse rounded-md mt-2" />
                : <div className="text-[28px] leading-tight font-semibold text-[#1D1D1B] mt-2 tracking-tight">
                    {liveOccupancy != null ? liveOccupancy.toLocaleString() : <span className="text-gray-400 text-lg">No data</span>}
                  </div>}
              <div className="mt-3 h-10" />
            </div>

            {/* Right: Today's Footfall */}
            <div className="sm:pl-8 flex flex-col justify-between pt-4 sm:pt-0">
              <div className="text-sm font-medium text-gray-500">Today&apos;s Footfall</div>
              {isLoadingFootfall
                ? <div className="h-8 w-20 bg-gray-200 animate-pulse rounded-md mt-2" />
                : isErrorFootfall
                ? <div className="mt-2 flex flex-col gap-1">
                    <span className="text-rose-500 text-sm">Failed to load</span>
                    <button type="button" onClick={() => refetchFootfall()} className="text-xs text-[#009490] font-medium underline text-left hover:opacity-70 w-fit">Retry</button>
                  </div>
                : <div className="text-[28px] leading-tight font-semibold text-[#1D1D1B] mt-2 tracking-tight">
                    {footfallToday?.footfall != null ? footfallToday.footfall.toLocaleString() : <span className="text-gray-400 text-lg">No data</span>}
                  </div>}
              <div className="mt-3 flex flex-col gap-1">
                {footfallComparison ? (
                  <>
                    {footfallComparison.isMore
                      ? <SquigglyTrendUpIcon size={20} className="text-[#47CB96]" />
                      : <SquigglyTrendDownIcon size={20} className="text-[#DC2626]" />}
                    <span className="text-xs text-gray-500 font-normal">
                      {footfallComparison.pct} {footfallComparison.isMore ? 'More' : 'Less'} than yesterday
                    </span>
                  </>
                ) : (
                  <div className="h-10" />
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Avg Dwell Time (400px) */}
          <div className="w-full lg:flex-1 rounded-lg bg-white p-5 flex flex-col justify-between">
            <div className="text-sm font-medium text-gray-500">Avg Dwell Time</div>
            {isLoadingDwellToday
              ? <div className="h-8 w-32 bg-gray-200 animate-pulse rounded-md mt-2" />
              : isErrorDwell
              ? <div className="mt-2 flex flex-col gap-1">
                  <span className="text-rose-500 text-sm">Failed to load</span>
                  <button type="button" onClick={() => refetchDwell()} className="text-xs text-[#009490] font-medium underline text-left hover:opacity-70 w-fit">Retry</button>
                </div>
              : <div className="text-[28px] leading-tight font-semibold text-[#1D1D1B] mt-2 tracking-tight">
                  {dwellToday?.avgDwellMinutes != null ? formatDwell(dwellToday.avgDwellMinutes) : <span className="text-gray-400 text-lg">No data</span>}
                </div>}
            <div className="mt-3 flex flex-col gap-1">
              {dwellComparison ? (
                <>
                  {dwellComparison.isMore
                    ? <SquigglyTrendUpIcon size={20} className="text-[#47CB96]" />
                    : <SquigglyTrendDownIcon size={20} className="text-[#DC2626]" />}
                  <span className="text-xs text-gray-500 font-normal">
                    {dwellComparison.pct} {dwellComparison.isMore ? 'More' : 'Less'} than yesterday
                  </span>
                </>
              ) : (
                <div className="h-10" />
              )}
            </div>
          </div>
        </div>

        {/* Overall Occupancy Chart Card (matching Figma 1:1374) */}
        <div className="rounded-lg p-5 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-[#1D1D1B] text-base">Overall Occupancy</h3>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-[#009490]"></span>
              <span>Occupancy</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Rotated Count Label matching Figma */}
            <div className="text-xs text-gray-500 font-medium -rotate-90 select-none w-4 shrink-0 text-center">
              Count
            </div>

            <div className="h-64 flex-1">
              {isLoadingOccupancy ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  Loading occupancy trend...
                </div>
              ) : occupancyError ? (
                <div className="h-full flex flex-col items-center justify-center gap-2">
                  <span className="text-sm text-red-500">Failed to load occupancy data.</span>
                  <button type="button" onClick={() => refetchOccupancy()} className="text-xs text-[#009490] font-medium underline hover:opacity-70">Retry</button>
                </div>
              ) : occupancyChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  No occupancy data recorded for today.
                </div>
              ) : mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={occupancyChartData}
                    margin={{ top: 18, right: 24, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="occupancyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#009490" stopOpacity={0.16} />
                        <stop offset="100%" stopColor="#009490" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#F0F2F5" />
                    <XAxis
                      dataKey="utc"
                      type="number"
                      scale="time"
                      domain={occupancyDomain ?? ['dataMin', 'dataMax']}
                      ticks={occupancyTicks}
                      tickFormatter={formatChartTime}
                      interval={0}
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={{ stroke: '#F0F2F5' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, occupancyYTicks[occupancyYTicks.length - 1]]}
                      ticks={occupancyYTicks.slice(1)}
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                      }}
                      labelFormatter={(label) => formatChartTime(Number(label))}
                      formatter={(value) => [value !== null && value !== undefined ? Number(value) : '--', 'Occupancy']}
                    />
                    {liveUtc !== null && (
                      <ReferenceLine
                        x={liveUtc}
                        stroke="#9F1D17"
                        strokeDasharray="3 3"
                        strokeWidth={1.5}
                        label={renderLiveBadge}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#4BA7A4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#occupancyGrad)"
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>

          {/* Centered Time label matching Figma */}
          <div className="text-xs text-gray-500 font-medium text-center pt-1">
            Time
          </div>
        </div>
      </div>

      {/* Section 2: Demographics (matching Figma 1:1598) */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-[#1D1D1B]">Demographics</h2>

        <div className="flex flex-col lg:flex-row gap-3">
          {/* Donut Pie Card (Figma 1:1602: width 328px, pure white, 8px rounded, NO BORDER) */}
          <div className="w-full lg:w-[328px] shrink-0 rounded-lg p-5 bg-white flex flex-col justify-between">
            <h3 className="font-medium text-[#1D1D1B] text-base">Chart of Demographics</h3>

            <div className="relative flex items-center justify-center my-4 h-52">
              {isLoadingDemographics ? (
                <span className="text-sm text-gray-400 animate-pulse">Loading...</span>
              ) : demographicsError ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm text-red-500">Failed to load demographics.</span>
                  <button type="button" onClick={() => refetchDemographics()} className="text-xs text-[#009490] font-medium underline hover:opacity-70">Retry</button>
                </div>
              ) : !pieMetrics ? (
                <span className="text-sm text-gray-400">No data yet</span>
              ) : mounted ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieMetrics.data}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={68}
                        outerRadius={90}
                        paddingAngle={4}
                        cornerRadius={6}
                      >
                        {pieMetrics.data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-gray-400 font-normal">Total Crowd</span>
                    <span className="text-xl font-bold text-[#1D1D1B]">100%</span>
                  </div>
                </>
              ) : null}
            </div>

            {/* Person Silhouette Legend */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <MaleIcon size={18} className="text-[#639F9E] shrink-0" />
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-bold text-[#1D1D1B]">{pieMetrics?.malePct ?? '—'}%</span>
                  <span className="text-gray-600 font-normal">Males</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FemaleIcon size={18} className="text-[#A5D6D5] shrink-0" />
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-bold text-[#1D1D1B]">{pieMetrics?.femalePct ?? '—'}%</span>
                  <span className="text-gray-600 font-normal">Females</span>
                </div>
              </div>
            </div>
          </div>

          {/* Demographics Analysis Time Series Card (matching Figma 1:1685) */}
          <div className="flex-1 rounded-lg p-5 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-[#1D1D1B] text-base">
                Demographics Analysis
              </h3>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#639F9E]"></span>
                  <span>Male</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A5D6D5]"></span>
                  <span>Female</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Rotated Count Label matching Figma */}
              <div className="text-xs text-gray-500 font-medium -rotate-90 select-none w-4 shrink-0 text-center">
                Count
              </div>

              <div className="h-64 flex-1">
                {isLoadingDemographics ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    Loading demographics timeline...
                  </div>
                ) : demographicsError ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2">
                    <span className="text-sm text-red-500">Failed to load demographics data.</span>
                    <button type="button" onClick={() => refetchDemographics()} className="text-xs text-[#009490] font-medium underline hover:opacity-70">Retry</button>
                  </div>
                ) : demographicsChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    No demographic records for today.
                  </div>
                ) : mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={demographicsChartData}
                      margin={{ top: 18, right: 24, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="maleGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#639F9E" stopOpacity={0.16} />
                          <stop offset="100%" stopColor="#639F9E" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="femaleGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#A5D6D5" stopOpacity={0.16} />
                          <stop offset="100%" stopColor="#A5D6D5" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#F0F2F5" />
                      <XAxis
                        dataKey="utc"
                        type="number"
                        scale="time"
                        domain={demographicsDomain ?? ['dataMin', 'dataMax']}
                        ticks={demographicsTicks}
                        tickFormatter={formatChartTime}
                        interval={0}
                        tick={{ fontSize: 11, fill: '#6B7280' }}
                        axisLine={{ stroke: '#F0F2F5' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, demographicsYTicks[demographicsYTicks.length - 1]]}
                        ticks={demographicsYTicks}
                        tick={{ fontSize: 11, fill: '#6B7280' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                          fontSize: '12px',
                        }}
                        labelFormatter={(label) => formatChartTime(Number(label))}
                      />
                      <Area
                        type="monotone"
                        dataKey="male"
                        name="Male"
                        stroke="#639F9E"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#maleGrad)"
                        connectNulls={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="female"
                        name="Female"
                        stroke="#A5D6D5"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#femaleGrad)"
                        connectNulls={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </div>

            {/* Centered Time label matching Figma */}
            <div className="text-xs text-gray-500 font-medium text-center pt-1">
              Time
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
