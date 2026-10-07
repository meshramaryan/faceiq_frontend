// Reports Page — Allows users to export daily/weekly/monthly attendance and detection logs in XLSX, CSV, and PDF formats
import { useState } from 'react'
import { FileDown, Calendar, Users, Eye, FileText, CheckCircle2 } from 'lucide-react'
import { reportsAPI } from '@/api'
import toast from 'react-hot-toast'

export default function Reports() {
  const [reportType, setReportType] = useState('attendance') // 'attendance' | 'detections'
  const [format, setFormat] = useState('xlsx') // 'xlsx' | 'csv' | 'pdf'
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [userId, setUserId] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (e) => {
    e.preventDefault()
    setIsExporting(true)

    const loadingToast = toast.loading('Generating report, please wait...')

    try {
      let response
      const params = {}
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      if (userId && reportType === 'attendance') params.user_id = Number(userId)

      if (reportType === 'attendance') {
        response = await reportsAPI.exportAttendance(format, params)
      } else {
        response = await reportsAPI.exportDetections(format, params)
      }

      // Download file blob
      const blob = new Blob([response.data], {
        type: response.headers['content-type']
      })
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      
      const fileExts = { xlsx: 'xlsx', csv: 'csv', pdf: 'pdf' }
      link.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.${fileExts[format]}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Report downloaded successfully!', { id: loadingToast })
    } catch (err) {
      toast.error('Failed to export report. Verify parameters.', { id: loadingToast })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">Reports & Exports</h2>
        <p className="section-subtitle">Generate and download audit-ready Excel, CSV, or PDF reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Side: Export Controls Form */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="font-semibold text-white mb-4">Export Parameters</h3>
          <form onSubmit={handleExport} className="space-y-4">
            {/* Report Type */}
            <div className="space-y-2">
              <label className="label">Report Type</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'attendance', label: 'Attendance Report', desc: 'Daily check-in / check-out times' },
                  { id: 'detections', label: 'Detection History', desc: 'All camera detection logs' },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setReportType(type.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      reportType === type.id
                        ? 'bg-primary-600/20 border-primary-500 text-primary-300'
                        : 'bg-surface-light border-surface-border text-gray-400 hover:border-primary-600/50'
                    }`}
                  >
                    <p className="font-semibold text-sm text-white">{type.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{type.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Date From</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="label">Date To</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>
            </div>

            {/* File Format Selection */}
            <div className="space-y-2">
              <label className="label">Format</label>
              <div className="flex gap-4">
                {[
                  { id: 'xlsx', label: 'Excel (.xlsx)' },
                  { id: 'csv', label: 'CSV (.csv)' },
                  { id: 'pdf', label: 'PDF Report (.pdf)' },
                ].map((fmt) => (
                  <label key={fmt.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                    <input
                      type="radio"
                      name="format"
                      value={fmt.id}
                      checked={format === fmt.id}
                      onChange={() => setFormat(fmt.id)}
                      className="accent-primary-500 w-4 h-4"
                    />
                    {fmt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isExporting}
                className="btn-primary w-full py-3 gap-2"
              >
                <FileDown className="w-4 h-4" />
                {isExporting ? 'Generating Report...' : 'Download Report'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Informative Card */}
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary-400" />
              Report Specifications
            </h4>
            <div className="space-y-3 text-xs text-gray-500">
              <div>
                <p className="font-medium text-white mb-0.5">Excel Sheets</p>
                <p>Features auto-fit columns and standard layout formatting for quick imports.</p>
              </div>
              <div>
                <p className="font-medium text-white mb-0.5">CSV Exports</p>
                <p>Optimized with UTF-8 BOM encoding for seamless display in Microsoft Excel.</p>
              </div>
              <div>
                <p className="font-medium text-white mb-0.5">PDF Documents</p>
                <p>Landscape A4 formatted, styled with professional headers and structured tables.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
