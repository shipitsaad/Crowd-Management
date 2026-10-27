import { create } from 'zustand';
import { AlertEvent } from '@/hooks/useSocket';

interface NotificationStore {
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  alerts: AlertEvent[];
  addAlert: (alert: AlertEvent) => void;
  setAlerts: (alerts: AlertEvent[]) => void;
  clearAlerts: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  isDrawerOpen: false,
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
  alerts: [],
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts.filter((a) => a.eventId !== alert.eventId)].slice(0, 50),
    })),
  setAlerts: (alerts) => set({ alerts }),
  clearAlerts: () => set({ alerts: [] }),
}));
