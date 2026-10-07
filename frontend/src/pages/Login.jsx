// Login Page with 3-Second Real-Time Biometric AI Scanner
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Shield, Eye, EyeOff, Lock, User, Loader2, Camera, AlertTriangle, CheckCircle, Scan, UserCheck, Sparkles, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI } from '@/api'
import { useAuthStore } from '@/store'

const MIN_SCAN_DURATION_MS = 3000

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [authMode, setAuthMode] = useState('face') // 'face' | 'password'

  // Face Login states
  const [faceFrame, setFaceFrame] = useState(null)
  const [scanStatus, setScanStatus] = useState('idle') // 'idle' | 'scanning' | 'verifying' | 'success' | 'unknown' | 'warning' | 'error'
  const [scanStage, setScanStage] = useState('Position face inside scanner')
  const [scanMessage, setScanMessage] = useState('Position face inside scanner...')
  const [progress, setProgress] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [detectedUser, setDetectedUser] = useState(null)
  const [faceDetected, setFaceDetected] = useState(false)

  // Internal refs for real-time recognition tracking across the 3-second window
  const wsRef = useRef(null)
  const scanStartTimeRef = useRef(null)
  const recognitionResultRef = useRef(null)

  // Password Login states
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const resetLocalScanState = useCallback((stageText = 'Position face inside scanner', msgText = 'Position face inside scanner...') => {
    scanStartTimeRef.current = null
    recognitionResultRef.current = null
    setDetectedUser(null)
    setProgress(0)
    setElapsedSec(0)
    setScanStage(stageText)
    setScanMessage(msgText)
  }, [])

  const handleRetryScan = useCallback(() => {
    resetLocalScanState('Position face inside scanner', 'Position face inside scanner...')
    setScanStatus('idle')
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'retry' }))
    }
  }, [resetLocalScanState])

  // Smooth 50ms visual interpolation synced with active face presence (0 -> 99% over 3.0s)
  useEffect(() => {
    if (authMode !== 'face') return
    if (scanStatus !== 'scanning' && scanStatus !== 'verifying') return

    const timer = setInterval(() => {
      if (!scanStartTimeRef.current) return
      const elapsedMs = Date.now() - scanStartTimeRef.current
      const clampedSec = Math.min(3.0, elapsedMs / 1000)
      const smoothPct = Math.min(99, Math.round((elapsedMs / MIN_SCAN_DURATION_MS) * 100))

      setElapsedSec(Number(clampedSec.toFixed(1)))
      setProgress((prev) => Math.max(prev, smoothPct))

      if (clampedSec < 1.0) {
        setScanStage('Face Detection')
      } else if (clampedSec < 2.0) {
        setScanStage('Biometric Scanning / Verification')
      } else if (clampedSec < 3.0 && recognitionResultRef.current) {
        setScanStage('Identity Verified')
      }
    }, 50)

    return () => clearInterval(timer)
  }, [authMode, scanStatus])

  // WebSocket Face Login
  useEffect(() => {
    if (authMode !== 'face') return

    setScanStatus('idle')
    setFaceDetected(false)
    resetLocalScanState()

    const ws = new WebSocket('ws://localhost:8000/api/v1/ws/auth-face')
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: 'start' }))
    }

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)

        if (data.frame) {
          setFaceFrame(`data:image/jpeg;base64,${data.frame}`)
        }

        if (data.type === 'preview') {
          const isFacePresent = Boolean(data.face_detected)
          setFaceDetected(isFacePresent)

          if (data.status === 'no_face') {
            // User moved away -> reset scan timer and progress
            setScanStatus('idle')
            resetLocalScanState('Position face inside scanner', data.message || 'Position face inside scanner...')
          } else if (data.status === 'multiple_faces' || data.status === 'liveness_failed') {
            // Security violation -> invalidate active scan immediately
            setScanStatus('warning')
            resetLocalScanState(data.stage || 'Security check', data.message || 'Please ensure a single live face is visible')
          } else if (data.status === 'unknown') {
            // Unknown face confirmed rapidly (~0.3s) -> do NOT wait 3 seconds
            setScanStatus('unknown')
            scanStartTimeRef.current = null
            recognitionResultRef.current = null
            setDetectedUser(null)
            setProgress(0)
            setElapsedSec(0)
            setScanStage('Face not recognized')
            setScanMessage(data.message || 'Face not recognized')
          } else if (data.status === 'scanning' || data.status === 'verifying') {
            // Active known/scanning face session
            if (!scanStartTimeRef.current) {
              scanStartTimeRef.current = Date.now() - Math.round((data.elapsed || 0) * 1000)
            }

            // If identity changed mid-scan, reset timer to the backend's new elapsed time
            if (
              data.candidate_user &&
              recognitionResultRef.current?.user?.id &&
              recognitionResultRef.current.user.id !== data.candidate_user.id
            ) {
              scanStartTimeRef.current = Date.now() - Math.round((data.elapsed || 0) * 1000)
              setProgress(data.progress || 0)
            }

            if (data.recognition_ready && data.candidate_user) {
              recognitionResultRef.current = {
                user: data.candidate_user,
                similarity: data.similarity,
                observations: data.observations,
              }
              setDetectedUser(data.candidate_user)
              setScanStatus('verifying')
            } else {
              setScanStatus('scanning')
            }

            if (typeof data.progress === 'number') {
              setProgress((prev) => (data.progress === 0 ? 0 : Math.max(prev, data.progress)))
            }
            if (typeof data.elapsed === 'number') {
              setElapsedSec(Number(data.elapsed.toFixed(1)))
            }
            if (data.stage) {
              setScanStage(data.stage)
            }
            if (data.message) {
              setScanMessage(data.message)
            }
          }
        } else if (data.type === 'authenticated') {
          const token = data.access_token || data.token
          const refresh = data.refresh_token || null
          const userObj = data.user || recognitionResultRef.current?.user || { name: 'User', username: 'user', role: 'admin' }

          setFaceDetected(true)
          setProgress(100)
          setElapsedSec(3.0)
          setScanStatus('success')
          setDetectedUser(userObj)
          setScanStage('Login Successful')
          setScanMessage(`Welcome back, ${userObj.name}!`)

          if (token) {
            setAuth(userObj, token, refresh)
            toast.success(`Login Successful! Welcome back, ${userObj.name}`)

            setTimeout(() => {
              ws.close()
              navigate('/dashboard')
            }, 850)
          }
        } else if (data.type === 'error') {
          setScanStatus('error')
          setScanStage('Camera unavailable')
          setScanMessage(data.message || 'Camera unavailable')
        }
      } catch (err) {
        console.error('WS frame parse error:', err)
      }
    }

    return () => {
      if (wsRef.current) {
        try { wsRef.current.send(JSON.stringify({ action: 'stop' })) } catch (_) {}
        wsRef.current.close()
      }
    }
  }, [authMode, navigate, setAuth, resetLocalScanState])

  const onPasswordSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await authAPI.login(data.username, data.password)
      const { access_token, refresh_token, user } = res.data

      let userData = user
      if (!userData && access_token) {
        // Fallback: store token first then fetch /auth/me if backend didn't embed user
        setAuth({ name: data.username, username: data.username, role: 'admin' }, access_token, refresh_token)
        try {
          const meRes = await authAPI.me()
          userData = meRes.data
        } catch (_) {
          userData = { name: data.username, username: data.username, role: 'admin' }
        }
      }

      setAuth(userData, access_token, refresh_token)
      toast.success(`Welcome back, ${userData?.name || data.username}!`)
      navigate('/dashboard')
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Invalid username or password'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // SVG circular progress ring geometry
  const ringRadius = 124
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference - (Math.min(100, Math.max(0, progress)) / 100) * ringCircumference

  return (
    <div className="min-h-screen bg-[#090D16] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="w-full max-w-lg bg-[#131c2e]/80 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 shadow-[0_0_30px_rgba(59,130,246,0.4)] border border-white/20 mb-2">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">FaceIQ Enterprise</h1>
          <p className="text-xs text-slate-400">AI-Powered Biometric Authentication System</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#0f172a] border border-white/[0.08] p-1 rounded-2xl mb-6">
          <button
            onClick={() => setAuthMode('face')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
              authMode === 'face'
                ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scan className="w-4 h-4" /> Face Login
          </button>
          <button
            onClick={() => setAuthMode('password')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
              authMode === 'password'
                ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" /> Password Login
          </button>
        </div>

        {/* Content Body */}
        {authMode === 'face' ? (
          <div className="space-y-5 flex flex-col items-center">
            {/* Circular Biometric HUD Scanner Frame with SVG Progress Ring */}
            <div className="relative w-64 h-64 flex items-center justify-center">
              {/* Circular SVG Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-20" viewBox="0 0 256 256">
                <circle
                  cx="128"
                  cy="128"
                  r={ringRadius}
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.14)"
                  strokeWidth="4"
                />
                <circle
                  cx="128"
                  cy="128"
                  r={ringRadius}
                  fill="none"
                  stroke={
                    scanStatus === 'success'
                      ? '#10b981'
                      : scanStatus === 'unknown' || scanStatus === 'warning' || scanStatus === 'error'
                      ? '#f43f5e'
                      : '#38bdf8'
                  }
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-150 ease-out"
                />
              </svg>

              {/* Camera Viewport */}
              <div
                className={`w-[240px] h-[240px] rounded-full overflow-hidden relative flex items-center justify-center bg-slate-950 border transition-colors duration-300 ${
                  scanStatus === 'success'
                    ? 'border-emerald-400/60 shadow-[0_0_35px_rgba(16,185,129,0.3)]'
                    : scanStatus === 'unknown' || scanStatus === 'warning' || scanStatus === 'error'
                    ? 'border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.25)]'
                    : faceDetected
                    ? 'border-sky-400/50 shadow-[0_0_30px_rgba(56,189,248,0.28)]'
                    : 'border-white/10'
                }`}
              >
                {faceFrame ? (
                  <img src={faceFrame} alt="Face Scanner" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="flex flex-col items-center text-slate-500 space-y-2">
                    <Camera className="w-10 h-10 animate-pulse text-blue-400" />
                    <span className="text-[11px] font-medium text-slate-400">Initializing Camera...</span>
                  </div>
                )}

                {/* Subtle Biometric Scan Sweep Line when actively scanning */}
                {(scanStatus === 'scanning' || scanStatus === 'verifying') && (
                  <div className="absolute inset-0 scan-line pointer-events-none opacity-55" />
                )}
              </div>
            </div>

            {/* Stage Status & Progress */}
            <div className="w-full text-center space-y-3">
              <div className="flex items-center justify-center">
                {scanStatus === 'success' ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide">
                    <CheckCircle className="w-4 h-4" /> Login Successful
                  </span>
                ) : scanStatus === 'unknown' ? (
                  <span className="text-rose-400 flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/25 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide">
                    <AlertTriangle className="w-4 h-4" /> Face not recognized
                  </span>
                ) : scanStatus === 'warning' || scanStatus === 'error' ? (
                  <span className="text-amber-400 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide">
                    <AlertTriangle className="w-4 h-4" /> {scanMessage}
                  </span>
                ) : (
                  <span className="text-sky-300 flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide">
                    <Sparkles className={`w-4 h-4 text-sky-400 ${faceDetected ? 'animate-spin' : ''}`} />
                    {scanStage}
                  </span>
                )}
              </div>

              {/* Confirmed Identity Badge (shown during 2-3s Identity Verified stage & on completion) */}
              {detectedUser && (scanStatus === 'success' || (scanStatus === 'verifying' && progress >= 66)) && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{detectedUser.name}</span>
                </div>
              )}

              {/* Linear Progress Bar */}
              <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden border border-white/[0.06]">
                <motion.div
                  className={`h-full rounded-full ${
                    scanStatus === 'success'
                      ? 'bg-emerald-400'
                      : scanStatus === 'unknown' || scanStatus === 'warning'
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                <span>{progress}% Verified</span>
                <span>{elapsedSec.toFixed(1)}s / 3.0s</span>
              </div>

              {/* Action buttons on Unknown Face */}
              {scanStatus === 'unknown' && (
                <div className="pt-1 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleRetryScan}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600/30 text-sky-300 border border-sky-500/30 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('password')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-all"
                  >
                    <Lock className="w-3.5 h-3.5" /> Use Password
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Password Form */
          <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register('username', { required: 'Username is required' })}
                  type="text"
                  placeholder="admin"
                  className="input pl-10"
                />
              </div>
              {errors.username && <p className="text-xs text-rose-400 mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-rose-400 mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2 font-bold tracking-wide flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Authenticate System Access'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
