import { useState, useEffect } from 'react'
import { Settings, Wifi, WifiOff, Brain, Key, Server, Save, CheckCircle } from 'lucide-react'
import type { OllamaStatus, Settings as SettingsType } from '../types'

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsType>({
    serverPort: '8787',
    serverToken: 'demo-token',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.2',
    cloudProvider: 'none',
    cloudApiKey: '',
    autoAnalyze: 'true',
  })
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({ connected: false, models: [] })
  const [saved, setSaved] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    loadSettings()
    checkOllama()
  }, [])

  const loadSettings = async () => {
    if (!window.electronAPI) return
    const s = await window.electronAPI.getSettings()
    setSettings(prev => ({ ...prev, ...s }))
  }

  const checkOllama = async () => {
    if (!window.electronAPI) return
    setChecking(true)
    try {
      const status = await window.electronAPI.checkOllama()
      setOllamaStatus(status)
    } catch {
      setOllamaStatus({ connected: false, models: [] })
    } finally {
      setChecking(false)
    }
  }

  const saveSetting = async (key: string, value: string) => {
    if (!window.electronAPI) return
    setSettings(prev => ({ ...prev, [key]: value }))
    await window.electronAPI.setSetting(key, value)
  }

  const saveAll = async () => {
    if (!window.electronAPI) return
    for (const [key, value] of Object.entries(settings)) {
      await window.electronAPI.setSetting(key, value)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Settings size={24} /> Settings
      </h2>

      {/* Server Config */}
      <Section title="Alert Server" icon={<Server size={18} />}>
        <Field label="Port" description="Port the Express server listens on for incoming alerts from Android devices">
          <input
            type="text"
            value={settings.serverPort}
            onChange={e => setSettings(prev => ({ ...prev, serverPort: e.target.value }))}
            className="input-field"
          />
        </Field>
        <Field label="Auth Token" description="Must match x-campusguard-token header from Android app">
          <input
            type="text"
            value={settings.serverToken}
            onChange={e => setSettings(prev => ({ ...prev, serverToken: e.target.value }))}
            className="input-field"
          />
        </Field>
      </Section>

      {/* Ollama Config */}
      <Section title="Ollama (Local LLM)" icon={<Brain size={18} />}>
        <div className="flex items-center gap-3 mb-4">
          {ollamaStatus.connected ? (
            <span className="flex items-center gap-2 text-sm text-green-400">
              <Wifi size={16} /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm text-red-400">
              <WifiOff size={16} /> Not connected
            </span>
          )}
          <button
            onClick={checkOllama}
            disabled={checking}
            className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {checking ? 'Checking...' : 'Check Connection'}
          </button>
        </div>

        <Field label="Ollama URL">
          <input
            type="text"
            value={settings.ollamaUrl}
            onChange={e => setSettings(prev => ({ ...prev, ollamaUrl: e.target.value }))}
            className="input-field"
          />
        </Field>

        <Field label="Model">
          {ollamaStatus.models.length > 0 ? (
            <select
              value={settings.ollamaModel}
              onChange={e => setSettings(prev => ({ ...prev, ollamaModel: e.target.value }))}
              className="input-field"
            >
              {ollamaStatus.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={settings.ollamaModel}
              onChange={e => setSettings(prev => ({ ...prev, ollamaModel: e.target.value }))}
              className="input-field"
              placeholder="e.g. llama3.2"
            />
          )}
        </Field>
      </Section>

      {/* Cloud Fallback */}
      <Section title="Cloud API Fallback" icon={<Key size={18} />}>
        <Field label="Provider">
          <select
            value={settings.cloudProvider}
            onChange={e => setSettings(prev => ({ ...prev, cloudProvider: e.target.value }))}
            className="input-field"
          >
            <option value="none">None (Ollama only)</option>
            <option value="openai">OpenAI</option>
          </select>
        </Field>
        {settings.cloudProvider !== 'none' && (
          <Field label="API Key">
            <input
              type="password"
              value={settings.cloudApiKey}
              onChange={e => setSettings(prev => ({ ...prev, cloudApiKey: e.target.value }))}
              className="input-field"
              placeholder="sk-..."
            />
          </Field>
        )}
      </Section>

      {/* Auto-analyze toggle */}
      <Section title="Automation" icon={<CheckCircle size={18} />}>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoAnalyze === 'true'}
            onChange={e => setSettings(prev => ({ ...prev, autoAnalyze: e.target.checked ? 'true' : 'false' }))}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800"
          />
          <span className="text-sm">Auto-analyze new alerts with LLM</span>
        </label>
      </Section>

      {/* Save */}
      <button
        onClick={saveAll}
        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
      >
        {saved ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> Save Settings</>}
      </button>

      <style>{`
        .input-field {
          width: 100%;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #e5e7eb;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus {
          border-color: #6366f1;
        }
      `}</style>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-4">
        {icon} {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {description && <p className="text-xs text-gray-600 mb-2">{description}</p>}
      {children}
    </div>
  )
}
