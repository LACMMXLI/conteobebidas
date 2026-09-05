import { create } from 'zustand';
import type { AuthUser, BranchSummary } from '../api/types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  branches: BranchSummary[];
  selectedBranchId: string | null;
  setSession: (data: { accessToken: string; refreshToken: string; user: AuthUser; branches: BranchSummary[] }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  selectBranch: (branchId: string) => void;
  clear: () => void;
}

const STORAGE_KEY = 'conteo.auth';

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persist(state: Partial<AuthState>) {
  try {
    const current = loadInitial() ?? {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...state }));
  } catch {
    // almacenamiento no disponible; la sesión simplemente no persistirá
  }
}

const initial = loadInitial();

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: initial?.accessToken ?? null,
  refreshToken: initial?.refreshToken ?? null,
  user: initial?.user ?? null,
  branches: initial?.branches ?? [],
  selectedBranchId: initial?.selectedBranchId ?? null,

  setSession: (data) => {
    set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      branches: data.branches,
      selectedBranchId: data.branches.length === 1 ? data.branches[0].id : null,
    });
    persist({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      branches: data.branches,
      selectedBranchId: data.branches.length === 1 ? data.branches[0].id : null,
    });
  },

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    persist({ accessToken, refreshToken });
  },

  selectBranch: (branchId) => {
    set({ selectedBranchId: branchId });
    persist({ selectedBranchId: branchId });
  },

  clear: () => {
    set({ accessToken: null, refreshToken: null, user: null, branches: [], selectedBranchId: null });
    localStorage.removeItem(STORAGE_KEY);
  },
}));
