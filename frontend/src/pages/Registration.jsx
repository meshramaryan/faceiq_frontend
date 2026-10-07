// Face Registration Page — Fast Natural 3-Sample Biometric Scanner with Real-Time 3D Facial Mesh
import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  CheckCircle2,
  Upload,
  StopCircle,
  ScanFace,
  RotateCcw,
  AlertCircle,
} from 'lucide-react'
import { usersAPI, facesAPI } from '@/api'
import { Badge } from '@/components/ui'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

const WS_BASE = 'ws://127.0.0.1:8000/api/v1/ws/register'

// Fast 3-Sample Biometric Registration Stages
const CAPTURE_STEPS = [
  { step: 1, label: 'Sample 1/3', desc: 'Initial biometric frame & liveness check' },
  { step: 2, label: 'Sample 2/3', desc: 'Secondary distinct sample verification' },
  { step: 3, label: 'Sample 3/3', desc: 'Final sample & multi-sample template' },
]

// Status → color helper (clean enterprise biometric palette)
const STATUS_COLORS = {
  good:       { ring: '#10B981', glow: 'rgba(16, 185, 129, 0.28)', label: 'text-emerald-400' },
  aligning:   { ring: '#60A5FA', glow: 'rgba(96, 165, 250, 0.25)', label: 'text-sky-400'     },
  borderline: { ring: '#F59E0B', glow: 'rgba(245, 158, 11, 0.22)', label: 'text-amber-400'   },
  poor:       { ring: '#EF4444', glow: 'rgba(239, 68, 68, 0.22)',  label: 'text-red-400'     },
  no_face:    { ring: '#475569', glow: 'rgba(71, 85, 105, 0.12)',  label: 'text-slate-400'   },
}

