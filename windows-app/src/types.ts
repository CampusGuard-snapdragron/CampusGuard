export interface Alert {
  id: number
  deviceId: string
  eventType: string
  modelConfidence: number
  operatorVerdict: string
  notes: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  imageBase64?: string
  llmAnalysis?: string
  timestamp: string
  acknowledged: number
}

export interface AlertStats {
  total: number
  today: number
  highSeverity: number
  activeDevices: number
  byType: { eventType: string; count: number }[]
  byHour: { hour: string; count: number }[]
}

export interface Settings {
  cloudUrl: string
  serverToken: string
  ollamaUrl: string
  ollamaModel: string
  cloudProvider: string
  cloudApiKey: string
  autoAnalyze: string
}

export interface LLMResult {
  source: 'ollama' | 'openai' | 'none'
  analysis: string
}

export interface OllamaStatus {
  connected: boolean
  models: string[]
}

declare global {
  interface Window {
    electronAPI: {
      getAlerts: (opts?: { limit?: number; offset?: number }) => Promise<Alert[]>
      getAlertById: (id: number) => Promise<Alert>
      getAlertStats: () => Promise<AlertStats>
      deleteAlert: (id: number) => Promise<{ success: boolean }>
      addLocalAlert: (alert: Partial<Alert>) => Promise<{ id: number }>
      getSettings: () => Promise<Settings>
      setSetting: (key: string, value: string) => Promise<{ success: boolean }>
      analyzeThreat: (alertData: any) => Promise<LLMResult>
      checkOllama: () => Promise<OllamaStatus>
      onNewAlert: (callback: (alert: Alert) => void) => () => void
    }
  }
}
