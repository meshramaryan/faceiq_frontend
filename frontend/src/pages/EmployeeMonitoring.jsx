import React, { useState, useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';
import {
  Briefcase,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Square,
  RotateCcw,
  Video,
  Activity,
  MonitorCheck,
  Wifi,
  WifiOff,
  Camera,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { employeeMonitoringAPI } from '../api';
import { useAuthStore } from '@/store';

const buildWsUrl = (sourceId, token) => {
  const baseHost = import.meta.env.VITE_WS_URL
    ? import.meta.env.VITE_WS_URL.replace(/\/$/, '')
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//127.0.0.1:8000`;
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${baseHost}/api/v1/ws/employee-monitoring/${encodeURIComponent(sourceId)}${query}`;
};

const formatDuration = (totalSeconds) => {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':');
};

const DEFAULT_STATIONS_STATE = {
  station_1: {
    name: 'station_1',
    label: 'Station 1',
    occupied: false,
    status: 'Vacant',
    iou: 0,
    timer_seconds: 0,
    timer_formatted: '00:00:00',
    bbox: [600, 500, 950, 960],
  },
  station_2: {
    name: 'station_2',
    label: 'Station 2',
    occupied: false,
    status: 'Vacant',
    iou: 0,
    timer_seconds: 0,
    timer_formatted: '00:00:00',
    bbox: [1440, 500, 1800, 880],
  },
  station_3: {
    name: 'station_3',
    label: 'Station 3',
    occupied: false,
    status: 'Vacant',
    iou: 0,
    timer_seconds: 0,
    timer_formatted: '00:00:00',
    bbox: [320, 440, 620, 780],
  },
  station_4: {
    name: 'station_4',
    label: 'Station 4',
    occupied: false,
    status: 'Vacant',
    iou: 0,
    timer_seconds: 0,
    timer_formatted: '00:00:00',
    bbox: [1150, 270, 1420, 550],
  },
};

export default function EmployeeMonitoring() {
  const token = useAuthStore((state) => state.token);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedSource, setSelectedSource] = useState('cctv');
  const [frameSrc, setFrameSrc] = useState(null);
  const [personCount, setPersonCount] = useState(0);
  const [detections, setDetections] = useState([]);
  const [fps, setFps] = useState(0);
  const [iouThreshold, setIouThreshold] = useState(0.2);
  const [backendModel, setBackendModel] = useState('Faster R-CNN MobileNetV3-Large FPN');
  const [isTestingSample, setIsTestingSample] = useState(false);
  const [stations, setStations] = useState(DEFAULT_STATIONS_STATE);

  const wsRef = useRef(null);
  const isManualStopRef = useRef(false);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef(null);

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  // Load initial station state from backend (read-only endpoint)
  useEffect(() => {
    let mounted = true;
    const fetchInitialStations = async () => {
      try {
        const res = await employeeMonitoringAPI.getStations();
        if (!mounted || !res?.data) return;
        if (res.data.stations) {
          setStations(res.data.stations);
        }
        if (typeof res.data.person_count === 'number') {
          setPersonCount(res.data.person_count);
        }
        if (Array.isArray(res.data.detections)) {
          setDetections(res.data.detections);
        }
        if (typeof res.data.iou_threshold === 'number') {
          setIouThreshold(res.data.iou_threshold);
        }
        if (res.data.backend && res.data.backend !== 'uninitialized') {
          setBackendModel(res.data.backend);
        }
      } catch (err) {
        // Non-blocking initial load
      }
    };
    fetchInitialStations();
    return () => {
      mounted = false;
    };
  }, []);

  const closeSocketCleanly = useCallback(() => {
    isManualStopRef.current = true;
    clearReconnectTimer();
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ action: 'stop' }));
        }
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
      } catch (e) {
        // Ignore close errors
      }
      wsRef.current = null;
    }
  }, []);

  const connectWebSocket = useCallback(
    (sourceOverride) => {
      const activeSource = sourceOverride ?? selectedSource;
      closeSocketCleanly();
      isManualStopRef.current = false;

      const wsUrl = buildWsUrl(activeSource, token);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectCountRef.current = 0;
        setIsConnected(true);
        setIsStreaming(true);
        toast.success(
          activeSource === 'cctv'
            ? 'Office CCTV monitoring stream connected'
            : `Camera ${activeSource} monitoring stream connected`,
          { id: 'emp-ws-status' }
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'employee_monitoring_frame') {
            if (data.frame) setFrameSrc(data.frame);
            if (data.stations) setStations(data.stations);
            if (typeof data.person_count === 'number') setPersonCount(data.person_count);
            if (Array.isArray(data.detections)) setDetections(data.detections);
            if (typeof data.fps === 'number') setFps(data.fps);
          }
        } catch (err) {
          // Ignore malformed frame packet
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        if (!isManualStopRef.current) {
          if (reconnectCountRef.current < 3) {
            reconnectCountRef.current += 1;
            const retryDelay = reconnectCountRef.current * 1500;
            reconnectTimerRef.current = setTimeout(() => {
              if (!isManualStopRef.current) {
                connectWebSocket(activeSource);
              }
            }, retryDelay);
          } else {
            setIsStreaming(false);
            toast.error('Employee monitoring stream disconnected', { id: 'emp-ws-status' });
          }
        } else {
          setIsStreaming(false);
        }
      };
    },
    [selectedSource, token, closeSocketCleanly]
  );

  const stopStream = useCallback(() => {
    closeSocketCleanly();
    setIsStreaming(false);
    setIsConnected(false);
    setFps(0);
    toast('Monitoring stream paused', { icon: '⏸️', id: 'emp-ws-status' });
  }, [closeSocketCleanly]);

  const handleSourceChange = (newSource) => {
    setSelectedSource(newSource);
    if (isStreaming) {
      connectWebSocket(newSource);
    }
  };

  const handleTestSampleFrame = async () => {
    setIsTestingSample(true);
    try {
      const res = await employeeMonitoringAPI.processFrame(null, true);
      if (res?.data) {
        if (res.data.frame) setFrameSrc(res.data.frame);
        if (res.data.stations) setStations(res.data.stations);
        if (typeof res.data.person_count === 'number') setPersonCount(res.data.person_count);
        if (Array.isArray(res.data.detections)) setDetections(res.data.detections);
        const occ = Object.values(res.data.stations || {}).filter((s) => s.occupied).length;
        toast.success(
          `Detected ${res.data.person_count} employees (${occ} stations occupied)`,
          { id: 'emp-sample-test' }
        );
      }
    } catch (err) {
      toast.error('Failed to process reference CCTV frame');
    } finally {
      setIsTestingSample(false);
    }
  };

  const resetTimers = async () => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'reset_timers' }));
      }
      const res = await employeeMonitoringAPI.resetTimers();
      if (res?.data?.stations) {
        setStations(res.data.stations);
      } else {
        setStations((prev) => {
          const updated = {};
          Object.keys(prev).forEach((key) => {
            updated[key] = {
              ...prev[key],
              timer_seconds: 0,
              timer_formatted: '00:00:00',
            };
          });
          return updated;
        });
      }
      toast.success('All station timers reset to 00:00:00');
    } catch (err) {
      toast.error('Failed to reset station timers');
    }
  };

  // Clean unmount without firing a false disconnect toast
  useEffect(() => {
    return () => {
      closeSocketCleanly();
    };
  }, [closeSocketCleanly]);

  const stationList = Object.values(stations);
  const occupiedCount = stationList.filter((s) => s.occupied).length;
  const vacantCount = stationList.length - occupiedCount;
  const occupancyRate =
    stationList.length > 0 ? Math.round((occupiedCount / stationList.length) * 100) : 0;

  const totalSeatedSeconds = stationList.reduce(
    (acc, s) => acc + (Number(s.timer_seconds) || 0),
    0
  );
  const formattedTotalSeated = formatDuration(totalSeatedSeconds);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-2xl border"
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
        }}
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-theme-primary">
                Employee & Workstation Monitoring
              </h1>
              <p className="text-sm text-theme-secondary mt-0.5">
                Real-time deep-learning person detection, IoU desk occupancy tracking & seated duration timers
              </p>
            </div>
          </div>
        </div>

        {/* Stream Source & Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Source Selector */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium text-theme-primary"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <Camera className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedSource}
              onChange={(e) => handleSourceChange(e.target.value)}
              aria-label="Monitoring Video Source"
              className="bg-transparent text-theme-primary focus:outline-none cursor-pointer font-medium"
            >
              <option value="cctv" className="bg-slate-900 text-white">
                Office CCTV Video (4 Stations)
              </option>
              <option value="0" className="bg-slate-900 text-white">
                Camera 0 (Primary Webcam)
              </option>
              <option value="1" className="bg-slate-900 text-white">
                Camera 1 (External Camera)
              </option>
            </select>
          </div>

          {/* Connection Status Badge */}
          <div
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-500/10 text-theme-secondary border-slate-500/20'
            )}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 animate-pulse" />
                <span>LIVE {fps > 0 ? `(${fps.toFixed(1)} FPS)` : ''}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>STANDBY</span>
              </>
            )}
          </div>

          {/* Test Reference CCTV Sample Frame */}
          <button
            type="button"
            onClick={handleTestSampleFrame}
            disabled={isTestingSample}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isTestingSample ? 'Analyzing...' : 'Analyze Sample Frame'}</span>
          </button>

          {/* Reset Timers */}
          <button
            type="button"
            onClick={resetTimers}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold text-theme-primary hover:opacity-90 transition-all"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Timers</span>
          </button>

          {/* Start / Stop Stream */}
          {!isStreaming ? (
            <button
              type="button"
              onClick={() => connectWebSocket(selectedSource)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Monitoring</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopStream}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Stream</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="p-4 rounded-2xl border flex items-center gap-4"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
            <MonitorCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
              Workstations
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-theme-primary">{stationList.length}</p>
              <span className="text-xs text-theme-secondary">({vacantCount} vacant)</span>
            </div>
          </div>
        </div>

        <div
          className="p-4 rounded-2xl border flex items-center gap-4"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
              Occupied Now
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-emerald-400">
                {occupiedCount} / {stationList.length}
              </p>
              <span className="text-xs font-semibold text-emerald-400/80">
                ({occupancyRate}%)
              </span>
            </div>
          </div>
        </div>

        <div
          className="p-4 rounded-2xl border flex items-center gap-4"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
              Persons Detected
            </p>
            <p className="text-2xl font-bold text-cyan-400">{personCount}</p>
          </div>
        </div>

        <div
          className="p-4 rounded-2xl border flex items-center gap-4"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
              Cumulative Seated Time
            </p>
            <p className="text-2xl font-bold font-mono text-amber-400">
              {formattedTotalSeated}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Video Stream + Workstation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Annotated Video Viewport (2 Columns) */}
        <div
          className="lg:col-span-2 rounded-2xl border overflow-hidden flex flex-col"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div
            className="px-5 py-3.5 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2.5">
              <Video className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-sm text-theme-primary">
                Live Workstation Feed & IoU Bounding Boxes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                IoU Threshold: {(iouThreshold * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
            {frameSrc ? (
              <img
                src={frameSrc}
                alt="Employee Monitoring Feed"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-8 space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                  <Video className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">
                    Workstation Monitoring Ready
                  </p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Click <span className="text-indigo-400 font-semibold">Start Monitoring</span> to stream{' '}
                    {selectedSource === 'cctv'
                      ? 'the 4-station Office CCTV video'
                      : `live Camera ${selectedSource}`}{' '}
                    or click <span className="text-cyan-400 font-semibold">Analyze Sample Frame</span> for an instant test.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => connectWebSocket(selectedSource)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Stream</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTestSampleFrame}
                    disabled={isTestingSample}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Analyze Sample Frame</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Legend & Active Detections Strip */}
          <div
            className="px-5 py-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <div className="flex flex-wrap items-center gap-4 text-theme-secondary">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Station Taken (IoU &ge; {(iouThreshold * 100).toFixed(0)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                Station Vacant (IoU &lt; {(iouThreshold * 100).toFixed(0)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                Person Bounding Box
              </span>
            </div>

            <div className="text-theme-secondary font-mono text-[11px]">
              Engine: <span className="text-indigo-400">{backendModel}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Workstation Status Cards & Live Detections */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h2 className="font-semibold text-theme-primary text-sm uppercase tracking-wider">
                Workstation Status
              </h2>
            </div>
            <span className="text-xs font-mono text-theme-secondary">
              {occupiedCount}/{stationList.length} Active
            </span>
          </div>

          <div className="space-y-3">
            {stationList.map((station) => {
              const isOccupied = Boolean(station.occupied);
              const iouPercent = Math.min(Math.round((Number(station.iou) || 0) * 100), 100);
              return (
                <div
                  key={station.name}
                  className={clsx(
                    'p-4 rounded-2xl border transition-all duration-300',
                    isOccupied
                      ? 'bg-emerald-500/10 border-emerald-500/35 shadow-lg shadow-emerald-500/5'
                      : ''
                  )}
                  style={
                    !isOccupied
                      ? { background: 'var(--card)', borderColor: 'var(--border)' }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      {isOccupied ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      )}
                      <span className="font-bold text-theme-primary text-base">
                        {station.label}
                      </span>
                    </div>

                    <span
                      className={clsx(
                        'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
                        isOccupied
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                      )}
                    >
                      {station.status}
                    </span>
                  </div>

                  {/* Seated Timer */}
                  <div
                    className="flex items-center justify-between py-2 px-3 rounded-xl border mb-2.5"
                    style={{
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <span className="text-xs text-theme-secondary flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Seated Duration
                    </span>
                    <span className="font-mono font-bold text-base text-theme-primary">
                      {station.timer_formatted || '00:00:00'}
                    </span>
                  </div>

                  {/* IoU Overlap Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-theme-secondary">Overlap (IoU)</span>
                      <span className="font-mono text-theme-primary font-semibold">
                        {iouPercent}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-300',
                          isOccupied ? 'bg-emerald-400' : 'bg-rose-500/50'
                        )}
                        style={{ width: `${iouPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Person Detections Breakdown */}
          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <p className="text-xs font-semibold text-theme-primary uppercase tracking-wider">
                  Detected Persons ({detections.length})
                </p>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">COCO Class: person</span>
            </div>

            {detections.length === 0 ? (
              <p className="text-xs text-theme-secondary py-2">
                No person bounding boxes in current frame. Start the stream or click{' '}
                <span className="text-indigo-400 font-medium">Analyze Sample Frame</span>.
              </p>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {detections.map((det, idx) => {
                  const confPct = Math.round((Number(det.confidence) || 0) * 100);
                  return (
                    <div
                      key={`${det.x1}-${det.y1}-${idx}`}
                      className="flex items-center justify-between px-3 py-2 rounded-xl border text-xs"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span className="font-semibold text-theme-primary">
                          Person #{idx + 1}
                        </span>
                        <span className="font-mono text-[11px] text-theme-secondary">
                          [{det.x1}, {det.y1}, {det.x2}, {det.y2}]
                        </span>
                      </div>
                      <span className="font-mono font-bold text-cyan-400">{confPct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
