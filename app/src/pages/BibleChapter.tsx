import { useParams, useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function BibleChapter() {
  const { bookNumber } = useParams<{ bookNumber: string }>();
  const navigate = useNavigate();
  const bNum = parseInt(bookNumber ?? '1');

  const { data: book } = trpc.bible.bookById.useQuery({
    id: bNum,
  });

  const { data: chapters, isLoading } = trpc.bible.chapters.useQuery({
    bookNumber: bNum,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => navigate('/bible')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50">
              {book?.name ?? 'Loading...'}
            </h1>
            {book && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase">
                {book.shortName}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            {book?.testament === 'old' ? 'Old Testament' : 'New Testament'} &bull;{' '}
            {book?.genre || 'Scripture'} &bull; {book?.chapters} {book?.chapters === 1 ? 'Chapter' : 'Chapters'}
          </p>
        </div>
      </div>

      {/* ── Chapters Grid ───────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Select a Chapter to Read
          </p>
          <span className="text-xs text-zinc-400">
            {chapters?.length ?? 0} chapters
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-zinc-100 dark:bg-zinc-800/60 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5">
            {chapters?.map((chapter) => (
              <button
                key={chapter}
                onClick={() => navigate(`/bible/${bNum}/${chapter}`)}
                className="aspect-square bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-bold text-zinc-800 dark:text-zinc-200 text-sm hover:bg-amber-500 hover:border-amber-400 hover:text-slate-950 dark:hover:text-slate-950 transition-all shadow-xs active:scale-95"
              >
                {chapter}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
