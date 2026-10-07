// ThemeSelector — Premium 9-Theme Selection Page for Face IQ
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '@/store'
import { ArrowLeft, Check, Palette, Sparkles } from 'lucide-react'

/* ── Theme Definitions ──────────────────────────────────────────────────── */
const THEMES = [
  {
    id: 'dark-blue',
    name: 'Dark Blue',
    subtitle: 'Default',
    tag: 'Clean · Professional · Modern',
    description: 'Perfect for everyday use.',
    primary: '#1677FF',
    accent: '#38BDF8',
    bg: '#050B14',
    surface: '#0B1626',
    card: '#0F2035',
    swatches: ['#1677FF', '#38BDF8', '#0B1626', '#0F2035'],
    gradient: 'linear-gradient(135deg, #1677FF, #38BDF8)',
    chartLine: '#1677FF',
    chartBar: '#38BDF8',
  },
  {
    id: 'purple',
    name: 'Purple',
    subtitle: 'Elegant',
    tag: 'Stylish · Premium · Modern',
    description: 'Gives a luxurious feel.',
    primary: '#8B5CF6',
    accent: '#A78BFA',
    bg: '#080612',
    surface: '#151024',
    card: '#1B1430',
    swatches: ['#8B5CF6', '#A78BFA', '#151024', '#1B1430'],
    gradient: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
    chartLine: '#8B5CF6',
    chartBar: '#A78BFA',
  },
  {
    id: 'green',
    name: 'Green',
    subtitle: 'Nature + Tech',
    tag: 'Fresh · Calm · Focused',
    description: 'Great for productivity.',
    primary: '#10B981',
    accent: '#34D399',
    bg: '#04100D',
    surface: '#081D18',
    card: '#0B2820',
    swatches: ['#10B981', '#34D399', '#081D18', '#0B2820'],
    gradient: 'linear-gradient(135deg, #059669, #34D399)',
    chartLine: '#10B981',
    chartBar: '#34D399',
  },
  {
    id: 'amber',
    name: 'Amber',
    subtitle: 'Warm + Energetic',
    tag: 'Warm · Friendly · Vibrant',
    description: 'Feels inviting and active.',
    primary: '#F59E0B',
    accent: '#FBBF24',
    bg: '#0D0903',
    surface: '#211506',
    card: '#2A1A08',
    swatches: ['#F59E0B', '#FBBF24', '#211506', '#2A1A08'],
    gradient: 'linear-gradient(135deg, #D97706, #FBBF24)',
    chartLine: '#F59E0B',
    chartBar: '#FBBF24',
  },
  {
    id: 'teal',
    name: 'Teal',
    subtitle: 'Calm + Minimal',
    tag: 'Clean · Minimal · Refreshing',
    description: 'Easy on the eyes.',
    primary: '#14B8A6',
    accent: '#2DD4BF',
    bg: '#03100F',
    surface: '#071C1A',
    card: '#092522',
    swatches: ['#14B8A6', '#2DD4BF', '#071C1A', '#092522'],
    gradient: 'linear-gradient(135deg, #0D9488, #2DD4BF)',
    chartLine: '#14B8A6',
    chartBar: '#2DD4BF',
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    subtitle: 'Premium + Soft',
    tag: 'Elegant · Classy · Modern',
    description: 'A premium touch.',
    primary: '#F472B6',
    accent: '#FB7185',
    bg: '#10070C',
    surface: '#21111B',
    card: '#2A1522',
    swatches: ['#F472B6', '#FB7185', '#21111B', '#2A1522'],
    gradient: 'linear-gradient(135deg, #EC4899, #FB7185)',
    chartLine: '#F472B6',
    chartBar: '#FB7185',
  },
  {
    id: 'light',
    name: 'Light',
    subtitle: 'Clean + Modern',
    tag: 'Minimal · Fresh · Professional',
    description: 'Great for daytime use.',
    primary: '#2563EB',
    accent: '#3B82F6',
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    card: '#F1F5F9',
    swatches: ['#2563EB', '#3B82F6', '#F1F5F9', '#E2E8F0'],
    gradient: 'linear-gradient(135deg, #2563EB, #3B82F6)',
    chartLine: '#2563EB',
    chartBar: '#3B82F6',
    isLight: true,
  },
  {
    id: 'indigo',
    name: 'Indigo',
    subtitle: 'Deep + Rich',
    tag: 'Bold · Premium · Focused',
    description: 'Perfect for high-end setups.',
    primary: '#6366F1',
    accent: '#818CF8',
    bg: '#070817',
    surface: '#11142A',
    card: '#171A35',
    swatches: ['#6366F1', '#818CF8', '#11142A', '#171A35'],
    gradient: 'linear-gradient(135deg, #4F46E5, #818CF8)',
    chartLine: '#6366F1',
    chartBar: '#818CF8',
  },
  {
    id: 'gradient',
    name: 'Gradient',
    subtitle: 'Modern + Unique',
    tag: 'Trendy · Vibrant · Premium',
    description: 'Stands out beautifully.',
    primary: '#EC4899',
    accent: '#3B82F6',
    bg: '#050816',
    surface: '#10152A',
    card: '#151B35',
    swatches: ['#EC4899', '#3B82F6', '#10152A', '#151B35'],
    gradient: 'linear-gradient(135deg, #EC4899, #3B82F6)',
    chartLine: '#EC4899',
    chartBar: '#3B82F6',
  },
]

