import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  isAuthenticated: boolean;
  token: string | null;
  workspaceId: string | null;
  userId: string | null;
  login: (token: string, workspaceId: string, userId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      workspaceId: null,
      userId: null,
      login: (token: string, workspaceId: string, userId: string) =>
        set({
          isAuthenticated: true,
          token,
          workspaceId,
          userId,
        }),
      logout: () =>
        set({
          isAuthenticated: false,
          token: null,
          workspaceId: null,
          userId: null,
        }),
    }),
    {
      name: 'auth-store',
    }
  )
);
