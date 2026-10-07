// Camera Page — Real-time WebSocket face detection stream
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, CameraOff, Play, Square, Wifi, WifiOff, Eye, Zap } from 'lucide-react'
import { useDetectionStore, useSettingsStore } from '@/store'
import { Badge, ConfidenceBar, StatCard } from '@/components/ui'
import toast from 'react-hot-toast'

const WS_URL = 'ws://127.0.0.1:8000/api/v1/ws/detect'

export default function CameraPage() {
  const { systemMode } = useSettingsStore()
  const [cameraId, setCameraId] = useState(0)
  const [frame, setFrame] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const wsRef = useRef(null)
  const isManualStopRef = useRef(false)

  const { fps, currentDetections, connectionStatus, setDetections, setFps, setConnectionStatus } = useDetectionStore()

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setConnectionStatus('connecting')
    setError(null)
    isManualStopRef.current = false

    const ws = new WebSocket(`${WS_URL}/${cameraId}`)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setConnectionStatus('connected')
      ws.send(JSON.stringify({ action: 'start' }))
    }

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data)

      if (data.type === 'frame') {
        setFrame(`data:image/jpeg;base64,${data.frame}`)
        setDetections(data.detections || [])
        setFps(data.fps || 0)
      } else if (data.type === 'error') {
        setError(data.message)
        setConnectionStatus('error')
      }
    }

    ws.onerror = () => {
      setError('WebSocket connection failed. Ensure backend is running on port 8000.')
      setConnectionStatus('error')
      setIsConnected(false)
    }

    ws.onclose = () => {
      setIsConnected(false)
      setConnectionStatus('disconnected')

      // Auto-reconnect if it was not a manual stop
      if (!isManualStopRef.current) {
        setConnectionStatus('connecting')
        toast.error('Webcam stream disconnected. Retrying in 3s...')
        setTimeout(() => {
          connect()
        }, 3000)
      }
    }
  }, [cameraId, setDetections, setFps, setConnectionStatus])

  const disconnect = useCallback(() => {
    isManualStopRef.current = true
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ action: 'stop' }))
      } catch (_) {}
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setConnectionStatus('disconnected')
    setFrame(null)
    setDetections([])
  }, [setDetections, setConnectionStatus])

  useEffect(() => {
    return () => disconnect()
  }, [disconnect])

  const statusColors = {
    connected: 'text-success', connecting: 'text-warning',
    disconnected: 'text-gray-500', error: 'text-danger',
  }

  return (
    <div className="space-y-5">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Live Camera Feed</h2>
          <p className="section-subtitle">Real-time face detection and recognition</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={cameraId}
            onChange={(e) => setCameraId(Number(e.target.value))}
            className="input w-36"
            disabled={isConnected}
          >
            {[0, 1, 2, 3].map(i => (
              <option key={i} value={i}>Camera {i}</option>
            ))}
          </select>
          {!isConnected ? (
            <button onClick={connect} className="btn-primary gap-2">
              <Play className="w-4 h-4" /> Start Stream
            </button>
          ) : (
            <button onClick={disconnect} className="btn-danger gap-2">
              <Square className="w-4 h-4" /> Stop
            </button>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="card p-3 flex items-center gap-6 text-sm">
        <span className={`flex items-center gap-2 font-medium ${statusColors[connectionStatus]}`}>
          {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
        </span>
        <span className="text-zinc-500">FPS: <span className="text-white font-mono">{fps.toFixed(1)}</span></span>
        <span className="text-zinc-500">Camera: <span className="text-white font-mono">{cameraId}</span></span>
        <span className="text-zinc-500">
          Faces: <span className="text-white font-mono">{currentDetections.length}</span>
        </span>
        {currentDetections.some(d => d.liveness?.is_spoof) && (
          <Badge variant="danger">⚠ Spoof Detected</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Camera Feed */}
        <div className="xl:col-span-2">
          <div className="card overflow-hidden aspect-video relative bg-dark-950">
            {!frame && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {error ? (
                  <div className="space-y-2">
                    <CameraOff className="w-12 h-12 text-danger mx-auto" />
                    <p className="text-danger text-sm font-medium">Camera Error</p>
                    <p className="text-zinc-500 text-xs max-w-xs">{error}</p>
                    <button onClick={connect} className="btn-primary mt-3">
                      Retry Connection
                    </button>
                  </div>
                ) : connectionStatus === 'connecting' ? (
                  <div className="space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mx-auto"></div>
                    <p className="text-zinc-400 text-sm">Connecting to webcam stream...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Camera className="w-12 h-12 text-zinc-700 mx-auto" />
                    <p className="text-zinc-500 text-sm">Press "Start Stream" to begin</p>
                  </div>
                )}
              </div>
            )}
            {frame && (
              <>
                <img
                  src={frame}
                  alt="Camera feed"
                  className="w-full h-full object-cover"
                />
                {/* Corner brackets overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Top-left */}
                  <div className="absolute top-3 left-3 w-8 h-8 border-l-2 border-t-2 border-white/40" />
                  {/* Top-right */}
                  <div className="absolute top-3 right-3 w-8 h-8 border-r-2 border-t-2 border-white/40" />
                  {/* Bottom-left */}
                  <div className="absolute bottom-3 left-3 w-8 h-8 border-l-2 border-b-2 border-white/40" />
                  {/* Bottom-right */}
                  <div className="absolute bottom-3 right-3 w-8 h-8 border-r-2 border-b-2 border-white/40" />
                  {/* Scan line */}
                  <div className="scan-line" />
                </div>
                {/* FPS counter */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm
                                px-3 py-1 rounded-full text-xs font-mono text-white">
                  {fps.toFixed(1)} FPS
                </div>
              </>
            )}
          </div>
        </div>

        {/* Detection Panel */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-white" />
              Live Detections ({currentDetections.length})
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              <AnimatePresence>
                {currentDetections.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-8">No faces detected</p>
                ) : (
                  currentDetections.map((det, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-[#0b0b0e] hover:bg-[#111113] rounded-2xl p-4 space-y-2.5 border border-white/[0.04] transition-colors"
                    >
                      {/* Name + badge */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white text-sm">{det.name}</p>
                          {systemMode === 'advanced' && det.attributes?.emotion && (
                            <p className="text-xs text-zinc-500 capitalize">{det.attributes.emotion}</p>
                          )}
                        </div>
                        <Badge variant={det.is_unknown ? 'warning' : 'success'}>
                          {det.is_unknown ? 'Unknown' : 'Known'}
                        </Badge>
                      </div>

                      {/* Confidence */}
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Confidence</p>
                        <ConfidenceBar value={det.confidence} size="md" />
                      </div>

                      {/* Attributes grid */}
                      {systemMode === 'advanced' && det.attributes && (
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          {det.attributes.age && (
                            <span className="text-zinc-400">Age: <span className="text-white">{det.attributes.age}</span></span>
                          )}
                          {det.attributes.gender && (
                            <span className="text-zinc-400">Gender: <span className="text-white">{det.attributes.gender}</span></span>
                          )}
                          {det.attributes.has_mask !== null && (
                            <span className="text-zinc-400">Mask: <span className={det.attributes.has_mask ? 'text-warning' : 'text-success'}>{det.attributes.has_mask ? 'Yes' : 'No'}</span></span>
                          )}
                          {det.liveness && (
                            <span className="text-zinc-400">Live: <span className={det.liveness.is_live ? 'text-success' : 'text-danger'}>{det.liveness.is_live ? 'Yes' : 'Spoof!'}</span></span>
                          )}
                        </div>
                      )}

                      {/* Quality */}
                      {systemMode === 'advanced' && det.quality && (
                        <div className="flex items-center gap-2 text-xs">
                          <Zap className="w-3 h-3 text-zinc-400" />
                          <span className="text-zinc-500">Quality: {((det.quality.score || 0) * 100).toFixed(0)}%</span>
                          {det.quality.is_blurry && <Badge variant="warning">Blurry</Badge>}
                          {det.quality.is_low_light && <Badge variant="warning">Dark</Badge>}
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
