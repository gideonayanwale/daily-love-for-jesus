import { useState } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import { Search, Music, SlidersHorizontal, ArrowRight, BookOpen } from 'lucide-react';

export default function Hymns() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: hymns, isLoading } = trpc.hymns.list.useQuery(
    search
      ? { search }
      : selectedCategory
        ? { category: selectedCategory }
        : {}
  );

  const { data: categories } = trpc.hymns.categories.useQuery();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Music className="w-3.5 h-3.5" />
            <span>Sacred Hymnody</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Baptist Hymnal
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Classic and inspired hymns of praise, faith, devotion, and adoration
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, number, or lyrics..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
      </div>

      {/* ── Category Filter Pills ───────────────────────────────────────────── */}
      {categories && categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              !selectedCategory
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            All Hymns ({hymns?.length ?? 101})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Hymns Grid ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-24 bg-white dark:bg-[#0c0c0f] rounded-2xl animate-pulse border border-zinc-200 dark:border-zinc-800"
            />
          ))}
        </div>
      ) : hymns && hymns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {hymns.map((hymn) => (
            <div
              key={hymn.id}
              onClick={() => navigate(`/hymns/${hymn.id}`)}
              className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-600 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center">
                      #{hymn.hymnNumber}
                    </span>
                    {hymn.category && (
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold">
                        {hymn.category}
                      </span>
                    )}
                  </div>

                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                </div>

                <h3 className="font-bold text-zinc-950 dark:text-zinc-50 text-base leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {hymn.title}
                </h3>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1.5 font-serif italic">
                  {hymn.lyrics.substring(0, 140)}...
                </p>
              </div>

              {hymn.author && (
                <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-400">
                  Author: {hymn.author}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0c0c0f] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 text-center space-y-2">
          <Music className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            No hymns matched your query
          </h4>
          <p className="text-xs text-zinc-400">
            Try adjusting your search terms or selecting a different category filter.
          </p>
        </div>
      )}
    </div>
  );
}
