import { useState } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import { Heart, CalendarHeart, ArrowRight, Search, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export default function Devotionals() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: devotionalsData, isLoading } =
    trpc.devotional.list.useQuery({
      limit: 50,
      offset: 0,
    });

  const { data: todayDevotional } = trpc.devotional.today.useQuery();

  const filteredDevotionals = devotionalsData?.items.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.scripture && item.scripture.toLowerCase().includes(q)) ||
      item.body.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Daily Devotionals
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Spiritual guidance, reflections, and prayers for your daily walk with Christ
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search devotionals or scriptures..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
      </div>

      {/* ── Today's Devotional Banner ───────────────────────────────────────── */}
      {!search && todayDevotional && (
        <section
          onClick={() => navigate(`/devotionals/${todayDevotional.id}`)}
          className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-amber-500/15 cursor-pointer hover:shadow-xl transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold uppercase tracking-wider text-amber-100">
              <CalendarHeart className="w-3.5 h-3.5" />
              <span>Today&apos;s Featured Devotional</span>
            </div>
            <span className="text-xs text-amber-200 font-medium">
              {format(new Date(todayDevotional.devotionalDate || new Date()), 'MMMM d, yyyy')}
            </span>
          </div>

          <h3 className="font-extrabold text-2xl leading-tight group-hover:underline">
            {todayDevotional.title}
          </h3>

          {todayDevotional.scripture && (
            <p className="text-amber-100 text-sm font-semibold mt-1.5">
              {todayDevotional.scripture}
            </p>
          )}

          <p className="text-white/90 text-sm leading-relaxed mt-2 line-clamp-2 font-serif italic">
            &ldquo;{todayDevotional.body.substring(0, 200)}...&rdquo;
          </p>

          <div className="flex items-center gap-1.5 mt-4 text-white text-xs font-bold">
            <span>Read Complete Devotional & Prayer</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </section>
      )}

      {/* ── Devotionals List ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {search ? 'Search Results' : 'Past Devotionals Archive'}
          </h2>
          {filteredDevotionals && (
            <span className="text-xs text-zinc-400">
              {filteredDevotionals.length} {filteredDevotionals.length === 1 ? 'devotional' : 'devotionals'}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-20 bg-white dark:bg-[#0c0c0f] rounded-2xl animate-pulse border border-zinc-200 dark:border-zinc-800"
              />
            ))}
          </div>
        ) : filteredDevotionals && filteredDevotionals.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5">
            {filteredDevotionals.map((devotional) => (
              <div
                key={devotional.id}
                onClick={() => navigate(`/devotionals/${devotional.id}`)}
                className="w-full flex items-center justify-between gap-4 p-4 bg-white dark:bg-[#0c0c0f] rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/50 rounded-xl flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {devotional.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {devotional.scripture && (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          {devotional.scripture}
                        </span>
                      )}
                      <span>&bull;</span>
                      <span>
                        {format(
                          new Date(devotional.devotionalDate || new Date()),
                          'MMM d, yyyy'
                        )}
                      </span>
                      {devotional.author && (
                        <>
                          <span>&bull;</span>
                          <span className="truncate max-w-[120px]">{devotional.author}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-zinc-400 group-hover:text-amber-500 transition-colors flex-shrink-0">
                  <span className="text-xs font-semibold hidden sm:inline">Read</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0c0c0f] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-2">
            <Heart className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              No devotionals found matching your query
            </p>
            <p className="text-xs text-zinc-400">
              Try searching for different keywords, scripture references, or clear the search filter.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
