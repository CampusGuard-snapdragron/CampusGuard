// Web Shim for CampusGuard Electron Dashboard
// Mock the 'electronAPI' interface using standard fetch() and Web APIs

const API_BASE = "https://campusguard-server-production.up.railway.app"
const AUTH_TOKEN = "8bb29658ad048ef57e46d5665bf6c9014aa9f6d62c776e06261a8ef8541caa24"

async function apiRequest(path: string, options: RequestInit = {}) {
  const headers = {
    'x-campusguard-token': AUTH_TOKEN,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`API Error ${res.status}: ${error}`)
  }
  return res.json()
}

export const webAPI = {
  // Alerts
  getAlerts: (opts?: { limit?: number; offset?: number }) => {
    const params = new URLSearchParams()
    if (opts?.limit) params.set('limit', String(opts.limit))
    if (opts?.offset) params.set('offset', String(opts.offset))
    return apiRequest(`/alerts?${params.toString()}`)
  },
  getAlertById: (id: number) => apiRequest(`/alerts/${id}`),
  getAlertStats: () => apiRequest('/alerts/stats'),
  deleteAlert: (id: number) => apiRequest(`/alerts/${id}`, { method: 'DELETE' }),
  addLocalAlert: (alert: any) => apiRequest('/alert', { method: 'POST', body: JSON.stringify(alert) }),

  // Settings
  getSettings: async () => ({
    cloudUrl: API_BASE,
    serverToken: AUTH_TOKEN,
    autoAnalyze: 'true',
    cloudProvider: 'none'
  }),
  setSetting: async () => ({ success: true }),

  // LLM (Web version uses cloud fallback directly if no Ollama)
  analyzeThreat: async (alertData: any) => {
    // For now, in web mode, we rely on the Backend to have triggered analysis 
    // or we could call a server-side LLM endpoint if added later.
    return { source: 'none', analysis: 'Desktop LLM (Ollama) is only available in the Windows App. Please check the Android app for Snapdragon on-device analysis.' }
  },
  checkOllama: async () => ({ connected: false, models: [] }),

  // Events (Polling fallback for web)
  onNewAlert: (callback: (alert: any) => void) => {
    let lastId = 0
    const poll = async () => {
      try {
        const alerts = await webAPI.getAlerts({ limit: 1 })
        if (alerts.length > 0 && alerts[0].id > lastId) {
          if (lastId !== 0) callback(alerts[0])
          lastId = alerts[0].id
        }
      } catch (e) { console.error("Poll failed", e) }
    }
    const interval = setInterval(poll, 5000)
    poll()
    return () => clearInterval(interval)
  },
}

// Global injection
if (typeof window !== 'undefined' && !window.electronAPI) {
  (window as any).electronAPI = webAPI
  console.log("🚀 CampusGuard Web-Shim Active")
}
