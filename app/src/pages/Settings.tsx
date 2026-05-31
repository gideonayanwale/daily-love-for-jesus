import { useNavigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import {
  User,
  BookOpen,
  Music,
  Heart,
  LogOut,
  LogIn,
  Wifi,
  WifiOff,
  Download,
  Sparkles,
} from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export default function Settings() {
  const { user, isAuthenticated, logout } = useAuth()
  const isOnline = useOnlineStatus()
  const navigate = useNavigate()

  const handleInstall = async () => {
    // @ts-ignore
    if (window.deferredPrompt) {
      // @ts-ignore
      window.deferredPrompt.prompt()
      // @ts-ignore
      const { outcome } = await window.deferredPrompt.userChoice
      if (outcome === 'accepted') {
        // @ts-ignore
        window.deferredPrompt = null
      }
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500 text-sm">
          Manage your preferences
        </p>
      </header>

      {/* User Profile */}
      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isAuthenticated && user ? (
          <div className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name ?? ''}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-amber-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800">
                {user.name ?? 'User'}
              </h3>
              <p className="text-gray-500 text-xs">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1 px-3 py-1.5 text-red-500 text-xs font-medium hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <LogIn className="w-6 h-6 text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-700">
                Sign in to your account
              </h3>
              <p className="text-gray-400 text-xs">
                Save favorites and track your reading
              </p>
            </div>
            <LogIn className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </section>

      {/* Quick Navigation */}
      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
            Quick Links
          </h2>
          <button
            onClick={() => navigate('/bible')}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-colors text-left"
          >
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 text-sm">
                Read Bible
              </h3>
              <p className="text-gray-400 text-xs">
                KJV - 66 books, 31,100 verses
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate('/hymns')}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 transition-colors text-left"
          >
            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
              <Music className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 text-sm">
                Baptist Hymnal
              </h3>
              <p className="text-gray-400 text-xs">
                101 classic hymns
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate('/devotionals')}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-amber-50 transition-colors text-left"
          >
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 text-sm">
                Devotionals
              </h3>
              <p className="text-gray-400 text-xs">
                Daily spiritual nourishment
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* App Info */}
      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
            App Info
          </h2>

          <div className="flex items-center gap-3 p-3 rounded-xl">
            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-emerald-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 text-sm">
                Status
              </h3>
              <p className="text-gray-400 text-xs">
                {isOnline
                  ? 'Connected to the internet'
                  : 'Offline mode active'}
              </p>
            </div>
          </div>

          {/* PWA Install */}
          <button
            onClick={handleInstall}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
              <Download className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 text-sm">
                Install App
              </h3>
              <p className="text-gray-400 text-xs">
                Add to home screen for offline access
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* About */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4 text-center space-y-3">
        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-amber-200/50">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">Daily Devotional</h3>
          <p className="text-gray-500 text-xs mt-0.5">
            Version 1.0.0
          </p>
        </div>
        <p className="text-gray-400 text-xs leading-relaxed max-w-xs mx-auto">
          A cross-platform devotional app featuring the King James Version
          Bible, Baptist Hymnal collection, and daily devotionals delivered
          from Telegram.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
          <span>KJV Bible</span>
          <span>&middot;</span>
          <span>101 Hymns</span>
          <span>&middot;</span>
          <span>Telegram Integration</span>
        </div>
      </section>

      {/* Bottom spacing */}
      <div className="h-8" />
    </div>
  )
}
