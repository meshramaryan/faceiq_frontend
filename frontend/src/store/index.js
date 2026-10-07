// Zustand Auth Store — JWT token management and user state
import { create } from 'zustand'
import { persist } from 'zustand/middleware'


export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'face-id-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// UI Store — loading states, modals, sidebar
export const useUIStore = create((set) => ({
  sidebarOpen: true,
  activeModal: null,
  modalData: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal: (name, data = null) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
}))

// Detection Store — real-time detection state
export const useDetectionStore = create((set) => ({
  isStreaming: false,
  currentDetections: [],
  fps: 0,
  cameraId: 0,
  connectionStatus: 'disconnected', // 'connected' | 'connecting' | 'disconnected' | 'error'

  setStreaming: (val) => set({ isStreaming: val }),
  setDetections: (detections) => set({ currentDetections: detections }),
  setFps: (fps) => set({ fps }),
  setCameraId: (id) => set({ cameraId: id }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  clearDetections: () => set({ currentDetections: [] }),
}))

// Settings Store — system operational mode + UI theme
export const useSettingsStore = create((set, get) => ({
  systemMode: 'basic', // 'basic' | 'advanced'
  theme: localStorage.getItem('faceiq_theme') || 'dark-blue',
  loading: false,

  fetchSettings: async () => {
    set({ loading: true })
    try {
      const token = useAuthStore.getState().accessToken
      const axiosLib = (await import('axios')).default
      const { data } = await axiosLib.get('http://127.0.0.1:8000/api/v1/settings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (data && data.settings && data.settings.SYSTEM_MODE) {
        set({ systemMode: data.settings.SYSTEM_MODE.value })
      }
    } catch (err) {
      console.error('Failed to fetch settings', err)
    } finally {
      set({ loading: false })
    }
  },

  setSystemMode: async (mode) => {
    set({ systemMode: mode })
    try {
      const token = useAuthStore.getState().accessToken
      const axiosLib = (await import('axios')).default
      await axiosLib.put(`http://127.0.0.1:8000/api/v1/settings/SYSTEM_MODE?value=${mode}`, null, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    } catch (err) {
      console.error('Failed to update system mode', err)
    }
  },

  setTheme: (themeName) => {
    set({ theme: themeName })
    localStorage.setItem('faceiq_theme', themeName)
    document.documentElement.setAttribute('data-theme', themeName)
  },
}))
