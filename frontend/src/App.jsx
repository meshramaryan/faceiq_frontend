// React Application entry router and route protection
import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster, toast, ToastBar } from 'react-hot-toast'
import { X } from 'lucide-react'
import { useAuthStore, useSettingsStore } from '@/store'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Camera from '@/pages/Camera'
import Users from '@/pages/Users'
import Registration from '@/pages/Registration'
import Logs from '@/pages/Logs'
import Unknown from '@/pages/Unknown'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
import ThemeSelector from '@/pages/ThemeSelector'
import EmployeeMonitoring from '@/pages/EmployeeMonitoring'
import NotFound from '@/pages/NotFound'
import { authAPI } from '@/api'
import { LoadingSpinner } from '@/components/ui'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Route Protection wrapper
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings()
    }
  }, [fetchSettings, isAuthenticated])

  return (
    <QueryClientProvider client={queryClient}>
      {/* Universal Toaster with Apple-style Top-Right (×) Close Button for ALL notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '14px',
            padding: '12px 16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            fontSize: '13px',
            maxWidth: '380px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#0f172a' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
        }}
      >
        {(t) => (
          <ToastBar
            toast={t}
            style={{
              ...t.style,
              position: 'relative',
              paddingRight: '28px',
            }}
          >
            {({ icon, message }) => (
              <div className="flex items-start gap-2.5 w-full relative group">
                <div className="shrink-0 pt-0.5">{icon}</div>
                <div className="flex-1 text-xs font-medium leading-relaxed pr-2">{message}</div>
                {t.type !== 'loading' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toast.dismiss(t.id)
                    }}
                    className="absolute -top-1 -right-5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all duration-150 cursor-pointer"
                    title="Close notification"
                    aria-label="Close notification"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </ToastBar>
        )}
      </Toaster>

      <Routes>
        {/* Authentication */}
        <Route path="/login" element={<Login />} />

        {/* Authenticated Dashboard Workspace */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Default Route */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Subpages */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="camera" element={<Camera />} />
          <Route path="employee-monitoring" element={<EmployeeMonitoring />} />
          <Route path="employee_monitoring" element={<EmployeeMonitoring />} />
          <Route path="employee-monitoring/*" element={<EmployeeMonitoring />} />
          <Route path="employee_monitoring/*" element={<EmployeeMonitoring />} />
          <Route path="users" element={<Users />} />
          <Route path="registration" element={<Registration />} />
          <Route path="logs" element={<Logs />} />
          <Route path="unknown" element={<Unknown />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/themes" element={<ThemeSelector />} />


          {/* Fallback inside workspace */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </QueryClientProvider>
  )
}

