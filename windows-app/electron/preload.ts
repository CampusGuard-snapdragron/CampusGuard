import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Alerts
  getAlerts: (opts?: { limit?: number; offset?: number }) => ipcRenderer.invoke('alerts:getAll', opts),
  getAlertById: (id: number) => ipcRenderer.invoke('alerts:getById', id),
  getAlertStats: () => ipcRenderer.invoke('alerts:getStats'),
  deleteAlert: (id: number) => ipcRenderer.invoke('alerts:delete', id),
  addLocalAlert: (alert: any) => ipcRenderer.invoke('alerts:addLocal', alert),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),

  // LLM
  analyzeThreat: (alertData: any) => ipcRenderer.invoke('llm:analyze', alertData),
  checkOllama: () => ipcRenderer.invoke('llm:checkOllama'),

  // Events
  onNewAlert: (callback: (alert: any) => void) => {
    const handler = (_event: any, alert: any) => callback(alert)
    ipcRenderer.on('alert:new', handler)
    return () => ipcRenderer.removeListener('alert:new', handler)
  },
})
