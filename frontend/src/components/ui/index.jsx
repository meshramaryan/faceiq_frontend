// Shared UI Components — Sapphire Glass Theme
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Search } from 'lucide-react'

// ── StatCard ──────────────────────────────────────────────────────────────
export function StatCard({ title, value, subtitle, icon: Icon, color = 'primary', trend, loading }) {
  const colorMap = {
    primary: 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]',
    success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    danger:  'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]',
    accent:  'text-sky-400 bg-sky-500/10 border-sky-500/20 shadow-[0_0_15px_rgba(56,189,248,0.15)]',
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="card-hover p-5 animate-fade-in relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-300 pointer-events-none" />
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
          {loading ? (
            <div className="h-8 bg-slate-800/60 rounded-lg animate-pulse w-24" />
          ) : (
            <p className="text-3xl font-extrabold text-white tabular-nums tracking-tight">{value ?? '—'}</p>
          )}
          {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
          {trend !== undefined && (
            <div className={clsx('flex items-center gap-1 mt-2 text-xs font-semibold', trend >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              <span>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%</span>
              <span className="text-slate-500 font-normal">vs last period</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center border shrink-0', colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'gray' }) {
  const variants = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger:  'badge-danger',
    gray:    'badge-gray',
  }
  return <span className={variants[variant] || 'badge-gray'}>{children}</span>
}

// ── ConfidenceBar ─────────────────────────────────────────────────────────
export function ConfidenceBar({ value = 0, showLabel = true, size = 'md' }) {
  const pct = Math.min(Math.max(value * 100, 0), 100)
  const color = pct >= 70 ? 'conf-high' : pct >= 40 ? 'conf-medium' : 'conf-low'
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' }

  return (
    <div className="flex items-center gap-2">
      <div className={clsx('flex-1 bg-slate-800/80 border border-white/[0.06] rounded-full overflow-hidden', heights[size])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={clsx('h-full rounded-full shadow-sm', color)}
        />
      </div>
      {showLabel && <span className="text-xs font-mono font-semibold text-slate-300 w-10 text-right">{pct.toFixed(0)}%</span>}
    </div>
  )
}

// ── LoadingSpinner ────────────────────────────────────────────────────────
export function LoadingSpinner({ size = 'md', text }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-7 h-7', lg: 'w-10 h-10' }
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={clsx('border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin', sizes[size])} />
      {text && <p className="text-xs text-slate-400 font-medium tracking-wide">{text}</p>}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) {
  if (!isOpen) return null
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={clsx('modal-panel', maxWidth)}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#1a2438]/50">
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="btn-icon btn-ghost text-slate-400 hover:text-white">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </motion.div>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1
    if (page <= 4) return i + 1
    if (page >= totalPages - 3) return totalPages - 6 + i
    return page - 3 + i
  })

  return (
    <div className="flex items-center justify-center gap-1.5 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-30"
      >
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={clsx(
            'w-9 h-9 rounded-xl text-sm font-semibold transition-all',
            p === page
              ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md shadow-blue-500/30'
              : 'bg-[#1a2438] text-slate-400 hover:text-white hover:bg-slate-700/50'
          )}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-30"
      >
        ›
      </button>
    </div>
  )
}

// ── SearchBar ─────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={clsx('relative', className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-10"
      />
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
          <Icon className="w-8 h-8 text-blue-400" />
        </div>
      )}
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      {description && <p className="text-xs text-slate-400 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}
