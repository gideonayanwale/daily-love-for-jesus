import { useState } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import { Search, BookOpen, ChevronRight, Sparkles } from 'lucide-react';

export default function Bible() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'old' | 'new'>('all');

  const { data: books, isLoading } = trpc.bible.books.useQuery();

  const filteredBooks = books?.filter((book) => {
    const matchesTestament = activeTab === 'all' || book.testament === activeTab;
    const matchesSearch =
      !search ||
      book.name.toLowerCase().includes(search.toLowerCase()) ||
      book.shortName.toLowerCase().includes(search.toLowerCase());
    return matchesTestament && matchesSearch;
  });

  const oldCount = books?.filter((b) => b.testament === 'old').length ?? 39;
  const newCount = books?.filter((b) => b.testament === 'new').length ?? 27;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>The Holy Scriptures</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Holy Bible
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Explore all 66 books with chapter navigation, audio narration, and verse comparison
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books (e.g. Genesis, Rom, Psalms)..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
      </div>

      {/* ── Testament Filter Tabs ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
          }`}
        >
          All 66 Books
        </button>
        <button
          onClick={() => setActiveTab('old')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'old'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
          }`}
        >
          Old Testament ({oldCount})
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'new'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
          }`}
        >
          New Testament ({newCount})
        </button>
      </div>

      {/* ── Books Grid ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-white dark:bg-[#0c0c0f] rounded-2xl animate-pulse border border-zinc-200 dark:border-zinc-800"
            />
          ))}
        </div>
      ) : filteredBooks && filteredBooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => navigate(`/bible/${book.id}`)}
              className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-600 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  {book.shortName}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {book.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                    <span className="capitalize">{book.testament} Testament</span>
                    <span>&bull;</span>
                    <span>{book.chapters} {book.chapters === 1 ? 'Chapter' : 'Chapters'}</span>
                  </div>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0c0c0f] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 text-center space-y-2">
          <BookOpen className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            No books found
          </h4>
          <p className="text-xs text-zinc-400">
            Try adjusting your search query or clear the filter.
          </p>
        </div>
      )}
    </div>
  );
}
