import { useState, useEffect, useCallback } from 'react'
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
  Database,
  RefreshCw,
} from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { supabase } from '@/lib/supabase'

export default function Settings() {
  const { user, isAuthenticated, logout } = useAuth()
  const isOnline = useOnlineStatus()
  const navigate = useNavigate()

  const [dbHealth, setDbHealth] = useState<{
    status: string;
    databases: {
      neon: { connected: boolean; latencyMs?: number; error?: string };
      supabase: { connected: boolean; latencyMs?: number; error?: string };
    };
  } | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const fetchDbHealth = useCallback(async () => {
    setIsHealthLoading(true);
    try {
      const res = await fetch('/api/sync/health');
      if (res.ok) {
        const data = await res.json();
        setDbHealth(data);
      }
    } catch {
      // Quiet fail if offline or API unreachable
    } finally {
      setIsHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDbHealth();
  }, [fetchDbHealth]);

  const handleRunSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/sync/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ direction: 'all' }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSyncFeedback(`Successfully synced ${data.totalRowsSynced} rows across tables.`);
        fetchDbHealth();
      } else {
        setSyncFeedback(data.error || 'Sync completed with warnings.');
      }
    } catch (err: any) {
      setSyncFeedback(err.message || 'Sync request failed.');
    } finally {
      setIsSyncing(false);
    }
  };

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">Settings & Sync</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Manage your account, offline preferences, and database synchronization
        </p>
      </div>

      {/* User Profile */}
      <section className="bg-white dark:bg-[#0c0c0f] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
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

      {/* Dual Database Sync Section */}
      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Database className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">
                  Dual Database Sync
                </h2>
                <p className="text-[11px] text-gray-400">
                  Neon PostgreSQL &harr; Supabase Sync Engine
                </p>
              </div>
            </div>
            <button
              onClick={fetchDbHealth}
              disabled={isHealthLoading}
              title="Refresh database connectivity"
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isHealthLoading ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
              <div className="flex items-center gap-1.5 mb-1 font-semibold text-gray-700">
                <span className={`w-2 h-2 rounded-full ${dbHealth?.databases?.neon?.connected ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-amber-400'}`} />
                Neon DB
              </div>
              <p className="text-gray-500 text-[11px] truncate">
                {dbHealth?.databases?.neon?.connected
                  ? `Active (${dbHealth.databases.neon.latencyMs ?? 0}ms)`
                  : dbHealth?.databases?.neon?.error || 'Standby'}
              </p>
            </div>

            <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
              <div className="flex items-center gap-1.5 mb-1 font-semibold text-gray-700">
                <span className={`w-2 h-2 rounded-full ${dbHealth?.databases?.supabase?.connected ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-amber-400'}`} />
                Supabase DB
              </div>
              <p className="text-gray-500 text-[11px] truncate">
                {dbHealth?.databases?.supabase?.connected
                  ? `Active (${dbHealth.databases.supabase.latencyMs ?? 0}ms)`
                  : dbHealth?.databases?.supabase?.error || 'Standby'}
              </p>
            </div>
          </div>

          {syncFeedback && (
            <div className="text-xs bg-amber-50 text-amber-900 p-2.5 rounded-xl border border-amber-200">
              {syncFeedback}
            </div>
          )}

          <button
            onClick={handleRunSync}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing Tables...' : 'Sync Databases Now'}
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
