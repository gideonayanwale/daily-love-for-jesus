import { useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Loader2, Calendar, Bookmark, BookOpen, Music, CalendarHeart, Users, Settings, ShieldCheck, ArrowRight, Share2, Heart } from 'lucide-react';

function getRoleBadge(role?: string) {
  if (role === 'admin') {
    return { label: 'Administrator', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' };
  }
  if (role === 'superadmin') {
    return { label: 'Super Administrator', className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' };
  }
  if (role === 'elevated_admin') {
    return { label: 'Elevated Admin', className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' };
  }
  if (role === 'user') {
    return { label: 'member', className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' };
  }
  return { label: 'Member', className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const today = new Date();

  const { data: devotional, isLoading: devLoading } = trpc.devotional.today.useQuery();

  const { data: favorites } = trpc.favorite.list.useQuery(
    { userId: user?.id ?? '' },
    { enabled: !!user }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  const roleBadge = getRoleBadge(user?.role);

  const quickLinks = [
    { label: 'Bible', path: '/bible', Icon: BookOpen, color: 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' },
    { label: 'Hymns', path: '/hymns', Icon: Music, color: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' },
    { label: 'Devotionals', path: '/devotionals', Icon: CalendarHeart, color: 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' },
    { label: 'Community', path: '/community', Icon: Users, color: 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400' },
    { label: 'Settings', path: '/settings', Icon: Settings, color: 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400' },
    ...(user?.role === 'admin' || user?.role === 'elevated_admin' || user?.role === 'superadmin'
      ? [{ label: 'Admin Panel', path: '/admin/devotionals', Icon: ShieldCheck, color: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' }]
      : []),
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{format(today, 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Welcome back, {user?.name || user?.email}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadge.className}`}>
              {roleBadge.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/devotionals')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-medium text-xs transition-colors shadow-sm"
          >
            <span>Past Devotionals</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Favorites count */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Saved Favorites
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Bookmark className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50">
              {favorites?.length ?? 0}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
            Items you've saved
          </p>
        </div>

        {/* Today's Devotional */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Devotional
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Heart className="w-4 h-4 fill-current" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50">
              {devotional ? 'Ready' : 'Pending'}
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              Today
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {devotional ? devotional.title : 'Updated each morning'}
          </p>
        </div>
      </div>

      {/* ── Today's Devotional Card ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                Today&apos;s Devotional
              </h3>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                Spiritual Food for the Soul
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/devotionals')}
            className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 hover:underline"
          >
            <span>View Library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {devLoading ? (
          <div className="space-y-4 py-6 animate-pulse">
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
            <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        ) : devotional ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                {devotional.title}
              </h2>
              {devotional.scripture && (
                <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                  {devotional.scripture}
                </div>
              )}
            </div>

            {devotional.scriptureText && (
              <blockquote className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border-l-4 border-amber-500 text-xs italic text-zinc-600 dark:text-zinc-300 font-serif">
                &ldquo;{devotional.scriptureText}&rdquo;
              </blockquote>
            )}

            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 line-clamp-6">
              {devotional.body}
            </p>

            {devotional.prayer && (
              <div className="p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-1">
                  Prayer of Faith
                </span>
                <p className="text-xs italic text-zinc-700 dark:text-zinc-300 font-serif leading-relaxed line-clamp-3">
                  {devotional.prayer}
                </p>
              </div>
            )}

            {devotional.dailyCapsule && (
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 block mb-1">
                  Daily Capsule
                </span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {devotional.dailyCapsule}
                </p>
              </div>
            )}

            {devotional.declarationOfFaith && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-1">
                  Declaration of Faith
                </span>
                <p className="text-xs italic font-bold text-zinc-900 dark:text-zinc-100 font-serif leading-relaxed">
                  {devotional.declarationOfFaith}
                </p>
              </div>
            )}

            {devotional.brothersKeeper && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Be Your Brother&apos;s Keeper
                  </span>
                </div>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {devotional.brothersKeeper}
                </p>
              </div>
            )}

            {devotional.dailyBibleReading && (
              <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-1.5 mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    Today&apos;s Reading
                  </span>
                </div>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {devotional.dailyBibleReading}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(`/devotionals/${devotional.id}`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors shadow-sm"
                >
                  <span>Read Full Devotional</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: devotional.title,
                        text: devotional.body.substring(0, 200),
                        url: window.location.href,
                      });
                    }
                  }}
                  className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 transition-colors"
                  title="Share devotional"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {devotional.author && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                  By {devotional.author}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Heart className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              No devotional published for today yet
            </h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              New inspiration is published each morning. Browse previous devotionals in the library.
            </p>
            <button
              onClick={() => navigate('/devotionals')}
              className="mt-4 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-xs font-semibold"
            >
              Browse Past Devotionals
            </button>
          </div>
        )}
      </div>

      {/* ── Quick Links ──────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {quickLinks.map(({ label, path, Icon, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-start gap-2"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
