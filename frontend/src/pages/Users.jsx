// Users Page — Full CRUD with search, pagination, modals
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { UserPlus, Edit, Trash2, Camera, Search, CheckCircle, XCircle, Filter } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { usersAPI } from '@/api'
import { Badge, Modal, Pagination, SearchBar, LoadingSpinner, EmptyState, ConfidenceBar } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const DEPARTMENTS = ['Engineering', 'HR', 'Security', 'Management', 'Operations', 'IT']

export default function Users() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editUser, setEditUser] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => usersAPI.list({ page, page_size: 15, query: search || undefined }).then(r => r.data),
    keepPreviousData: true,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => usersAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['users'])
      toast.success('User deleted successfully')
      setDeleteConfirm(null)
    },
    onError: () => toast.error('Failed to delete user'),
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">User Management</h2>
          <p className="section-subtitle">{data?.total ?? 0} users registered</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex items-center gap-4 flex-wrap">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Search by name or employee ID..."
          className="flex-1 min-w-48"
        />
      </div>

      {/* Users Table */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner text="Loading users..." />
          </div>
        ) : !data?.items?.length ? (
          <EmptyState
            icon={UserPlus}
            title="No users found"
            description="Create your first user to get started with face registration."
            action={<button onClick={() => setShowCreate(true)} className="btn-primary">Add First User</button>}
          />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Employee ID</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Face Registered</th>
                    <th>Embeddings</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700
                                          flex items-center justify-center text-sm font-bold text-zinc-300 shrink-0">
                            {user.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.name}</p>
                            <p className="text-xs text-zinc-500">{user.email || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-zinc-300 font-medium text-xs">{user.employee_id || '—'}</td>
                      <td>{user.department || '—'}</td>
                      <td>
                        <Badge variant={user.role === 'admin' ? 'danger' : user.role === 'person' ? 'primary' : 'gray'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td>
                        {user.is_registered
                          ? <span className="flex items-center gap-1.5 text-success text-sm"><CheckCircle className="w-4 h-4" /> Yes</span>
                          : <span className="flex items-center gap-1.5 text-zinc-500 text-sm"><XCircle className="w-4 h-4" /> No</span>
                        }
                      </td>
                      <td className="font-mono text-white">{user.embedding_count}</td>
                      <td>
                        <Badge variant={user.is_active ? 'success' : 'danger'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditUser(user)} className="btn-icon btn-ghost" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(user)}
                            className="btn-icon btn-ghost text-danger hover:text-danger"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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

      {/* Create User Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add New User">
        <UserForm
          onSuccess={() => { setShowCreate(false); queryClient.invalidateQueries(['users']); toast.success('User created!') }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        <UserForm
          defaultValues={editUser}
          isEdit
          onSuccess={() => { setEditUser(null); queryClient.invalidateQueries(['users']); toast.success('User updated!') }}
          onCancel={() => setEditUser(null)}
        />
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete User" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">
            Are you sure you want to delete <span className="text-white font-semibold">{deleteConfirm?.name}</span>?
            This will also delete all face embeddings and detection history.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              className="btn-danger flex-1"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── User Form Component ────────────────────────────────────────────────────
function UserForm({ defaultValues, isEdit = false, onSuccess, onCancel }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues })
  const queryClient = useQueryClient()

  const onSubmit = async (formData) => {
    try {
      if (isEdit && defaultValues?.id) {
        // Only send fields that UserUpdate schema accepts
        // Convert empty strings → undefined so backend exclude_none skips them
        const updatePayload = {
          name:        formData.name        || undefined,
          email:       formData.email       || undefined,
          employee_id: formData.employee_id || undefined,
          department:  formData.department  || undefined,
          phone:       formData.phone       || undefined,
          notes:       formData.notes       || undefined,
          role:        formData.role        || undefined,
          is_active:   formData.is_active,
        }
        await usersAPI.update(defaultValues.id, updatePayload)
      } else {
        // Convert empty strings → null so unique-constrained columns
        // (email, username, employee_id) don't collide across users
        const createPayload = {
          name:        formData.name,
          email:       formData.email       || null,
          employee_id: formData.employee_id || null,
          department:  formData.department  || null,
          phone:       formData.phone       || null,
          notes:       formData.notes       || null,
          role:        formData.role        || 'person',
          username:    formData.username    || null,
          password:    formData.password    || null,
        }
        await usersAPI.create(createPayload)
      }
      onSuccess()
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Operation failed'
      toast.error(msg)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Full Name *</label>
          <input {...register('name', { required: 'Name is required' })} placeholder="John Doe" className="input" />
          {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Employee ID</label>
          <input {...register('employee_id')} placeholder="EMP-001" className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Email</label>
          <input {...register('email')} type="email" placeholder="john@company.com" className="input" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input {...register('phone')} placeholder="+1-555-0000" className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Department</label>
          <select {...register('department')} className="input">
            <option value="">Select department</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Role</label>
          <select {...register('role')} className="input">
            <option value="person">Person</option>
            <option value="viewer">Viewer</option>
            <option value="operator">Operator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      {!isEdit && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Username (for login)</label>
            <input {...register('username')} placeholder="johndoe" className="input" />
          </div>
          <div>
            <label className="label">Password</label>
            <input {...register('password')} type="password" placeholder="••••••••" className="input" />
          </div>
        </div>
      )}
      <div>
        <label className="label">Notes</label>
        <textarea {...register('notes')} rows={2} placeholder="Optional notes..." className="input resize-none" />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
        </button>
      </div>
    </form>
  )
}
