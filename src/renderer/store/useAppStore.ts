import { create } from 'zustand'

export type Page = 'network-map' | 'fingerprint' | 'traffic' | 'proxy' | 'history' | 'settings' | 'reports'

interface AppState {
  currentPage: Page
  setCurrentPage: (page: Page) => void
  
  activeSessionId: string | null
  setActiveSessionId: (id: string | null) => void
  
  isAIPanelOpen: boolean
  toggleAIPanel: () => void
  setAIPanelOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'history', // Start on history to select/create session
  setCurrentPage: (page) => set({ currentPage: page }),
  
  activeSessionId: null,
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  
  isAIPanelOpen: false,
  toggleAIPanel: () => set((state) => ({ isAIPanelOpen: !state.isAIPanelOpen })),
  setAIPanelOpen: (open) => set({ isAIPanelOpen: open }),
}))
