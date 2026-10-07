// Auth, Users, Dashboard, Detection, Reports API functions
import apiClient from './axiosClient'

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (username, password) =>
    apiClient.post('/auth/login', { username, password }),
  refresh: (refreshToken) =>
    apiClient.post('/auth/refresh', { refresh_token: refreshToken }),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
}

// ── Users ─────────────────────────────────────────────────────────────────
export const usersAPI = {
  list: (params) => apiClient.get('/users', { params }),
  get: (id) => apiClient.get(`/users/${id}`),
  create: (data) => apiClient.post('/users', data),
  update: (id, data) => apiClient.put(`/users/${id}`, data),
  delete: (id) => apiClient.delete(`/users/${id}`),
  stats: (id) => apiClient.get(`/users/${id}/stats`),
  uploadPhoto: (id, file) => {
    const fd = new FormData()
    fd.append('photo', file)
    return apiClient.post(`/users/${id}/photo`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ── Faces ─────────────────────────────────────────────────────────────────
export const facesAPI = {
  registerFromImage: (userId, file) => {
    const fd = new FormData()
    fd.append('user_id', userId)
    fd.append('image', file)
    return apiClient.post('/faces/register', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  captureFromWebcam: (userId, numSamples = 5) =>
    apiClient.post(`/faces/${userId}/capture`, null, { params: { num_samples: numSamples } }),
  getEmbeddings: (userId) => apiClient.get(`/faces/${userId}`),
  deleteEmbedding: (embeddingId) => apiClient.delete(`/faces/${embeddingId}`),
  rebuildIndex: () => apiClient.post('/faces/rebuild-index'),
  searchSimilar: (file, topK = 5) => {
    const fd = new FormData()
    fd.append('image', file)
    fd.append('top_k', topK)
    return apiClient.post('/faces/search-similar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ── Detection Logs ────────────────────────────────────────────────────────
export const detectionAPI = {
  getLogs: (params) => apiClient.get('/detection/logs', { params }),
  getLog: (id) => apiClient.get(`/detection/logs/${id}`),
  getStats: () => apiClient.get('/detection/stats'),
  getCameras: () => apiClient.get('/detection/cameras'),
  startCamera: (id) => apiClient.post(`/detection/cameras/${id}/start`),
  stopCamera: (id) => apiClient.post(`/detection/cameras/${id}/stop`),
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => apiClient.get('/dashboard/stats'),
  getChartData: () => apiClient.get('/dashboard/chart-data'),
}

// ── Reports ───────────────────────────────────────────────────────────────
export const reportsAPI = {
  exportAttendance: (format, params) =>
    apiClient.get('/reports/attendance', {
      params: { format, ...params },
      responseType: 'blob',
    }),
  exportDetections: (format, params) =>
    apiClient.get('/reports/detections', {
      params: { format, ...params },
      responseType: 'blob',
    }),
}

// ── Unknown Faces ─────────────────────────────────────────────────────────
export const unknownAPI = {
  list: (params) => apiClient.get('/unknown', { params }),
  review: (id, notes) => apiClient.post(`/unknown/${id}/review`, null, { params: { notes } }),
  convert: (id, userId) => apiClient.post(`/unknown/${id}/convert`, null, { params: { user_id: userId } }),
  delete: (id) => apiClient.delete(`/unknown/${id}`),
}

// ── Settings ──────────────────────────────────────────────────────────────
export const settingsAPI = {
  getAll: () => apiClient.get('/settings'),
  update: (key, value) => apiClient.put(`/settings/${key}`, null, { params: { value } }),
}

// ── Employee Monitoring ───────────────────────────────────────────────────
export const employeeMonitoringAPI = {
  getStations: () => apiClient.get('/employee-monitoring/stations'),
  updateStations: (data) => apiClient.put('/employee-monitoring/stations', data),
  updateSettings: (data) => apiClient.put('/employee-monitoring/stations', data),
  resetTimers: () => apiClient.post('/employee-monitoring/reset-timers'),
  processFrame: (base64Image = null, useSample = false) =>
    apiClient.post('/employee-monitoring/process-frame', {
      image_base64: base64Image,
      use_sample: useSample,
    }),
}

// ── Health ────────────────────────────────────────────────────────────────
export const systemAPI = {
  health: () => apiClient.get('/health', { baseURL: 'http://127.0.0.1:8000' }),
}

