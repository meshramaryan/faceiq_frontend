// Detection Logs Page
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { FileText, Filter, Download } from 'lucide-react'
import { detectionAPI } from '@/api'
import { useSettingsStore } from '@/store'
import { Badge, ConfidenceBar, Pagination, SearchBar, LoadingSpinner, EmptyState } from '@/components/ui'

export default function Logs() {
  const { systemMode } = useSettingsStore()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ is_unknown: undefined })

  const { data, isLoading } = useQuery({
    queryKey: ['detection-logs', page, search, filters],
    queryFn: () => detectionAPI.getLogs({
      page, page_size: 25,
      name: search || undefined,
      ...filters,
    }).then(r => r.data),
    keepPreviousData: true,
    refetchInterval: 15_000,
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Detection Logs</h2>
          <p className="section-subtitle">{data?.total ?? 0} total detections</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex items-center gap-4 flex-wrap">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by name..." className="flex-1 min-w-48" />
        <select
          className="input w-40"
          value={filters.is_unknown === undefined ? '' : String(filters.is_unknown)}
          onChange={(e) => setFilters(f => ({ ...f, is_unknown: e.target.value === '' ? undefined : e.target.value === 'true' }))}
        >
          <option value="">All Faces</option>
          <option value="false">Known Only</option>
          <option value="true">Unknown Only</option>
        </select>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><LoadingSpinner text="Loading logs..." /></div>
        ) : !data?.items?.length ? (
          <EmptyState icon={FileText} title="No detection logs" description="Detections will appear here once the camera is active." />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Face</th>
                    <th>Name</th>
                    <th>Confidence</th>
                    <th>Date & Time</th>
                    <th>Camera</th>
                    {systemMode === 'advanced' && (
                      <>
                        <th>Emotion</th>
                        <th>Age/Gender</th>
                        <th>Liveness</th>
                        <th>Quality</th>
                      </>
                    )}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden border border-white/[0.04]">
                          {log.image_path ? (
                            <img
                              src={`http://127.0.0.1:8000/static/logs/${log.image_path?.split('/').pop()}`}
                              alt={log.detected_name}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm font-bold">
                              {log.detected_name[0]}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="font-medium text-white">{log.detected_name}</td>
                      <td className="w-28"><ConfidenceBar value={log.confidence} size="sm" /></td>
                      <td className="text-xs font-mono text-zinc-500">
                        {log.detected_at ? (
                          <>
                            <p>{format(new Date(log.detected_at), 'yyyy-MM-dd')}</p>
                            <p>{format(new Date(log.detected_at), 'HH:mm:ss')}</p>
                          </>
                        ) : '—'}
                      </td>
                      <td className="font-mono text-zinc-300 font-medium text-xs">Cam {log.camera_id}</td>
                      {systemMode === 'advanced' && (
                        <>
                          <td className="capitalize">{log.emotion || '—'}</td>
                          <td className="text-xs text-zinc-400">
                            {log.age && log.gender ? `${log.age}y • ${log.gender}` : '—'}
                          </td>
                          <td>
                            {log.is_spoof === true ? <Badge variant="danger">Spoof</Badge>
                              : log.is_live === true ? <Badge variant="success">Live</Badge>
                              : <span className="text-zinc-650 text-xs">—</span>
                            }
                          </td>
                          <td className="text-xs font-mono">
                            {log.quality_score ? `${(log.quality_score * 100).toFixed(0)}%` : '—'}
                          </td>
                        </>
                      )}
                      <td>
                        <Badge variant={log.user_id ? 'success' : 'warning'}>
                          {log.user_id ? 'Known' : 'Unknown'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-4">
              <Pagination page={page} totalPages={data?.total_pages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
