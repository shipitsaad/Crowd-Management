import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, AUTH_STORAGE_KEY } from '../lib/api';

interface AuthState {
  token: string | null;
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      hasHydrated: false,
      setHasHydrated: (hasHydrated: boolean) => set({ hasHydrated }),
      login: async (email: string, password: string) => {
        const response = await api.post('/api/auth/login', { email, password });
        const token = response.data?.token;
        if (!token) {
          throw new Error('Authentication failed: No token returned');
        }
        set({ token });
      },
      logout: () => {
        set({ token: null });
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({ token: state.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
