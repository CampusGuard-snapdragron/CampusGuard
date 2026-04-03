import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Shield, Smartphone, Clock, Brain, RefreshCw, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { Alert, AlertStats, LLMResult } from '../types'

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
}

const SEVERITY_BG = {
  critical: 'bg-red-500/10 border-red-500/30 text-red-400',
  high: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
  medium: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  low: 'bg-green-500/10 border-green-500/30 text-green-400',
}

export default function Dashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<AlertStats | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [llmResult, setLlmResult] = useState<LLMResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!window.electronAPI) return
    try {
      const [alertsData, statsData] = await Promise.all([
        window.electronAPI.getAlerts({ limit: 50 }),
        window.electronAPI.getAlertStats(),
      ])
      setAlerts(alertsData)
      setStats(statsData)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Listen for new alerts
  useEffect(() => {
    if (!window.electronAPI) return
    const unsubscribe = window.electronAPI.onNewAlert((alert: Alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50))
      loadData() // refresh stats
    })
    return unsubscribe
  }, [loadData])

  const analyzeAlert = async (alert: Alert) => {
    setSelectedAlert(alert)
    setAnalyzing(true)
    setLlmResult(null)
    try {
      const result = await window.electronAPI.analyzeThreat(alert)
      setLlmResult(result)
    } catch (err) {
      setLlmResult({ source: 'none', analysis: 'Analysis failed: ' + String(err) })
    } finally {
      setAnalyzing(false)
    }
  }

  const deleteAlert = async (id: number) => {
    await window.electronAPI.deleteAlert(id)
    setAlerts(prev => prev.filter(a => a.id !== id))
    if (selectedAlert?.id === id) {
      setSelectedAlert(null)
      setLlmResult(null)
    }
    loadData()
  }

  const PIE_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-indigo-400" size={32} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Security Dashboard</h2>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Total Alerts"
          value={stats?.total ?? 0}
          color="text-indigo-400"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Today"
          value={stats?.today ?? 0}
          color="text-blue-400"
        />
        <StatCard
          icon={<Shield size={20} />}
          label="High Severity"
          value={stats?.highSeverity ?? 0}
          color="text-red-400"
        />
        <StatCard
          icon={<Smartphone size={20} />}
          label="Active Devices"
          value={stats?.activeDevices ?? 0}
          color="text-green-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Alerts by Hour */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Alerts by Hour (Last 24h)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.byHour ?? []}>
              <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts by Type */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Alert Types</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={stats?.byType ?? []}
                dataKey="count"
                nameKey="eventType"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ eventType, count }) => `${String(eventType).slice(0, 15)} (${count})`}
                labelLine={false}
              >
                {(stats?.byType ?? []).map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main content: alerts list + analysis panel */}
      <div className="grid grid-cols-3 gap-4">
        {/* Alert List */}
        <div className="col-span-2 space-y-2">
          <h3 className="text-sm font-semibold text-gray-400">Recent Alerts</h3>
          {alerts.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
              No alerts yet. Alerts from connected Android devices will appear here.
            </div>
          ) : (
            alerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all hover:bg-gray-800/80 ${
                  selectedAlert?.id === alert.id ? 'border-indigo-500 ring-1 ring-indigo-500/30' : 'border-gray-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${SEVERITY_BG[alert.severity]}`}>
                        {alert.severity}
                      </span>
                      <span className="text-sm font-medium">{alert.eventType}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Device: {alert.deviceId?.slice(0, 8)}...</span>
                      <span>Confidence: {((alert.modelConfidence || 0) * 100).toFixed(0)}%</span>
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); analyzeAlert(alert) }}
                      className="p-1.5 hover:bg-indigo-600/20 rounded-lg transition-colors"
                      title="Analyze with LLM"
                    >
                      <Brain size={16} className="text-indigo-400" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteAlert(alert.id) }}
                      className="p-1.5 hover:bg-red-600/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* LLM Analysis Panel */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
            <Brain size={16} /> Threat Analysis
          </h3>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            {analyzing ? (
              <div className="flex items-center gap-3 text-gray-400">
                <RefreshCw className="animate-spin" size={16} />
                <span className="text-sm">Analyzing threat...</span>
              </div>
            ) : selectedAlert?.llmAnalysis ? (
              /* Show on-device analysis from phone */
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-0.5 bg-emerald-600/20 text-emerald-300 rounded-full">
                    On-Device AI (Snapdragon)
                  </span>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {selectedAlert.llmAnalysis}
                </p>
                <button
                  onClick={() => analyzeAlert(selectedAlert)}
                  className="mt-3 text-xs text-gray-500 hover:text-indigo-400 transition-colors"
                >
                  Re-analyze with desktop LLM
                </button>
              </div>
            ) : llmResult ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-0.5 bg-indigo-600/20 text-indigo-300 rounded-full">
                    {llmResult.source === 'ollama' ? 'Ollama (Local)' : llmResult.source === 'openai' ? 'OpenAI (Cloud)' : 'Unavailable'}
                  </span>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {llmResult.analysis}
                </p>
              </div>
            ) : selectedAlert ? (
              <div className="text-center py-4">
                <p className="text-xs text-gray-500 mb-3">No AI analysis from device</p>
                <button
                  onClick={() => analyzeAlert(selectedAlert)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Analyze This Alert
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Select an alert to view analysis
              </p>
            )}
          </div>

          {/* Selected alert image preview */}
          {selectedAlert?.imageBase64 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-400 mb-2">Captured Frame</h4>
              <img
                src={`data:image/jpeg;base64,${selectedAlert.imageBase64}`}
                alt="Alert frame"
                className="w-full rounded-lg"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className={`flex items-center gap-2 mb-1 ${color}`}>
        {icon}
        <span className="text-xs font-medium text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
