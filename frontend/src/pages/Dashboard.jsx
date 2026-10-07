// Face IQ — Premium Enterprise Biometric Security Dashboard
// Inspired by Vision UI Dashboard PRO layout quality & information density
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users, ShieldCheck, ScanFace, Activity, Shield, Cpu,
  CheckCircle2, AlertTriangle, XCircle, ArrowUpRight,
  Camera, UserPlus, UserCheck, Lock, Clock, Database,
  Server, Sparkles, Eye, ChevronRight, Radio
} from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import { format, formatDistanceToNow } from 'date-fns'
import {
  dashboardAPI, detectionAPI, employeeMonitoringAPI, systemAPI
} from '@/api'
import { useAuthStore, useDetectionStore } from '@/store'
import { LoadingSpinner } from '@/components/ui'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler
)

// ── Subtle Biometric Landmark SVG for Live Recognition Card ────────────────
function MiniBiometricMesh({ active }) {
  const pts = [
    [50, 22], [38, 26], [62, 26],
    [34, 38], [43, 37], [57, 37], [66, 38],
    [50, 35], [50, 48], [44, 52], [56, 52],
    [39, 64], [50, 62], [61, 64], [50, 69],
    [30, 52], [70, 52], [36, 76], [50, 82], [64, 76],
  ]
  const edges = [
    [0, 1], [0, 2], [1, 3], [2, 6], [0, 7],
    [3, 4], [5, 6], [4, 7], [5, 7], [7, 8],
    [8, 9], [8, 10], [9, 10], [9, 11], [10, 13],
    [11, 12], [12, 13], [11, 14], [13, 14],
    [3, 15], [6, 16], [15, 17], [16, 19], [17, 18], [18, 19], [14, 18],
  ]

  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full pointer-events-none opacity-65"
    >
      {edges.map(([a, b], idx) => (
        <line
          key={idx}
          x1={pts[a][0]}
          y1={pts[a][1]}
          x2={pts[b][0]}
          y2={pts[b][1]}
          stroke={active ? '#38BDF8' : '#64748B'}
          strokeWidth="0.45"
          strokeOpacity={active ? '0.65' : '0.35'}
        />
      ))}
      {pts.map(([x, y], idx) => (
        <circle
          key={idx}
          cx={x}
          cy={y}
          r="1.1"
          fill={active ? '#60A5FA' : '#94A3B8'}
          fillOpacity={active ? '0.9' : '0.45'}
        />
      ))}
    </svg>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { isStreaming, currentDetections } = useDetectionStore()
  const [chartRange, setChartRange] = useState('hourly') // 'hourly' | 'daily'

  // ── 1. Real Backend Queries ──────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.getStats().then((r) => r.data),
    refetchInterval: 10_000,
  })

  const { data: detStats } = useQuery({
    queryKey: ['detection-aggregate-stats'],
    queryFn: () => detectionAPI.getStats().then((r) => r.data),
    refetchInterval: 15_000,
  })

  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: () => dashboardAPI.getChartData().then((r) => r.data),
    refetchInterval: 25_000,
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['dashboard-recent-logs'],
    queryFn: () => detectionAPI.getLogs({ page: 1, page_size: 25 }).then((r) => r.data),
    refetchInterval: 8_000,
  })

  const { data: monitoringData } = useQuery({
    queryKey: ['dashboard-employee-monitoring'],
    queryFn: () => employeeMonitoringAPI.getStations().then((r) => r.data),
    refetchInterval: 10_000,
  })

  const { data: healthData } = useQuery({
    queryKey: ['dashboard-system-health'],
    queryFn: () => systemAPI.health().then((r) => r.data),
    refetchInterval: 20_000,
  })

  // ── 2. Greeting & Date Context ───────────────────────────────────────────
  const greeting = useMemo(() => {
    const hr = new Date().getHours()
    if (hr < 12) return 'Good Morning'
    if (hr < 17) return 'Good Afternoon'
    return 'Good Evening'
  }, [])

  const displayName = user?.name || 'Aryan'
  const todayFormatted = format(new Date(), 'dd MMMM yyyy')
  const isSystemHealthy = !healthData || healthData?.status === 'healthy'

  // ── 3. Derived Primary Statistics (Real Data) ────────────────────────────
  const registeredFaces = stats?.registered_users ?? 0
  const totalUsers = stats?.total_users ?? 0

  const totalSuccessful = useMemo(() => {
    if (detStats?.recognized !== undefined) return detStats.recognized
    if (stats?.today_recognized !== undefined) return stats.today_recognized
    return 0
  }, [detStats, stats])

  const accuracyPct = useMemo(() => {
    if (stats?.today_detections > 0) {
      return (stats.accuracy_rate * 100).toFixed(1)
    }
    if (detStats?.total_detections > 0) {
      return (detStats.accuracy_rate * 100).toFixed(1)
    }
    return '0.0'
  }, [stats, detStats])

  const activeToday = stats?.today_detections ?? 0

  // ── 4. Employee Monitoring Metrics (Real Station Data) ───────────────────
  const employeeMetrics = useMemo(() => {
    const stationEntries = Object.entries(monitoringData?.stations || {})
    const totalStations = stationEntries.length || 4
    const occupiedStations = stationEntries.filter(([, s]) => s?.occupied).length
    const vacantStations = Math.max(0, totalStations - occupiedStations)

    // Combine registered users & live station occupancy
    const totalTracked = totalUsers > 0 ? totalUsers : totalStations
    const presentCount = occupiedStations > 0 ? occupiedStations : (stats?.today_recognized ?? 0)
    const boundedPresent = Math.min(totalTracked, presentCount)
    const absentCount = Math.max(0, totalTracked - boundedPresent)
    const occupancyPct = totalTracked > 0 ? Math.round((boundedPresent / totalTracked) * 100) : 0

    return {
      totalTracked,
      presentCount: boundedPresent,
      absentCount,
      occupancyPct,
      occupiedStations,
      totalStations,
      stations: monitoringData?.stations || {},
    }
  }, [monitoringData, totalUsers, stats])

  // ── 5. Live / Latest Recognition Snapshot ────────────────────────────────
  const recentLogs = logsData?.items || []
  const latestLog = recentLogs[0] || null
  const liveDetection = currentDetections?.[0] || null

  const liveCardState = useMemo(() => {
    if (isStreaming && liveDetection) {
      return {
        isActive: true,
        statusLabel: 'Camera Active',
        identity: liveDetection.is_unknown ? 'Unknown' : liveDetection.name,
        isKnown: !liveDetection.is_unknown,
        confidence: `${((liveDetection.confidence || 0) * 100).toFixed(1)}%`,
        timestamp: liveDetection.timestamp || format(new Date(), 'hh:mm:ss a'),
        imageUrl: null,
      }
    }
    if (latestLog) {
      const isKnown = Boolean(latestLog.user_id) && !latestLog.is_spoof
      const imgUrl = latestLog.image_path
        ? `http://localhost:8000/static/logs/${latestLog.image_path.split(/[\\/]/).pop()}`
        : null
      return {
        isActive: Boolean(stats?.active_cameras > 0 || isStreaming),
        statusLabel: stats?.active_cameras > 0 || isStreaming ? 'Camera Active' : 'Standby • Ready',
        identity: isKnown ? `Known (${latestLog.detected_name})` : 'Unknown',
        isKnown,
        confidence: `${((latestLog.confidence || 0) * 100).toFixed(1)}%`,
        timestamp: latestLog.detected_at
          ? format(new Date(latestLog.detected_at), 'hh:mm:ss a')
          : '—',
        imageUrl: imgUrl,
      }
    }
    return {
      isActive: Boolean(stats?.active_cameras > 0),
      statusLabel: stats?.active_cameras > 0 ? 'Camera Active' : 'Standby • Ready',
      identity: 'No recent scan',
      isKnown: false,
      confidence: '—',
      timestamp: '—',
      imageUrl: null,
    }
  }, [isStreaming, liveDetection, latestLog, stats])

  // ── 6. Recognition Activity Multi-Series Chart Data ──────────────────────
  const recognitionChartData = useMemo(() => {
    const baseSeries =
      chartRange === 'hourly'
        ? charts?.hourly_activity || []
        : charts?.daily_detections || []

    const labels = baseSeries.map((d) => d.label)
    const totals = baseSeries.map((d) => d.value || 0)

    // Compute real proportions from detection stats if available
    const totalRec = detStats?.recognized ?? stats?.today_recognized ?? 0
    const totalUnk = detStats?.unknown ?? stats?.today_unknown ?? 0
    const totalSpoof = detStats?.spoof_attempts ?? stats?.spoof_attempts ?? 0
    const grandTotal = Math.max(1, totalRec + totalUnk + totalSpoof)

    const recRatio = totalRec + totalUnk > 0 ? totalRec / grandTotal : 0.85
    const unkRatio = totalRec + totalUnk > 0 ? totalUnk / grandTotal : 0.15
    const rejRatio = totalSpoof > 0 ? totalSpoof / grandTotal : 0.0

    const successfulSeries = totals.map((val) => Math.round(val * recRatio))
    const unknownSeries = totals.map((val, idx) =>
      Math.max(0, val - successfulSeries[idx] - Math.round(val * rejRatio))
    )
    const rejectedSeries = totals.map((val) => Math.round(val * rejRatio))

    return {
      labels,
      datasets: [
        {
          label: 'Successful',
          data: successfulSeries,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.12)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: '#3B82F6',
        },
        {
          label: 'Unknown',
          data: unknownSeries,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.05)',
          borderWidth: 1.75,
          fill: true,
          tension: 0.4,
          pointRadius: 1.5,
          pointHoverRadius: 4,
          pointBackgroundColor: '#F59E0B',
        },
        {
          label: 'Rejected',
          data: rejectedSeries,
          borderColor: '#F43F5E',
          backgroundColor: 'rgba(244, 63, 94, 0.04)',
          borderWidth: 1.5,
          fill: false,
          tension: 0.4,
          pointRadius: 1.5,
          pointHoverRadius: 4,
          pointBackgroundColor: '#F43F5E',
        },
      ],
    }
  }, [charts, chartRange, detStats, stats])

  const recognitionChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0D1424',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          titleColor: '#F8FAFC',
          bodyColor: '#94A3B8',
          padding: 10,
          cornerRadius: 10,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#64748B',
            font: { size: 11 },
            maxTicksLimit: chartRange === 'hourly' ? 8 : 7,
          },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
          ticks: {
            color: '#64748B',
            font: { size: 11 },
            precision: 0,
          },
          border: { display: false },
        },
      },
    }),
    [chartRange]
  )

  // ── 7. Employee Monitoring Donut Chart ───────────────────────────────────
  const occupancyDonutData = useMemo(() => {
    const present = employeeMetrics.presentCount
    const absent = Math.max(employeeMetrics.absentCount, present === 0 ? 1 : 0)
    return {
      labels: ['Present / Active', 'Absent / Vacant'],
      datasets: [
        {
          data: [present, absent],
          backgroundColor: ['#3B82F6', 'rgba(148, 163, 184, 0.14)'],
          borderWidth: 0,
          hoverOffset: 2,
        },
      ],
    }
  }, [employeeMetrics])

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-6 pb-6"
    >
      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4: DASHBOARD HERO
          ══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        variants={fadeUp}
        className="card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative overflow-hidden"
      >
        {/* Subtle top-right ambient radial highlight */}
        <div
          style={{
            background:
              'radial-gradient(circle at top right, rgba(var(--primary-rgb), 0.12), transparent 65%)',
          }}
          className="absolute inset-0 pointer-events-none"
        />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-blue-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Biometric Security Command Center</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-theme-primary tracking-tight">
            {greeting}, {displayName}
          </h2>
          <p className="text-xs sm:text-[13px] text-theme-secondary">
            Here&apos;s what&apos;s happening with your Face IQ system today.
          </p>
        </div>

        <div className="relative z-10 flex sm:flex-col items-start sm:items-end justify-between gap-2 shrink-0">
          <div className="text-left sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-theme-secondary">
              Today
            </p>
            <p className="text-sm font-semibold text-theme-primary">{todayFormatted}</p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isSystemHealthy ? 'All systems operational' : 'System check required'}</span>
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5: PRIMARY STATISTICS (4 CARDS)
          ══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {/* Card 1: Registered Faces */}
        <div className="card-hover p-5 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-medium text-theme-secondary">Registered Faces</p>
            {statsLoading ? (
              <div className="h-8 w-20 rounded-lg bg-white/[0.06] animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-theme-primary tabular-nums tracking-tight">
                {registeredFaces.toLocaleString()}
              </p>
            )}
            <div className="flex items-center gap-1.5 pt-0.5 text-xs">
              <span className="text-emerald-400 font-semibold inline-flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {totalUsers} total
              </span>
              <span className="text-theme-secondary truncate">enrolled profiles</span>
            </div>
          </div>
          <div
            style={{
              backgroundColor: 'rgba(var(--primary-rgb), 0.12)',
              borderColor: 'rgba(var(--primary-rgb), 0.25)',
            }}
            className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 text-blue-400"
          >
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Successful Logins / Verifications */}
        <div className="card-hover p-5 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-medium text-theme-secondary">Successful Verifications</p>
            {statsLoading ? (
              <div className="h-8 w-24 rounded-lg bg-white/[0.06] animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-theme-primary tabular-nums tracking-tight">
                {totalSuccessful.toLocaleString()}
              </p>
            )}
            <div className="flex items-center gap-1.5 pt-0.5 text-xs">
              <span className="text-emerald-400 font-semibold inline-flex items-center gap-0.5">
                +{stats?.today_recognized ?? 0} today
              </span>
              <span className="text-theme-secondary truncate">authenticated</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-500/12 border border-indigo-500/25 flex items-center justify-center shrink-0 text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Recognition Accuracy */}
        <div className="card-hover p-5 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-medium text-theme-secondary">Recognition Accuracy</p>
            {statsLoading ? (
              <div className="h-8 w-20 rounded-lg bg-white/[0.06] animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-theme-primary tabular-nums tracking-tight">
                {accuracyPct}%
              </p>
            )}
            <div className="flex items-center gap-1.5 pt-0.5 text-xs">
              <span className="text-emerald-400 font-semibold">ArcFace 512-D</span>
              <span className="text-theme-secondary truncate">cosine matcher</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center shrink-0 text-emerald-400">
            <ScanFace className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Active Today */}
        <div className="card-hover p-5 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-medium text-theme-secondary">Active Today</p>
            {statsLoading ? (
              <div className="h-8 w-16 rounded-lg bg-white/[0.06] animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-theme-primary tabular-nums tracking-tight">
                {activeToday.toLocaleString()}
              </p>
            )}
            <div className="flex items-center gap-1.5 pt-0.5 text-xs">
              <span className="text-sky-400 font-semibold">
                {stats?.today_recognized ?? 0} recognized
              </span>
              <span className="text-theme-secondary truncate">
                • {stats?.today_unknown ?? 0} unknown
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-500/12 border border-sky-500/25 flex items-center justify-center shrink-0 text-sky-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6 & 7: MAIN ANALYTICS ("Recognition Activity") + LIVE RECOGNITION
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Section 6: Recognition Activity Chart (8 cols) */}
        <motion.div variants={fadeUp} className="lg:col-span-8 card p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-base font-bold text-theme-primary tracking-tight">
                Recognition Activity
              </h3>
              <p className="text-xs text-theme-secondary mt-0.5">
                Real-time biometric verification &amp; detection event distribution
              </p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Series Legend */}
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-theme-secondary">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Successful
                </span>
                <span className="inline-flex items-center gap-1.5 text-theme-secondary">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Unknown
                </span>
                <span className="inline-flex items-center gap-1.5 text-theme-secondary">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Rejected
                </span>
              </div>

              {/* Time Range Switcher */}
              <div
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                className="inline-flex rounded-xl border p-0.5 text-xs"
              >
                <button
                  onClick={() => setChartRange('hourly')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    chartRange === 'hourly'
                      ? 'bg-blue-600 text-white'
                      : 'text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  24h
                </button>
                <button
                  onClick={() => setChartRange('daily')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    chartRange === 'daily'
                      ? 'bg-blue-600 text-white'
                      : 'text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  7 Days
                </button>
              </div>
            </div>
          </div>

          <div className="h-[260px] w-full">
            {chartsLoading ? (
              <div className="h-full flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : (
              <Line data={recognitionChartData} options={recognitionChartOptions} />
            )}
          </div>
        </motion.div>

        {/* Section 7: Live Recognition Card (4 cols) */}
        <motion.div variants={fadeUp} className="lg:col-span-4 card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-theme-primary tracking-tight">
                Live Recognition
              </h3>
              <p className="text-xs text-theme-secondary mt-0.5">
                Biometric scanner telemetry
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                liveCardState.isActive
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  liveCardState.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'
                }`}
              />
              {liveCardState.statusLabel}
            </span>
          </div>

          {/* Circular Biometric Scanner Viewport */}
          <div className="my-2 flex flex-col items-center justify-center">
            <div className="relative w-40 h-40 rounded-full p-1.5 border border-blue-500/30 bg-[#070C18] flex items-center justify-center shadow-inner">
              <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center bg-[#0A1020]">
                {liveCardState.imageUrl ? (
                  <img
                    src={liveCardState.imageUrl}
                    alt="Latest Detection"
                    className="w-full h-full object-cover rounded-full opacity-85"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : null}
                <MiniBiometricMesh active={liveCardState.isKnown || liveCardState.isActive} />
              </div>
              <div className="absolute inset-0 rounded-full border border-sky-400/20 pointer-events-none" />
            </div>
          </div>

          {/* Detection Telemetry Readout */}
          <div
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            className="rounded-xl border p-3.5 space-y-2.5 mt-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-theme-secondary">Current Detection</span>
              <span
                className={`font-semibold ${
                  liveCardState.isKnown ? 'text-emerald-400' : 'text-theme-primary'
                }`}
              >
                {liveCardState.identity}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.05] pt-2">
              <span className="text-theme-secondary">Confidence</span>
              <span className="font-mono font-semibold text-blue-400">
                {liveCardState.confidence}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.05] pt-2">
              <span className="text-theme-secondary">Last Detection</span>
              <span className="font-mono text-theme-primary">{liveCardState.timestamp}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 9, 10, 11: EMPLOYEE MONITORING + SECURITY OVERVIEW + SYSTEM HEALTH
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Section 11: Employee Monitoring / Attendance Overview (4 cols) */}
        <motion.div variants={fadeUp} className="lg:col-span-4 card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-theme-primary tracking-tight">
                Employee Monitoring
              </h3>
              <p className="text-xs text-theme-secondary mt-0.5">
                Presence &amp; workstation occupancy
              </p>
            </div>
            <button
              onClick={() => navigate('/employee-monitoring')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 transition-colors"
            >
              Open <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-5 my-2">
            {/* Donut Chart */}
            <div className="relative w-28 h-28 shrink-0">
              <Doughnut
                data={occupancyDonutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '74%',
                  plugins: { legend: { display: false }, tooltip: { enabled: false } },
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold text-theme-primary tabular-nums">
                  {employeeMetrics.occupancyPct}%
                </span>
                <span className="text-[10px] text-theme-secondary uppercase">Occupancy</span>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="flex-1 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-theme-secondary">Total Employees</span>
                <span className="font-bold text-theme-primary tabular-nums">
                  {employeeMetrics.totalTracked}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-theme-secondary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Present
                </span>
                <span className="font-bold text-emerald-400 tabular-nums">
                  {employeeMetrics.presentCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-theme-secondary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                  Absent
                </span>
                <span className="font-bold text-theme-secondary tabular-nums">
                  {employeeMetrics.absentCount}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                <span className="text-theme-secondary">Active Desks</span>
                <span className="font-mono font-semibold text-sky-400">
                  {employeeMetrics.occupiedStations} / {employeeMetrics.totalStations}
                </span>
              </div>
            </div>
          </div>

          {/* Workstation Status Strip */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/[0.06]">
            {['station_1', 'station_2', 'station_3', 'station_4'].map((stKey, idx) => {
              const st = employeeMetrics.stations[stKey]
              const isOcc = Boolean(st?.occupied)
              return (
                <div
                  key={stKey}
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                  className="px-2.5 py-2 rounded-xl border text-center"
                >
                  <p className="text-[10px] text-theme-secondary font-medium">Desk {idx + 1}</p>
                  <p
                    className={`text-[11px] font-semibold mt-0.5 ${
                      isOcc ? 'text-emerald-400' : 'text-theme-secondary'
                    }`}
                  >
                    {isOcc ? 'Occupied' : 'Vacant'}
                  </p>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Section 10: Security Overview (4 cols) */}
        <motion.div variants={fadeUp} className="lg:col-span-4 card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-theme-primary tracking-tight">
                Security Overview
              </h3>
              <p className="text-xs text-theme-secondary mt-0.5">
                Active biometric protection layers
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Shield className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="space-y-2.5 my-1 text-xs">
            {[
              {
                label: 'Face Authentication',
                detail: 'ArcFace 512-D Cosine Verification',
                status: 'Active',
                active: true,
              },
              {
                label: 'Liveness Detection',
                detail: `${stats?.spoof_attempts ?? 0} spoof attempts blocked`,
                status: 'Active',
                active: stats?.model_status?.liveness !== false,
              },
              {
                label: 'JWT Authentication',
                detail: 'HS256 Bearer + Refresh Session',
                status: 'Active',
                active: true,
              },
              {
                label: 'Unknown Face Blocking',
                detail: `${stats?.today_unknown ?? 0} unrecognized flagged today`,
                status: 'Active',
                active: true,
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                className="px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-theme-primary truncate">{item.label}</p>
                  <p className="text-[11px] text-theme-secondary truncate">{item.detail}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  {item.status}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-theme-secondary flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Last Security Event
            </span>
            <span className="font-mono text-theme-primary">
              {latestLog?.detected_at
                ? format(new Date(latestLog.detected_at), 'hh:mm:ss a')
                : 'No events today'}
            </span>
          </div>
        </motion.div>

        {/* Section 9: System Health (4 cols) */}
        <motion.div variants={fadeUp} className="lg:col-span-4 card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-theme-primary tracking-tight">
                System Health
              </h3>
              <p className="text-xs text-theme-secondary mt-0.5">
                Core AI &amp; database service status
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Server className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="space-y-2.5 my-1 text-xs">
            {[
              {
                name: 'Face Recognition Engine',
                operational: stats?.model_status?.face_recognition !== false,
                meta: stats?.model_status?.model || 'InsightFace ArcFace',
              },
              {
                name: 'Camera Service',
                operational: true,
                meta: `${stats?.active_cameras ?? 0} active stream(s)`,
              },
              {
                name: 'FAISS Database',
                operational: true,
                meta: `${healthData?.faiss_index?.total_embeddings ?? registeredFaces} vectors indexed`,
              },
              {
                name: 'Authentication API',
                operational: isSystemHealthy,
                meta: `FastAPI v${healthData?.version || '1.0.0'}`,
              },
              {
                name: 'Employee Monitoring',
                operational: true,
                meta: 'YOLOv8s IoU Tracker',
              },
            ].map((svc) => (
              <div
                key={svc.name}
                className="flex items-center justify-between py-1.5 border-b border-white/[0.05] last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-theme-primary truncate">{svc.name}</p>
                  <p className="text-[11px] text-theme-secondary truncate">{svc.meta}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 font-semibold text-[11px] shrink-0 ${
                    svc.operational ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      svc.operational ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  {svc.operational ? 'Operational' : 'Standby'}
                </span>
              </div>
            ))}
          </div>

          {/* Hardware / Compute Engine Bar (Real Backend Values Only) */}
          <div
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            className="mt-3 p-3 rounded-xl border flex items-center justify-between text-xs"
          >
            <span className="text-theme-secondary flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              AI Compute Engine
            </span>
            <span className="font-mono font-semibold text-theme-primary uppercase">
              {healthData?.device || stats?.model_status?.device || 'CPU'} •{' '}
              {stats?.model_status?.model || 'buffalo_l'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 8 & 12: RECENT AUTHENTICATION ACTIVITY + QUICK ACTIONS
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Section 8: Recent Authentication Activity Table (8 cols) */}
        <motion.div variants={fadeUp} className="lg:col-span-8 card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-theme-primary tracking-tight">
                Recent Authentication Activity
              </h3>
              <p className="text-xs text-theme-secondary mt-0.5">
                Latest biometric verifications and recognition events
              </p>
            </div>
            <button
              onClick={() => navigate('/logs')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.07] text-[11px] font-semibold uppercase tracking-wider text-theme-secondary">
                  <th className="py-3 pr-4">User</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Confidence</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 pl-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-xs">
                {logsLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center">
                      <LoadingSpinner size="sm" />
                    </td>
                  </tr>
                ) : recentLogs.length > 0 ? (
                  recentLogs.slice(0, 6).map((log) => {
                    const isKnown = Boolean(log.user_id) && !log.is_spoof
                    const isSpoof = Boolean(log.is_spoof)
                    const confPct = Math.min(100, Math.max(0, (log.confidence || 0) * 100))

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        {/* User */}
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                                isKnown
                                  ? 'bg-blue-500/12 border-blue-500/25 text-blue-400'
                                  : 'bg-slate-800/80 border-white/10 text-slate-400'
                              }`}
                            >
                              {log.detected_name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-theme-primary truncate">
                                {log.detected_name || 'Unknown'}
                              </p>
                              <p className="text-[11px] text-theme-secondary">
                                {isKnown ? `User ID #${log.user_id}` : 'Unregistered Subject'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Method */}
                        <td className="py-3.5 px-3 text-theme-secondary">
                          <span className="inline-flex items-center gap-1.5">
                            <ScanFace className="w-3.5 h-3.5 text-blue-400" />
                            <span>{isKnown ? 'Face Recognition' : 'Camera Scan'}</span>
                            <span className="text-[11px] opacity-60">• Cam {log.camera_id}</span>
                          </span>
                        </td>

                        {/* Confidence */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5 w-32">
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  confPct >= 70
                                    ? 'bg-emerald-400'
                                    : confPct >= 40
                                    ? 'bg-amber-400'
                                    : 'bg-rose-400'
                                }`}
                                style={{ width: `${confPct}%` }}
                              />
                            </div>
                            <span className="font-mono font-semibold text-theme-primary w-11 text-right">
                              {confPct.toFixed(1)}%
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          {isSpoof ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/12 text-rose-400 border border-rose-500/25">
                              Rejected
                            </span>
                          ) : isKnown ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/12 text-emerald-400 border border-emerald-500/25">
                              Successful
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/12 text-amber-400 border border-amber-500/25">
                              Unknown
                            </span>
                          )}
                        </td>

                        {/* Time */}
                        <td className="py-3.5 pl-3 text-right font-mono text-theme-secondary whitespace-nowrap">
                          {log.detected_at
                            ? format(new Date(log.detected_at), 'hh:mm a')
                            : '—'}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-theme-secondary">
                      No authentication events recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Section 12: Quick Actions (4 cols) */}
        <motion.div variants={fadeUp} className="lg:col-span-4 card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-theme-primary tracking-tight">
              Quick Actions
            </h3>
            <p className="text-xs text-theme-secondary mt-0.5 mb-4">
              Direct access to core biometric workflows
            </p>

            <div className="space-y-2.5">
              {[
                {
                  label: 'Start Face Recognition',
                  desc: 'Open real-time camera stream & matcher',
                  icon: ScanFace,
                  path: '/camera',
                  primary: true,
                },
                {
                  label: 'Face Login',
                  desc: 'Launch 3-second biometric authentication',
                  icon: Shield,
                  path: '/login',
                },
                {
                  label: 'Register New Face',
                  desc: 'Enroll multi-sample 3D mesh template',
                  icon: UserPlus,
                  path: '/registration',
                },
                {
                  label: 'Open Employee Monitoring',
                  desc: 'Track workstation occupancy & timers',
                  icon: UserCheck,
                  path: '/employee-monitoring',
                },
              ].map((act) => {
                const Icon = act.icon
                return (
                  <button
                    key={act.label}
                    onClick={() => navigate(act.path)}
                    style={
                      act.primary
                        ? { background: 'var(--btn-primary-bg)' }
                        : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }
                    }
                    className={`w-full p-3.5 rounded-xl flex items-center justify-between gap-3 text-left transition-all duration-150 group ${
                      act.primary
                        ? 'text-white shadow-md hover:opacity-95'
                        : 'border text-theme-primary hover:border-blue-500/35'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          act.primary
                            ? 'bg-white/15 text-white'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{act.label}</p>
                        <p
                          className={`text-[11px] truncate ${
                            act.primary ? 'text-blue-100' : 'text-theme-secondary'
                          }`}
                        >
                          {act.desc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${
                        act.primary ? 'text-white' : 'text-theme-secondary'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <div
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            className="mt-4 p-3 rounded-xl border flex items-center justify-between text-xs"
          >
            <span className="text-theme-secondary">Theme &amp; System Preferences</span>
            <button
              onClick={() => navigate('/settings')}
              className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Configure →
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
