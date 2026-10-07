// Top Header Bar — Enterprise Biometric SaaS Design
import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, User, Search, CheckCircle2, ChevronRight, Menu } from 'lucide-react'
import { useAuthStore, useUIStore, useSettingsStore } from '@/store'
import { authAPI } from '@/api'
import toast from 'react-hot-toast'

const PAGE_META = {
  '/dashboard':           { title: 'Dashboard',           breadcrumb: 'Overview / Today' },
  '/camera':              { title: 'Face Recognition',    breadcrumb: 'Biometric Core / Live Stream' },
  '/employee-monitoring': { title: 'Employee Monitoring', breadcrumb: 'Workstations / Occupancy' },
  '/employee_monitoring': { title: 'Employee Monitoring', breadcrumb: 'Workstations / Occupancy' },
  '/users':               { title: 'User Directory',      breadcrumb: 'Records / Personnel' },
  '/registration':        { title: 'Face Registration',   breadcrumb: 'Biometric Core / Enrollment' },
  '/logs':                { title: 'Activity Logs',       breadcrumb: 'Analytics / Audit Trail' },
  '/unknown':             { title: 'Unknown Faces',       breadcrumb: 'Security / Unmatched Subjects' },
  '/reports':             { title: 'Reports & Exports',   breadcrumb: 'Analytics / Compliance' },
  '/settings':            { title: 'Settings',            breadcrumb: 'Administration / System & Themes' },
}

const QUICK_ROUTES = [
  { label: 'Dashboard Overview', path: '/dashboard', keywords: 'dashboard home overview stats' },
  { label: 'Face Recognition (Live Camera)', path: '/camera', keywords: 'camera live stream recognition detect' },
  { label: 'Register New Face', path: '/registration', keywords: 'register enroll new face user' },
  { label: 'Employee Monitoring', path: '/employee-monitoring', keywords: 'employee monitoring workstation desk occupancy' },
  { label: 'User Directory', path: '/users', keywords: 'users directory people employees' },
  { label: 'Authentication Activity Logs', path: '/logs', keywords: 'logs history activity events audit' },
  { label: 'Reports & Exports', path: '/reports', keywords: 'reports export csv pdf excel attendance' },
  { label: 'System & Theme Settings', path: '/settings', keywords: 'settings theme color threshold config' },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { toggleSidebar } = useUIStore()
  const { systemMode, setSystemMode } = useSettingsStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const searchRef = useRef(null)
  const notifRef = useRef(null)

  const pathKey = Object.keys(PAGE_META).find((k) => location.pathname.startsWith(k)) || '/dashboard'
  const { title, breadcrumb } = PAGE_META[pathKey] || PAGE_META['/dashboard']

  const filteredRoutes = searchQuery.trim()
    ? QUICK_ROUTES.filter(
        (r) =>
          r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.keywords.includes(searchQuery.toLowerCase())
      )
    : []

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (_) {}
    logout()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  return (
    <header
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
      className="h-16 border-b flex items-center justify-between px-4 sm:px-6 lg:px-8 gap-4 shrink-0 z-10"
    >
      {/* Left: Page Title + Breadcrumb Context */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl text-theme-secondary hover:text-theme-primary hover:bg-white/[0.04] transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-bold text-theme-primary tracking-tight leading-snug truncate">
              {title}
            </h1>
            <span className="hidden sm:inline-block text-xs text-theme-secondary opacity-40">/</span>
            <span className="hidden sm:inline-block text-xs text-theme-secondary font-medium truncate">
              {breadcrumb}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Search, System Status, Notifications, User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick Navigation Search */}
        <div ref={searchRef} className="relative hidden md:block w-56 lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-secondary pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setSearchFocused(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredRoutes.length > 0) {
                navigate(filteredRoutes[0].path)
                setSearchQuery('')
                setSearchFocused(false)
              }
            }}
            placeholder="Search modules or logs..."
            style={{
              backgroundColor: 'var(--input-bg)',
              borderColor: 'var(--border)',
            }}
            className="w-full h-9 pl-9 pr-3 rounded-xl border text-xs text-theme-primary placeholder:text-theme-secondary/60 focus:outline-none focus:border-blue-500/50 transition-all"
          />

          {searchFocused && filteredRoutes.length > 0 && (
            <div
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
              className="absolute left-0 right-0 top-11 rounded-xl border shadow-2xl py-1.5 z-50"
            >
              {filteredRoutes.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path)
                    setSearchQuery('')
                    setSearchFocused(false)
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-theme-primary hover:bg-white/[0.06] flex items-center justify-between transition-colors"
                >
                  <span>{item.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-theme-secondary" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* System Status & Operational Mode Pill */}
        <button
          onClick={() => {
            const nextMode = systemMode === 'basic' ? 'advanced' : 'basic'
            setSystemMode(nextMode)
            toast.success(`Switched to ${nextMode === 'basic' ? 'Basic' : 'Enterprise AI'} mode`)
          }}
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-xl border text-xs font-medium text-theme-primary hover:border-blue-500/30 transition-all"
          title="Click to toggle Basic / Enterprise AI mode"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-theme-secondary text-[11px]">System:</span>
          <span className="font-semibold text-[11px] text-emerald-400">
            {systemMode === 'advanced' ? 'Enterprise AI' : 'Operational'}
          </span>
        </button>

        {/* Notifications Button & Dropdown */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((prev) => !prev)}
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            className="w-9 h-9 rounded-xl border flex items-center justify-center text-theme-secondary hover:text-theme-primary transition-colors relative"
            title="System Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
          </button>

          {notifOpen && (
            <div
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
              className="absolute right-0 top-11 w-72 rounded-2xl border shadow-2xl p-3.5 z-50 space-y-2.5"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className="text-xs font-semibold text-theme-primary">System Notifications</span>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <p className="font-medium text-theme-primary">Biometric Engine Ready</p>
                  <p className="text-[11px] text-theme-secondary mt-0.5">
                    InsightFace ArcFace + FAISS index operational
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNotifOpen(false)
                    navigate('/logs')
                  }}
                  className="w-full py-1.5 text-center text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View All Activity Logs →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Name */}
        <div
          style={{ borderColor: 'var(--border)' }}
          className="flex items-center gap-2.5 pl-2.5 border-l"
        >
          <div
            style={{
              backgroundColor: 'rgba(var(--primary-rgb), 0.14)',
              borderColor: 'rgba(var(--primary-rgb), 0.28)',
            }}
            className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold text-theme-primary shrink-0"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-theme-primary leading-tight">
              {user?.name || 'Aryan'}
            </p>
            <p className="text-[10px] text-theme-secondary capitalize leading-tight">
              {user?.role || 'Administrator'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-theme-secondary hover:text-rose-400 transition-colors sm:hidden"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
