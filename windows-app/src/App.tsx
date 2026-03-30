import { useState, useEffect } from 'react'
import { Shield, LayoutDashboard, Camera, Settings, Bell } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import CameraPage from './pages/CameraPage'
import SettingsPage from './pages/SettingsPage'
import type { Alert } from './types'

type Page = 'dashboard' | 'camera' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [newAlertCount, setNewAlertCount] = useState(0)

  useEffect(() => {
    if (!window.electronAPI) return
    const unsubscribe = window.electronAPI.onNewAlert((_alert: Alert) => {
      if (page !== 'dashboard') {
        setNewAlertCount(c => c + 1)
      }
    })
    return unsubscribe
  }, [page])

  useEffect(() => {
    if (page === 'dashboard') setNewAlertCount(0)
  }, [page])

  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'camera', label: 'Camera', icon: <Camera size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ]

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Titlebar drag area */}
        <div className="titlebar-drag h-8" />

        {/* Logo */}
        <div className="px-6 py-4 flex items-center gap-3">
          <Shield className="text-indigo-400" size={28} />
          <div>
            <h1 className="text-lg font-bold text-white">CampusGuard</h1>
            <p className="text-xs text-gray-500">Security Dashboard</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`titlebar-no-drag w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                page === item.id
                  ? 'bg-indigo-600/20 text-indigo-300'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {item.icon}
              {item.label}
              {item.id === 'dashboard' && newAlertCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {newAlertCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Server status */}
        <div className="px-4 py-3 border-t border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Bell size={14} />
            <span>Server running on :8787</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {page === 'dashboard' && <Dashboard />}
        {page === 'camera' && <CameraPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
