import { create } from 'zustand';

interface SiteStore {
  selectedSiteId: string;
  setSelectedSiteId: (siteId: string) => void;
}

export const useSiteStore = create<SiteStore>((set) => ({
  selectedSiteId: '',
  setSelectedSiteId: (selectedSiteId) => set({ selectedSiteId }),
}));
