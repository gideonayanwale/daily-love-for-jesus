import { useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import {
  BookOpen,
  Music,
  Heart,
  Share2,
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
  Users,
  Bookmark,
  Calendar,
  Copy,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

export default function Home() {
  const navigate = useNavigate();
  const [copiedVerse, setCopiedVerse] = useState(false);

  // Queries from NestJS tRPC Backend
  const { data: devotional, isLoading: devLoading } =
    trpc.devotional.today.useQuery();

  const { data: verseOfDay, isLoading: verseLoading } =
    trpc.bible.randomVerse.useQuery();

  const { data: featuredHymn } = trpc.hymns.random.useQuery();

  const today = new Date();

  const handleCopyVerse = (text: string, ref: string) => {
    navigator.clipboard.writeText(`"${text}" — ${ref}`);
    setCopiedVerse(true);
    setTimeout(() => setCopiedVerse(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* ── 1. Header Banner & Welcome ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{format(today, 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Daily Bread & Devotion
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Welcome to Love Fellowship Christian International daily spiritual sanctuary.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/bible')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs transition-colors shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span>Read Bible</span>
          </button>
          <button
            onClick={() => navigate('/devotionals')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-medium text-xs transition-colors shadow-sm"
          >
            <span>Past Devotionals</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── 2. KPI Cards Row (Building Data Apps Standard) ───────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Reading Streak */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Daily Streak
            </span>
            <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <Flame className="w-4 h-4 fill-current" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50">
              7 Days
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Active
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
            Faithful reading this week
          </p>
        </div>

        {/* KPI 2: Today's Devotional */}
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

        {/* KPI 3: Bible Chapters */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Translations
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50">
              50+
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              KJV &bull; WEB &bull; ESV
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
            Audio & Verse Compare
          </p>
        </div>

        {/* KPI 4: Sunday School / Community */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Fellowship
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50">
              LFCI
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
              Connected
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
            Sunday School & Roster
          </p>
        </div>
      </div>

      {/* ── 3. Main Split Content: Verse of the Day & Devotional ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Verse of the Day & Featured Hymn (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Verse of the Day Card */}
          {verseLoading ? (
            <div className="h-64 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-pulse p-6" />
          ) : verseOfDay ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white p-6 shadow-lg shadow-amber-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold uppercase tracking-wider text-amber-100">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Verse of the Day</span>
                </div>
                <span className="text-xs font-bold text-amber-200">
                  {verseOfDay.translation || 'KJV'}
                </span>
              </div>

              <blockquote className="text-lg leading-relaxed font-serif italic text-white my-4">
                &ldquo;{verseOfDay.text}&rdquo;
              </blockquote>

              <div className="flex items-center justify-between pt-3 border-t border-white/20">
                <p className="text-sm font-bold text-amber-100">
                  {verseOfDay.bookName} {verseOfDay.chapter}:{verseOfDay.verse}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleCopyVerse(
                        verseOfDay.text,
                        `${verseOfDay.bookName} ${verseOfDay.chapter}:${verseOfDay.verse}`
                      )
                    }
                    title="Copy Verse"
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    {copiedVerse ? (
                      <Check className="w-4 h-4 text-emerald-200" />
                    ) : (
                      <Copy className="w-4 h-4 text-white" />
                    )}
                  </button>

                  <button
                    onClick={() =>
                      navigate(
                        `/bible/${verseOfDay.bookNumber}/${verseOfDay.chapter}`
                      )
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-slate-950 font-bold text-xs hover:bg-amber-50 transition-colors"
                  >
                    <span>Read Chapter</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Featured Hymn Spotlight */}
          {featuredHymn && (
            <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Hymn of Worship
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      #{featuredHymn.hymnNumber} &bull; {featuredHymn.title}
                    </h4>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/hymns')}
                  className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                >
                  All Hymns
                </button>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 font-serif italic line-clamp-3 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                "{featuredHymn.lyrics.substring(0, 180)}..."
              </p>

              <button
                onClick={() => navigate(`/hymns/${featuredHymn.id}`)}
                className="w-full mt-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Sing Along & View Full Lyrics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Today's Devotional Feature (7 cols on lg) */}
        <div className="lg:col-span-7">
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
        </div>

      </div>
    </div>
  );
}
