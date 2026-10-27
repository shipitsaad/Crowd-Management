import { useEffect, useRef, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://hiring-dev.internal.kloudspot.com';

export interface AlertEvent {
  ts: number;
  eventId: string;
  direction: 'entry' | 'exit' | 'zone-entry' | 'zone-exit';
  personName?: string;
  severity: 'high' | 'medium' | 'low';
  zoneName: string;
  zoneId: string;
  siteName: string;
  siteId: string;
  personId?: string;
}

export interface LiveOccupancyEvent {
  ts: number;
  siteId: string;
  siteOccupancy: number;
  zoneId: string;
  zoneOccupancy: number;
  genderCount: {
    male: number;
    female: number;
  };
}

interface UseSocketOptions {
  activeSiteId?: string;
  onOccupancy?: (data: LiveOccupancyEvent) => void;
  onAlert?: (data: AlertEvent) => void;
}

export function useSocket(options?: UseSocketOptions) {
  const { activeSiteId, onOccupancy, onAlert } = options || {};
  const { token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [occupancyState, setOccupancyState] = useState<{
    siteId?: string;
    data: LiveOccupancyEvent | null;
  }>({ data: null });

  const [alertsState, setAlertsState] = useState<{
    siteId?: string;
    list: AlertEvent[];
  }>({ list: [] });

  const onOccupancyRef = useRef(onOccupancy);
  const onAlertRef = useRef(onAlert);

  useEffect(() => {
    onOccupancyRef.current = onOccupancy;
    onAlertRef.current = onAlert;
  });

  useEffect(() => {
    if (!token) return;

    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // 1 & 2: Listen only to live_occupancy and alert; ignore if siteId doesn't match
    socket.on('live_occupancy', (data: LiveOccupancyEvent) => {
      if (activeSiteId && data.siteId !== activeSiteId) return;
      setOccupancyState({ siteId: activeSiteId, data });
      onOccupancyRef.current?.(data);
    });

    socket.on('alert', (data: AlertEvent) => {
      if (activeSiteId && data.siteId !== activeSiteId) return;
      setAlertsState((prev) => ({
        siteId: activeSiteId,
        list: (prev.siteId === activeSiteId ? [data, ...prev.list] : [data]).slice(0, 20),
      }));
      onAlertRef.current?.(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token, activeSiteId]);

  const latestOccupancy = useMemo(
    () => (occupancyState.siteId === activeSiteId ? occupancyState.data : null),
    [occupancyState, activeSiteId]
  );

  const alerts = useMemo(
    () => (alertsState.siteId === activeSiteId ? alertsState.list : []),
    [alertsState, activeSiteId]
  );

  return {
    isConnected,
    latestOccupancy,
    alerts,
  };
}