export default function Registration() {
  const qc = useQueryClient()
  const [selectedUser, setSelectedUser]         = useState(null)
  const [mode, setMode]                         = useState('webcam')
  const [isRegistering, setIsRegistering]       = useState(false)
  const [isComplete, setIsComplete]             = useState(false)
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [captured, setCaptured]                 = useState(0)
  const [targetSamples, setTargetSamples]       = useState(3)
  const [frame, setFrame]                       = useState(null)
  const [quality, setQuality]                   = useState(null)
  const [faceDetected, setFaceDetected]         = useState(false)
  const [stageText, setStageText]               = useState('Detecting face...')
  const [statusKey, setStatusKey]               = useState('no_face')
  const [statusMessage, setStatusMessage]       = useState('Start registration to begin')
  const [errorReason, setErrorReason]           = useState(null)
  const [remainingSeconds, setRemainingSeconds] = useState(null)
  const [justCapturedStep, setJustCapturedStep] = useState(null)
  const [durationSeconds, setDurationSeconds]   = useState(null)
  const wsRef = useRef(null)
  const captureFlashTimerRef = useRef(null)

  const { data: usersData } = useQuery({
    queryKey: ['users-select'],
    queryFn: () => usersAPI.list({ page: 1, page_size: 100 }).then(r => r.data),
  })

  // Keep selectedUser synced with updated query data
  useEffect(() => {
    if (selectedUser && usersData?.items) {
      const updated = usersData.items.find(u => u.id === selectedUser.id)
      if (updated) setSelectedUser(updated)
    }
  }, [usersData])

  // ── WebSocket registration session ────────────────────────────────────────
  const startRegistration = () => {
    if (!selectedUser) return toast.error('Please select a user first')

    setIsRegistering(true)
    setIsComplete(false)
    setCreatingTemplate(false)
    setErrorReason(null)
    setDurationSeconds(null)
    setCaptured(0)
    setTargetSamples(3)
    setFrame(null)
    setQuality(null)
    setFaceDetected(false)
    setStageText('Detecting face...')
    setStatusKey('no_face')
    setStatusMessage('Detecting face...')
    setRemainingSeconds(9.0)
    setJustCapturedStep(null)

    const ws = new WebSocket(`${WS_BASE}/${selectedUser.id}`)
    wsRef.current = ws

    ws.onopen = () => {
      setStageText('Detecting face...')
      setStatusMessage('Face the camera naturally')
    }

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)

        if (data.type === 'preview') {
          setFrame(`data:image/jpeg;base64,${data.frame}`)
          setQuality(data.quality)
          setCaptured(data.captured ?? 0)
          setFaceDetected(Boolean(data.face_detected))
          if (data.total_samples) setTargetSamples(data.total_samples)
          if (data.stage || data.guidance) setStageText(data.stage || data.guidance)
          if (data.status) setStatusKey(data.status)
          if (data.message) setStatusMessage(data.message)
          if (data.remaining_seconds !== undefined) setRemainingSeconds(data.remaining_seconds)

        } else if (data.type === 'captured') {
          setCaptured(data.captured)
          if (data.total_samples) setTargetSamples(data.total_samples)
          const label = `Sample ${data.captured}/${data.total_samples || 3}`
          setStageText(label)
          setStatusMessage(label)

          setJustCapturedStep(label)
          if (captureFlashTimerRef.current) clearTimeout(captureFlashTimerRef.current)
          captureFlashTimerRef.current = setTimeout(() => setJustCapturedStep(null), 650)

          toast(`✓ ${label}`, {
            duration: 800,
            style: { background: '#0F172A', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)', fontSize: '13px' },
          })

        } else if (data.type === 'status') {
          setCreatingTemplate(true)
          setStageText(data.stage || 'Creating face template...')
          setStatusMessage(data.message || 'Creating face template...')
          setStatusKey('good')

        } else if (data.type === 'complete') {
          setCreatingTemplate(false)
          setIsComplete(true)
          setCaptured(data.captured ?? 3)
          setStageText('Registration Complete')
          setStatusKey('good')
          setStatusMessage('Registration Complete')
          if (data.duration_seconds !== undefined) setDurationSeconds(data.duration_seconds)
          toast.success(`Registration Complete (${data.captured ?? 3} samples in ${data.duration_seconds ?? ''}s)`)
          qc.invalidateQueries({ queryKey: ['users-select'] })
          if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
          }
          setIsRegistering(false)

        } else if (data.type === 'error') {
          const reason = data.reason || data.message || 'Registration failed'
          setErrorReason(reason)
          setStageText('Registration Incomplete')
          setStatusKey('poor')
          setStatusMessage(data.message || reason)
          toast.error(data.message || 'Registration error')
          if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
          }
          setIsRegistering(false)
          setFrame(null)
        }
      } catch (e) {
        console.error('Registration ws parse error', e)
      }
    }

    ws.onerror = () => {
      setErrorReason('WebSocket connection error — verify backend is running')
      toast.error('WebSocket error. Is the backend running?')
      stopRegistration()
    }

    ws.onclose = () => {
      setIsRegistering(false)
    }
  }

  const stopRegistration = () => {
    if (wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ action: 'cancel' })) } catch (_) {}
      wsRef.current.close()
      wsRef.current = null
    }
    if (captureFlashTimerRef.current) clearTimeout(captureFlashTimerRef.current)
    setIsRegistering(false)
    setCreatingTemplate(false)
    setFrame(null)
    setFaceDetected(false)
    setStatusKey('no_face')
    setStatusMessage('Registration stopped')
  }

  useEffect(() => () => stopRegistration(), [])

  // ── File upload mode ───────────────────────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: async (files) => {
      if (!selectedUser) return toast.error('Select a user first')
      for (const file of files.slice(0, 10)) {
        try {
          const res = await facesAPI.registerFromImage(selectedUser.id, file)
          toast.success(`Registered: quality ${(res.data.quality_score * 100).toFixed(0)}%`)
        } catch (err) {
          toast.error(err.response?.data?.message || 'Registration failed')
        }
      }
      qc.invalidateQueries({ queryKey: ['users-select'] })
    },
  })

  const progress = isComplete
    ? 100
    : creatingTemplate
    ? 95
    : Math.min((captured / Math.max(targetSamples, 1)) * 100, 100)
  const colors = STATUS_COLORS[statusKey] ?? STATUS_COLORS.no_face

  // SVG progress circle metrics
  const circleRadius = 158
  const circleCircumference = 2 * Math.PI * circleRadius
  const strokeDashoffset = circleCircumference - (progress / 100) * circleCircumference

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">Face Registration</h2>
        <p className="section-subtitle">
          Fast 3-sample biometric enrollment with real-time 3D facial landmark visualization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left Panel ─────────────────────────────────────── */}
        <div className="space-y-4">

          {/* 1. User selector */}
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-white">1. Select User</h3>
            <select
              className="input"
              value={selectedUser?.id || ''}
              onChange={(e) => {
                const user = usersData?.items?.find(u => u.id === Number(e.target.value))
                setSelectedUser(user || null)
                setIsComplete(false)
                setErrorReason(null)
              }}
              disabled={isRegistering}
            >
              <option value="">Select a user…</option>
              {usersData?.items?.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.employee_id ? `(${u.employee_id})` : ''} — {u.embedding_count} samples
                </option>
              ))}
            </select>

            {selectedUser && (
              <div className="bg-[#161B22] rounded-xl p-4 space-y-2 border border-white/[0.08]">
                <div className="w-12 h-12 rounded-full bg-primary-600/10 border border-primary-500/20
                                flex items-center justify-center text-xl font-bold text-primary-400 mx-auto">
                  {selectedUser.name[0]}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-white">{selectedUser.name}</p>
                  <p className="text-xs text-slate-400">{selectedUser.department || 'No department'}</p>
                  <div className="mt-2">
                    <Badge variant={selectedUser.is_registered ? 'success' : 'warning'}>
                      {selectedUser.is_registered
                        ? `${selectedUser.embedding_count} samples`
                        : 'Not registered'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Mode selector */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-white">2. Registration Mode</h3>
            <div className="grid grid-cols-2 gap-2">
              {['webcam', 'upload'].map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  disabled={isRegistering}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    mode === m
                      ? 'bg-primary-600 border-primary-600 text-white shadow-glow-primary'
                      : 'bg-[#161B22] border-white/[0.08] text-slate-400 hover:border-white/[0.16]'
                  }`}
                >
                  {m === 'webcam'
                    ? <><Camera className="w-4 h-4 mx-auto mb-1" /> Webcam</>
                    : <><Upload className="w-4 h-4 mx-auto mb-1" /> Upload</>}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Fast 3-Sample Capture Sequence */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">3. Biometric Capture Status</h3>
              <span className="text-xs font-mono text-slate-400">
                {captured}/{targetSamples} SAMPLES
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {CAPTURE_STEPS.map((s) => {
                const isDone = captured >= s.step || isComplete
                const isActive = isRegistering && captured === s.step - 1 && !isDone
                return (
                  <div
                    key={s.step}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                      isDone
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : isActive
                        ? 'bg-sky-500/10 border-sky-400/40 text-white'
                        : 'bg-[#11161D] border-white/[0.05] text-slate-500'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold tracking-wider">{s.label}</span>
                      <span className="text-[11px] font-sans text-slate-400">{s.desc}</span>
                    </div>
                    <span className="text-sm font-bold">
                      {isDone ? (
                        <span className="text-emerald-400">✓</span>
                      ) : isActive ? (
                        <span className="text-sky-400 animate-pulse">●</span>
                      ) : (
                        <span className="text-slate-700">○</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tips */}
          <div className="card p-4 space-y-2">
            <h4 className="text-sm font-semibold text-white">Scanner Guidelines</h4>
            <ul className="text-xs text-zinc-400 space-y-1.5">
              {[
                'Face the camera naturally inside the scanner',
                '3 high-quality samples are captured automatically',
                'Ensure clear, even lighting without sunglasses',
                'Completes in ~1.5–3 seconds when face is clear',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Right Panel ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {mode === 'webcam' ? (
            <div className="card overflow-hidden bg-[#0B0F17] border-white/[0.08]">

              {/* Top Step Bar */}
              <div className="p-4 border-b border-white/[0.07] space-y-3 bg-[#0E141F]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ScanFace className="w-4 h-4 text-sky-400" />
                    <span className="text-sm font-medium text-white">
                      {isComplete
                        ? 'Registration Complete'
                        : creatingTemplate
                        ? 'Creating face template...'
                        : isRegistering
                        ? stageText
                        : '3D Facial Mesh Biometric Scanner'}
                    </span>
                  </div>

                  {/* Step pills: Sample 1/3, Sample 2/3, Sample 3/3 */}
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    {CAPTURE_STEPS.map((s) => {
                      const done = captured >= s.step || isComplete
                      const active = isRegistering && captured === s.step - 1 && !done
                      return (
                        <span
                          key={s.step}
                          className={`px-2.5 py-0.5 rounded border transition-all ${
                            done
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : active
                              ? 'bg-sky-500/20 border-sky-400/50 text-sky-200 font-semibold'
                              : 'bg-white/[0.03] border-white/[0.06] text-slate-500'
                          }`}
                        >
                          {s.label} {done ? '✓' : active ? '●' : ''}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* Overall progress bar */}
                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.25 }}
                    className={`h-full rounded-full ${
                      isComplete ? 'bg-emerald-500' : 'bg-sky-400'
                    }`}
                  />
                </div>
              </div>

              {/* Main Circular Biometric Scanner Viewport */}
              <div className="relative py-8 px-4 flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-[#0B0F17] via-[#0D131F] to-[#0B0F17]">

                {/* Circular Scanner Frame */}
                <div
                  className="relative w-[332px] h-[332px] flex items-center justify-center rounded-full"
                  style={{
                    boxShadow: isRegistering || isComplete
                      ? `0 0 42px ${justCapturedStep || isComplete ? 'rgba(16, 185, 129, 0.45)' : colors.glow}`
                      : '0 0 25px rgba(15, 23, 42, 0.5)',
                  }}
                >
                  {/* SVG Circular Progress & Biometric Ring */}
                  <svg
                    className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-20"
                    viewBox="0 0 332 332"
                  >
                    <circle
                      cx="166"
                      cy="166"
                      r={circleRadius}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeWidth="3"
                    />
                    <circle
                      cx="166"
                      cy="166"
                      r={circleRadius}
                      fill="none"
                      stroke={justCapturedStep || isComplete ? '#10B981' : colors.ring}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={circleCircumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-250 ease-out"
                    />
                  </svg>

                  {/* Circular Clipped Camera Feed (with real-time 3D landmark mesh rendered on face) */}
                  <div className="relative w-[312px] h-[312px] rounded-full overflow-hidden bg-[#070A0F] border border-white/[0.08] flex items-center justify-center">
                    {frame ? (
                      <>
                        <img
                          src={frame}
                          alt="Live 3D Facial Mesh Scanner"
                          className="w-full h-full object-cover"
                        />

                        <AnimatePresence>
                          {justCapturedStep && (
                            <motion.div
                              initial={{ opacity: 0.75 }}
                              animate={{ opacity: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.55 }}
                              className="absolute inset-0 rounded-full border-4 border-emerald-400 bg-emerald-400/15 pointer-events-none"
                            />
                          )}
                        </AnimatePresence>
                      </>
                    ) : isComplete ? (
                      <div className="flex flex-col items-center justify-center text-center p-6 space-y-2">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                          <CheckCircle2 className="w-9 h-9" />
                        </div>
                        <p className="text-base font-semibold text-white">Registration Complete</p>
                        <p className="text-xs text-slate-400">
                          {captured} samples combined into FAISS identity template
                          {durationSeconds ? ` in ${durationSeconds}s` : ''}
                        </p>
                      </div>
                    ) : errorReason ? (
                      <div className="flex flex-col items-center justify-center text-center p-6 space-y-2">
                        <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400">
                          <AlertCircle className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-semibold text-white">Registration Timed Out</p>
                        <p className="text-xs text-red-300 max-w-[230px]">
                          {errorReason}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2.5 text-slate-500 p-6 text-center">
                        <ScanFace className="w-14 h-14 text-slate-600 stroke-[1.4]" />
                        <p className="text-xs text-slate-400">
                          {isRegistering
                            ? 'Detecting face...'
                            : 'Select a user and press Start Registration'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Captured Sample Confirmation Pill */}
                  <AnimatePresence>
                    {justCapturedStep && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.92 }}
                        className="absolute -top-3 z-30 px-3.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-xs font-bold tracking-wide shadow-lg"
                      >
                        ✓ {justCapturedStep}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Real-Time Status Below Scanner */}
                <div className="mt-6 text-center space-y-1.5 max-w-md">
                  <p className="text-xl font-semibold tracking-tight text-white">
                    {isComplete
                      ? 'Registration Complete'
                      : creatingTemplate
                      ? 'Creating face template...'
                      : isRegistering
                      ? stageText
                      : errorReason
                      ? 'Retry Registration'
                      : 'Ready to Enroll'}
                  </p>
                  <p className={`text-sm font-medium ${colors.label}`}>
                    {statusMessage}
                  </p>
                </div>

                {/* Live Telemetry Bar */}
                {isRegistering && (
                  <div className="mt-5 w-full max-w-lg grid grid-cols-3 gap-2.5 text-center">
                    <div className="bg-[#111723] border border-white/[0.06] rounded-xl px-3 py-2">
                      <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                        3D Landmark Mesh
                      </span>
                      <span className={`text-xs font-semibold ${faceDetected ? 'text-sky-300' : 'text-slate-500'}`}>
                        {faceDetected ? 'Active (97 pts)' : 'Detecting face...'}
                      </span>
                    </div>

                    <div className="bg-[#111723] border border-white/[0.06] rounded-xl px-3 py-2">
                      <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                        Capture Quality
                      </span>
                      <span className={`text-xs font-semibold ${quality?.is_acceptable ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {quality ? `${(quality.score * 100).toFixed(0)}%` : '—'}
                      </span>
                    </div>

                    <div className="bg-[#111723] border border-white/[0.06] rounded-xl px-3 py-2">
                      <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                        Session Timer
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-200">
                        {remainingSeconds !== null ? `${remainingSeconds.toFixed(1)}s` : '—'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="p-4 border-t border-white/[0.07] bg-[#0E141F] flex items-center gap-3">
                {!isRegistering ? (
                  <button
                    onClick={startRegistration}
                    disabled={!selectedUser}
                    className="btn-primary flex-1 py-3 gap-2"
                  >
                    {isComplete || errorReason ? (
                      <>
                        <RotateCcw className="w-4 h-4" /> {errorReason ? 'Retry Registration' : 'Scan Again'}
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" /> Start Registration
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={stopRegistration}
                    className="btn-secondary flex-1 py-3 gap-2"
                  >
                    <StopCircle className="w-4 h-4" /> Cancel Registration
                  </button>
                )}
              </div>

            </div>
          ) : (
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-white">Upload Face Images</h3>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-white bg-white/[0.02]'
                    : 'border-white/[0.06] hover:border-white/[0.15]'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-white font-medium">Drop images here or click to upload</p>
                <p className="text-zinc-500 text-sm mt-1">Supports JPG, PNG, WEBP — up to 10 images</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
