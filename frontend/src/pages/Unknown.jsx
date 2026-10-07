// Unknown Faces Page — gallery of unknown faces with review, convert, and delete actions
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, Check, Trash2, UserPlus, AlertCircle, HelpCircle } from 'lucide-react'
import { unknownAPI, usersAPI } from '@/api'
import { Badge, Modal, Pagination, LoadingSpinner, EmptyState } from '@/components/ui'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function Unknown() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [activeFace, setActiveFace] = useState(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [showAssign, setShowAssign] = useState(false)

  // 1. Fetch unknown faces
  const { data, isLoading } = useQuery({
    queryKey: ['unknown-faces', page],
    queryFn: () => unknownAPI.list({ page, page_size: 12, reviewed: false }).then(r => r.data),
    keepPreviousData: true,
  })

  // 2. Fetch users list for conversion assignment
  const { data: usersData } = useQuery({
    queryKey: ['users-assignment'],
    queryFn: () => usersAPI.list({ page: 1, page_size: 100 }).then(r => r.data),
    enabled: showAssign,
  })

  // Mutations
  const reviewMutation = useMutation({
    mutationFn: ({ id, notes }) => unknownAPI.review(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries(['unknown-faces'])
      toast.success('Face marked as reviewed')
      setActiveFace(null)
      setReviewNotes('')
    },
    onError: () => toast.error('Failed to update face status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => unknownAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['unknown-faces'])
      toast.success('Unknown face deleted')
      setActiveFace(null)
    },
    onError: () => toast.error('Failed to delete face'),
  })

  const convertMutation = useMutation({
    mutationFn: ({ id, userId }) => unknownAPI.convert(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries(['unknown-faces'])
      queryClient.invalidateQueries(['users'])
      toast.success('Face successfully assigned to user!')
      setActiveFace(null)
      setShowAssign(false)
      setSelectedUserId('')
    },
    onError: () => toast.error('Failed to assign face to user'),
  })

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">Unknown Faces</h2>
        <p className="section-subtitle">Review unrecognized detections and associate them with users</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner text="Loading unknown faces..." />
        </div>
      ) : !data?.items?.length ? (
        <EmptyState
          icon={HelpCircle}
          title="No unknown faces detected"
          description="Everything is quiet. No unrecognized faces have been detected by the system."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.items.map((face) => (
              <motion.div
                key={face.id}
                whileHover={{ y: -2 }}
                className="card-hover overflow-hidden flex flex-col"
              >
                {/* Face Thumbnail */}
                <div className="relative aspect-square bg-dark-950">
                  {face.image_path ? (
                    <img
                      src={`http://127.0.0.1:8000/static/unknown/${face.image_path.split('/').pop()}`}
                      alt="Unknown Face"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <HelpCircle className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="warning">Unreviewed</Badge>
                  </div>
                </div>

                {/* Metadata */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">
                      Detected: {face.detected_at ? format(new Date(face.detected_at), 'yyyy-MM-dd HH:mm:ss') : '—'}
                    </p>
                    <p className="text-xs text-gray-500">Camera ID: <span className="text-white font-mono">{face.camera_id}</span></p>
                    {face.emotion && <p className="text-xs text-gray-500">Emotion: <span className="text-white capitalize">{face.emotion}</span></p>}
                    {face.age && <p className="text-xs text-gray-500">Age Est: <span className="text-white">{face.age}</span></p>}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-surface-border/50">
                    <button
                      onClick={() => setActiveFace(face)}
                      className="btn-secondary flex-1 py-1.5 text-xs gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> Details
                    </button>
                    <button
                      onClick={() => { setActiveFace(face); setShowAssign(true) }}
                      className="btn-primary flex-1 py-1.5 text-xs gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Assign
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <Pagination page={page} totalPages={data?.total_pages} onPageChange={setPage} />
        </>
      )}

      {/* Detail & Review Modal */}
      <Modal isOpen={!!activeFace && !showAssign} onClose={() => setActiveFace(null)} title="Face Review Details">
        {activeFace && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="w-36 h-36 rounded-xl overflow-hidden bg-dark-950 border border-surface-border shrink-0">
                <img
                  src={`http://127.0.0.1:8000/static/unknown/${activeFace.image_path.split('/').pop()}`}
                  alt="Review Target"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 space-y-2 text-sm text-gray-400">
                <p>Detection ID: <span className="text-white font-mono">{activeFace.id}</span></p>
                <p>Timestamp: <span className="text-white">{activeFace.detected_at ? format(new Date(activeFace.detected_at), 'yyyy-MM-dd HH:mm:ss') : '—'}</span></p>
                <p>Camera source: <span className="text-white">Camera {activeFace.camera_id}</span></p>
                {activeFace.gender && <p>Gender Estimate: <span className="text-white">{activeFace.gender}</span></p>}
                {activeFace.age && <p>Age Estimate: <span className="text-white">{activeFace.age} years</span></p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="label">Add Review Notes</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="E.g., Delivery person, ignored, or check database log..."
                className="input resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 border-t border-surface-border pt-4">
              <button
                onClick={() => deleteMutation.mutate(activeFace.id)}
                disabled={deleteMutation.isPending}
                className="btn-danger gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Delete Record
              </button>
              <button
                onClick={() => { setShowAssign(true) }}
                className="btn-secondary gap-1.5 flex-1"
              >
                <UserPlus className="w-4 h-4" /> Assign to Registered User
              </button>
              <button
                onClick={() => reviewMutation.mutate({ id: activeFace.id, notes: reviewNotes })}
                disabled={reviewMutation.isPending}
                className="btn-primary gap-1.5"
              >
                <Check className="w-4 h-4" /> Mark Reviewed
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Conversion Assignment Modal */}
      <Modal isOpen={showAssign} onClose={() => { setShowAssign(false); setSelectedUserId('') }} title="Assign Face to User">
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-surface-light p-3 rounded-xl border border-surface-border">
            {activeFace?.image_path && (
              <img
                src={`http://127.0.0.1:8000/static/unknown/${activeFace.image_path.split('/').pop()}`}
                alt="Face crop"
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div>
              <p className="text-sm font-semibold text-white">Associate with Registered Person</p>
              <p className="text-xs text-gray-500">This will add the face embedding to the target user's profile for future recognition.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="label">Select Target User</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="input"
            >
              <option value="">Choose a user...</option>
              {usersData?.items?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.employee_id ? `(${u.employee_id})` : ''} — {u.department || 'No dept'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 border-t border-surface-border pt-4">
            <button
              onClick={() => { setShowAssign(false); setSelectedUserId('') }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={() => convertMutation.mutate({ id: activeFace.id, userId: Number(selectedUserId) })}
              disabled={!selectedUserId || convertMutation.isPending}
              className="btn-primary flex-1 gap-1.5"
            >
              {convertMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
