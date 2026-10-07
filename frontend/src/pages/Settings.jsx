// Settings Page — System Settings configuration UI
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { settingsAPI, facesAPI } from '@/api'
import { useSettingsStore } from '@/store'
import { LoadingSpinner, Badge } from '@/components/ui'
import { Save, RefreshCw, Cpu, ShieldAlert, Sliders, Camera, Palette } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

export default function Settings() {
  const { systemMode, theme } = useSettingsStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset } = useForm()

  // 1. Fetch system settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getAll().then(r => r.data),
    onSuccess: (data) => {
      const formDefaults = {}
      if (data?.settings) {
        Object.keys(data.settings).forEach((k) => {
          formDefaults[k] = data.settings[k].value
        })
      }
      reset(formDefaults)
    }
  })

  // 2. Mutations
  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }) => settingsAPI.update(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings'])
      toast.success('Setting updated!')
    },
    onError: () => toast.error('Failed to save setting'),
  })

  const rebuildIndexMutation = useMutation({
    mutationFn: () => facesAPI.rebuildIndex(),
    onSuccess: (res) => {
      toast.success(`FAISS Index rebuilt: ${res.data.total_embeddings} faces loaded`)
    },
    onError: () => toast.error('Failed to rebuild FAISS index'),
  })

  const handleSaveSetting = (key, value) => {
    updateSettingMutation.mutate({ key, value })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">System Settings</h2>
        <p className="section-subtitle">Configure detection parameters, camera streams, and database indices</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner text="Loading settings..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Settings Panel */}
          <div className="lg:col-span-2 space-y-5">
            {/* AI thresholds */}
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary-400" />
                Detection & Recognition Thresholds
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-medium text-gray-300">Face Recognition Threshold</label>
                    <span className="text-xs font-mono text-accent-400">Default: 0.40</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.90"
                    step="0.05"
                    defaultValue={settingsData?.settings?.FACE_REC_THRESHOLD?.value || '0.40'}
                    onChange={(e) => handleSaveSetting('FACE_REC_THRESHOLD', e.target.value)}
                    className="w-full h-1 bg-surface-light rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower values are more permissive, higher values prevent false positives.</p>
                </div>

                {systemMode === 'advanced' && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sm font-medium text-gray-300">Face Quality Threshold</label>
                      <span className="text-xs font-mono text-accent-400">Default: 0.70</span>
                    </div>
                    <input
                      type="range"
                      min="0.30"
                      max="0.95"
                      step="0.05"
                      defaultValue={settingsData?.settings?.REGISTRATION_QUALITY_THRESHOLD?.value || '0.70'}
                      onChange={(e) => handleSaveSetting('REGISTRATION_QUALITY_THRESHOLD', e.target.value)}
                      className="w-full h-1 bg-surface-light rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Rejects poor quality or blurry crops during face registration.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Camera settings */}
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary-400" />
                Video Stream Settings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Default Camera ID</label>
                  <select
                    defaultValue={settingsData?.settings?.DEFAULT_CAMERA_ID?.value || '0'}
                    onChange={(e) => handleSaveSetting('DEFAULT_CAMERA_ID', e.target.value)}
                    className="input"
                  >
                    {[0, 1, 2, 3].map(i => <option key={i} value={i}>Camera {i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Stream Target FPS</label>
                  <select
                    defaultValue={settingsData?.settings?.CAMERA_FPS?.value || '30'}
                    onChange={(e) => handleSaveSetting('CAMERA_FPS', e.target.value)}
                    className="input"
                  >
                    {[10, 15, 20, 24, 30].map(fps => <option key={fps} value={fps}>{fps} FPS</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance & System Actions Panel */}
          <div className="space-y-4">
            {/* FAISS Index Management */}
            {systemMode === 'advanced' && (
              <div className="card p-5 space-y-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary-400" />
                  Vector Index Maintenance
                </h3>
                <p className="text-xs text-gray-500">
                  If face recognition behaves inconsistently or embeddings are manually added/removed, rebuild the FAISS vector space.
                </p>
                <button
                  onClick={() => rebuildIndexMutation.mutate()}
                  disabled={rebuildIndexMutation.isPending}
                  className="btn-secondary w-full gap-2 py-2.5 text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${rebuildIndexMutation.isPending ? 'animate-spin' : ''}`} />
                  Rebuild FAISS Vector Index
                </button>
              </div>
            )}

            {/* Security Audit Trail Panel */}
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <ShieldAlert className="w-4 h-4 text-danger" />
                Security Settings
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                All login actions, registration updates, and configurations are recorded in the system audit logs.
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>JWT Session Length</span>
                  <span style={{ color: 'var(--text-primary)' }}>60 Minutes</span>
                </div>
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>Database Encryption</span>
                  <span className="text-success font-medium">Enabled (AES)</span>
                </div>
              </div>
            </div>

            {/* Appearance & Themes Card */}
            <div className="card p-5 space-y-4 relative overflow-hidden">
              {/* Subtle gradient accent */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ background: 'var(--btn-primary-bg)', borderRadius: '1rem' }}
              />
              <h3 className="font-semibold flex items-center gap-2 relative z-10" style={{ color: 'var(--text-primary)' }}>
                <Palette className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                Appearance &amp; Themes
              </h3>
              <p className="text-xs relative z-10" style={{ color: 'var(--text-secondary)' }}>
                Customize the look and feel of Face IQ. Choose from 9 premium themes.
              </p>

              {/* Active theme swatches preview */}
              <div className="flex gap-1.5 relative z-10">
                {['#1677FF','#8B5CF6','#10B981','#F59E0B','#14B8A6','#F472B6','#2563EB','#6366F1','#EC4899'].map((c,i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: 'rgba(255,255,255,0.2)' }}
                  />
                ))}
              </div>

              <div className="text-xs relative z-10" style={{ color: 'var(--text-secondary)' }}>
                Active: <span className="font-semibold capitalize" style={{ color: 'var(--primary)' }}>
                  {(theme || 'dark-blue').replace('-', ' ')}
                </span>
              </div>

              <button
                onClick={() => navigate('/settings/themes')}
                className="btn-primary w-full gap-2 py-2.5 text-sm relative z-10"
              >
                <Palette className="w-4 h-4" />
                🎨 Explore Themes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
