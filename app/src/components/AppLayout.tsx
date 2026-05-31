import { Outlet, useLocation, useNavigate } from 'react-router'
import { useState, useEffect } from 'react'
import {
  Home,
  BookOpen,
  Music,
  CalendarHeart,
  Settings,
  WifiOff,
  Wifi,
} from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

const navItems = [
  { path: '/', label: 'Today', icon: Home },
  { path: '/bible', label: 'Bible', icon: BookOpen },
  { path: '/hymns', label: 'Hymns', icon: Music },
  { path: '/devotionals', label: 'Devotionals', icon: CalendarHeart },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const [showInstall, setShowInstall] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)

  // Listen for PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (installPrompt) {
      // @ts-ignore
      installPrompt.prompt()
      // @ts-ignore
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setShowInstall(false)
      }
    }
  }

  // Hide nav bar on login page
  if (location.pathname === '/login') {
    return <Outlet />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-blue-50 flex flex-col">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="sticky top-0 z-50 bg-red-500 text-white px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium">
          <WifiOff className="w-3.5 h-3.5" />
          You are offline. Some features may be limited.
        </div>
      )}

      {/* Online indicator */}
      {isOnline && (
        <div className="sticky top-0 z-50 bg-emerald-500 text-white px-4 py-1 flex items-center justify-center gap-2 text-xs font-medium">
          <Wifi className="w-3 h-3" />
          Online
        </div>
      )}

      {/* Install prompt */}
      {showInstall && (
        <div className="sticky top-0 z-40 bg-amber-500 text-white px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-medium">Install Daily Devotional for offline access</span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInstall(false)}
              className="text-xs px-2 py-1 bg-white/20 rounded"
            >
              Later
            </button>
            <button
              onClick={handleInstall}
              className="text-xs px-3 py-1 bg-white text-amber-600 rounded font-semibold"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200/60 z-50 safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)
            const Icon = item.icon

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-amber-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-all ${
                    isActive ? 'stroke-[2.5px]' : 'stroke-2'
                  }`}
                />
                <span className={`text-[10px] font-medium ${isActive ? 'text-amber-600' : ''}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