/* ── Mini Dashboard Preview ─────────────────────────────────────────────── */
function MiniPreview({ theme }) {
  const textColor = theme.isLight ? '#0F172A' : '#FFFFFF'
  const mutedColor = theme.isLight ? '#64748B' : '#94A3B8'
  const borderColor = theme.isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'

  const bars = [45, 70, 55, 85, 60, 78, 90]

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: theme.bg, border: `1px solid ${borderColor}` }}
    >
      {/* Mini Navbar */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ background: theme.surface, borderBottom: `1px solid ${borderColor}` }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ background: theme.gradient }} />
          <div className="text-[8px] font-bold" style={{ color: textColor }}>Face IQ</div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-12 h-2 rounded-full" style={{ background: theme.card }} />
          <div className="w-5 h-5 rounded-full" style={{ background: theme.gradient }} />
        </div>
      </div>

      {/* Mini Content Area */}
      <div className="flex" style={{ height: '100px' }}>
        {/* Sidebar */}
        <div
          className="w-16 flex flex-col gap-1 p-2"
          style={{ background: theme.surface, borderRight: `1px solid ${borderColor}` }}
        >
          {['Dashboard', 'Camera', 'Users', 'Reports', 'Settings'].map((item, i) => (
            <div
              key={i}
              className="rounded px-1.5 py-0.5 text-[6px]"
              style={{
                background: i === 0 ? theme.gradient : 'transparent',
                color: i === 0 ? '#fff' : mutedColor,
              }}
            >
              {item}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-2 space-y-1.5">
          {/* Stat Row */}
          <div className="grid grid-cols-4 gap-1">
            {['248', '1,842', '98.6%', '42'].map((v, i) => (
              <div
                key={i}
                className="rounded p-1 text-center"
                style={{ background: theme.card, border: `1px solid ${borderColor}` }}
              >
                <div className="text-[7px] font-bold" style={{ color: textColor }}>{v}</div>
                <div className="w-full h-0.5 rounded mt-0.5" style={{ background: theme.primary, opacity: 0.7 }} />
              </div>
            ))}
          </div>

          {/* Mini Chart */}
          <div
            className="rounded p-2 flex items-end gap-0.5 justify-center"
            style={{ background: theme.card, border: `1px solid ${borderColor}`, height: '44px' }}
          >
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${(h / 100) * 28}px`,
                  background: i % 2 === 0 ? theme.chartLine : theme.chartBar,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Theme Card ─────────────────────────────────────────────────────────── */
function ThemeCard({ theme, isActive, onApply }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
      style={{
        background: `linear-gradient(145deg, ${theme.card}F0, ${theme.surface}F8)`,
        border: isActive
          ? `2px solid ${theme.primary}`
          : `1px solid rgba(255,255,255,0.08)`,
        boxShadow: isActive
          ? `0 0 0 4px ${theme.primary}25, 0 8px 32px ${theme.primary}30`
          : hovered
          ? `0 8px 28px rgba(0,0,0,0.3)`
          : `0 2px 12px rgba(0,0,0,0.2)`,
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onApply}
    >
      {/* Active badge */}
      {isActive && (
        <div
          className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: theme.gradient }}
        >
          <Check className="w-4 h-4 text-white" strokeWidth={3} />
        </div>
      )}

      {/* Card content */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3
                className="font-bold text-sm"
                style={{ color: theme.isLight ? '#0F172A' : '#FFFFFF' }}
              >
                {theme.name}
              </h3>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: `${theme.primary}20`,
                  color: theme.primary,
                  border: `1px solid ${theme.primary}30`,
                }}
              >
                {theme.subtitle}
              </span>
            </div>
            <p
              className="text-[10px] mt-0.5"
              style={{ color: theme.isLight ? '#64748B' : '#94A3B8' }}
            >
              {theme.tag}
            </p>
          </div>
        </div>

        {/* Color Swatches */}
        <div className="flex gap-1.5 items-center">
          {theme.swatches.map((c, i) => (
            <div
              key={i}
              className="rounded-full border-2 transition-transform"
              style={{
                width: i < 2 ? '18px' : '14px',
                height: i < 2 ? '18px' : '14px',
                backgroundColor: c,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
          <div className="ml-auto text-[9px]" style={{ color: theme.isLight ? '#64748B' : '#64748B' }}>
            {theme.primary}
          </div>
        </div>

        {/* Mini Dashboard Preview */}
        <MiniPreview theme={theme} />

        {/* Description + Apply */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px]" style={{ color: theme.isLight ? '#64748B' : '#94A3B8' }}>
            {theme.description}
          </p>
          <button
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95"
            style={{
              background: isActive ? theme.gradient : `${theme.primary}18`,
              color: isActive ? '#FFFFFF' : theme.primary,
              border: `1px solid ${theme.primary}30`,
            }}
            onClick={(e) => { e.stopPropagation(); onApply() }}
          >
            {isActive ? '✓ Active' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── ThemeSelector Page ──────────────────────────────────────────────────── */
export default function ThemeSelector() {
  const navigate = useNavigate()
  const { theme: activeTheme, setTheme } = useSettingsStore()
  const [applying, setApplying] = useState(null)

  const handleApply = (themeId) => {
    setApplying(themeId)
    setTheme(themeId)
    // Brief animation delay
    setTimeout(() => setApplying(null), 600)
  }

  const activeThemeData = THEMES.find(t => t.id === activeTheme) || THEMES[0]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/settings')}
          className="btn-ghost w-9 h-9 p-0 rounded-xl flex items-center justify-center"
          style={{ border: '1px solid var(--border)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h2 className="section-title text-xl">Appearance &amp; Themes</h2>
          </div>
          <p className="section-subtitle">
            Choose your preferred visual style. Changes apply instantly across all pages.
          </p>
        </div>
      </div>

      {/* Active Theme Banner */}
      <div
        className="rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden"
        style={{
          background: activeThemeData.card,
          border: `1px solid ${activeThemeData.primary}40`,
          boxShadow: `0 0 0 1px ${activeThemeData.primary}20, 0 4px 24px ${activeThemeData.primary}18`,
        }}
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ background: activeThemeData.gradient }}
        />
        {/* Sparkle icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 relative z-10"
          style={{ background: activeThemeData.gradient, boxShadow: `0 4px 16px ${activeThemeData.primary}40` }}
        >
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="relative z-10 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: activeThemeData.primary }}>
            Currently Active
          </p>
          <h3
            className="font-bold text-lg"
            style={{ color: activeThemeData.isLight ? '#0F172A' : '#FFFFFF' }}
          >
            {activeThemeData.name}
            <span className="ml-2 text-sm font-normal" style={{ color: activeThemeData.isLight ? '#64748B' : '#94A3B8' }}>
              — {activeThemeData.tag}
            </span>
          </h3>
          <p className="text-xs mt-0.5" style={{ color: activeThemeData.isLight ? '#64748B' : '#94A3B8' }}>
            {activeThemeData.description}
          </p>
        </div>
        {/* Color swatches row */}
        <div className="flex gap-1.5 relative z-10">
          {activeThemeData.swatches.map((c, i) => (
            <div key={i} className="w-6 h-6 rounded-full border-2 border-white/20" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      {/* Theme Grid — 3 cols desktop, 2 tablet, 1 mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {THEMES.map(theme => (
          <div
            key={theme.id}
            className={applying === theme.id ? 'animate-theme-pop' : ''}
          >
            <ThemeCard
              theme={theme}
              isActive={activeTheme === theme.id}
              onApply={() => handleApply(theme.id)}
            />
          </div>
        ))}
      </div>

      {/* Bottom Color Palette Overview */}
      <div
        className="card p-6 space-y-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <h3 className="font-semibold flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
          <Palette className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          Color Palette Overview
        </h3>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Mix, match or use these combinations to build your perfect dashboard.
        </p>
        <div className="flex flex-wrap gap-4">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => handleApply(t.id)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className="w-10 h-10 rounded-full border-4 transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg"
                style={{
                  background: t.gradient,
                  borderColor: activeTheme === t.id ? t.primary : 'rgba(255,255,255,0.15)',
                  boxShadow: activeTheme === t.id ? `0 0 0 2px ${t.primary}50` : undefined,
                }}
              />
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t.name}
              </span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                {t.primary}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
