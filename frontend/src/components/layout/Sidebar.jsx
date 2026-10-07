// Sidebar Navigation Component — Enterprise Biometric SaaS Design
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ScanFace, Shield, UserPlus, UserCheck,
  Users, FileText, HelpCircle, BarChart3, Settings,
  ChevronLeft, ChevronRight, Activity, LogOut, User
} from 'lucide-react'
import { useUIStore, useSettingsStore, useAuthStore } from '@/store'
import { authAPI } from '@/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const NAV_ITEMS = [
  { path: '/dashboard',           icon: LayoutDashboard, label: 'Dashboard',           group: 'overview' },
  { path: '/camera',              icon: ScanFace,        label: 'Face Recognition',    group: 'overview' },
  { path: '/login',               icon: Shield,          label: 'Face Login',          group: 'overview' },
  { path: '/registration',        icon: UserPlus,        label: 'Registration',        group: 'overview' },
  { path: '/employee-monitoring', icon: UserCheck,       label: 'Employee Monitoring', group: 'overview' },
  { path: '/users',               icon: Users,           label: 'Directory',           group: 'analytics' },
  { path: '/logs',                icon: FileText,        label: 'Activity Logs',       group: 'analytics' },
  { path: '/unknown',             icon: HelpCircle,      label: 'Unknown Faces',       group: 'analytics', advancedOnly: true },
  { path: '/reports',             icon: BarChart3,       label: 'Reports',             group: 'analytics' },
  { path: '/settings',            icon: Settings,        label: 'Settings',            group: 'system' },
]

const GROUP_LABELS = {
  overview: 'Biometric Core',
  analytics: 'Analytics & Records',
  system: 'Administration',
}

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { systemMode } = useSettingsStore()
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (systemMode === 'basic' && item.advancedOnly) {
      return false
    }
    return true
  })

  const groups = [...new Set(filteredNavItems.map((i) => i.group))]

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (_) {}
    logout()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 236 : 72 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
      className="relative flex flex-col h-full border-r overflow-hidden shrink-0 z-20 select-none"
    >
      {/* Brand Header */}
      <div
        style={{ borderColor: 'var(--border)' }}
        className="flex items-center gap-3 px-4 h-16 border-b shrink-0"
      >
        <div
          style={{ background: 'var(--btn-primary-bg)' }}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/15 shadow-sm"
        >
          <Shield className="w-4.5 h-4.5 text-white" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.14 }}
              className="overflow-hidden min-w-0"
            >
              <p className="text-theme-primary font-bold text-[15px] tracking-tight leading-tight">
                FACE IQ
              </p>
              <p className="text-theme-secondary text-[10px] uppercase tracking-widest font-medium">
                Biometric Security
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto no-scrollbar py-4 px-2.5 space-y-5">
        {groups.map((group) => (
          <div key={group}>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-semibold text-theme-secondary uppercase tracking-widest px-3 mb-1.5 opacity-75"
                >
                  {GROUP_LABELS[group]}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              {filteredNavItems
                .filter((i) => i.group === group)
                .map(({ path, icon: Icon, label }) => {
                  const isActive =
                    path === '/dashboard'
                      ? location.pathname === '/dashboard' || location.pathname === '/'
                      : location.pathname.startsWith(path)

                  return (
                    <NavLink
                      key={path}
                      to={path}
                      title={!sidebarOpen ? label : undefined}
                      className={clsx(
                        'nav-item group',
                        isActive && 'active',
                        !sidebarOpen && 'justify-center px-2'
                      )}
                    >
                      {/* Thin left accent indicator */}
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active-indicator"
                          style={{ backgroundColor: 'var(--primary)' }}
                          className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                        />
                      )}
                      <Icon
                        className={clsx(
                          'w-[18px] h-[18px] shrink-0 transition-colors duration-150',
                          isActive ? 'text-white' : 'text-theme-secondary group-hover:text-theme-primary'
                        )}
                      />
                      <AnimatePresence>
                        {sidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className="truncate"
                          >
                            {label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  )
                })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Footer: System Status + User Profile + Logout */}
      <div
        style={{ borderColor: 'var(--border)' }}
        className="p-2.5 border-t space-y-2 shrink-0"
      >
        {/* System Status Pill */}
        {sidebarOpen ? (
          <div
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            className="px-3 py-2 rounded-xl border flex items-center justify-between text-xs"
          >
            <span className="text-theme-secondary flex items-center gap-1.5 font-medium">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              System Status
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          </div>
        ) : (
          <div
            title="System Status: Online"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            className="h-9 rounded-xl border flex items-center justify-center"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        )}

        {/* User Profile + Logout */}
        <div
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          className={clsx(
            'rounded-xl border p-2 flex items-center gap-2.5',
            !sidebarOpen && 'flex-col justify-center py-2'
          )}
        >
          <div
            style={{ backgroundColor: 'rgba(var(--primary-rgb), 0.15)', borderColor: 'rgba(var(--primary-rgb), 0.3)' }}
            className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 text-xs font-bold text-theme-primary"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>

          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-theme-primary truncate leading-tight">
                {user?.name || 'Administrator'}
              </p>
              <p className="text-[10px] text-theme-secondary capitalize truncate">
                {user?.role || 'Admin'}
              </p>
            </div>
          )}

          <button
            onClick={handleLogout}
            title="Logout"
            className="p-1.5 rounded-lg text-theme-secondary hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={toggleSidebar}
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border flex items-center justify-center text-theme-secondary hover:text-theme-primary transition-all duration-150 z-30 shadow-md"
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
    </motion.aside>
  )
}
