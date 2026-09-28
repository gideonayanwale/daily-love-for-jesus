import { useParams, useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import {
  ArrowLeft,
  Heart,
  Share2,
  BookOpen,
  MessageCircle,
  Calendar,
  Check,
  Bookmark,
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

export default function DevotionalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data: devotional, isLoading } =
    trpc.devotional.byId.useQuery({
      id: parseInt(id ?? '1'),
    });

  const handleShare = () => {
    if (!devotional) return;
    const text = `${devotional.title}\n\n${devotional.body.substring(0, 300)}...`;

    if (navigator.share) {
      navigator.share({ title: devotional.title, text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(`${text}\n\nRead more at ${window.location.href}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 animate-pulse space-y-4">
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
        <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  if (!devotional) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <Heart className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto" />
        <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
          Devotional not found
        </h2>
        <p className="text-sm text-zinc-400">
          The devotional you are looking for may have been archived or removed.
        </p>
        <button
          onClick={() => navigate('/devotionals')}
          className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs"
        >
          Return to Devotionals
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Top Navigation Bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => navigate('/devotionals')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Devotionals</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-zinc-500" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Article Card ────────────────────────────────────────────────── */}
      <article className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
        
        {/* Date and Author Tag */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {format(
                new Date(devotional.devotionalDate || new Date()),
                'EEEE, MMMM d, yyyy'
              )}
            </span>
          </div>
          {devotional.author && (
            <>
              <span>&bull;</span>
              <span>Minister: {devotional.author}</span>
            </>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 leading-tight">
          {devotional.title}
        </h1>

        {/* Scripture Box */}
        {devotional.scripture && (
          <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Scripture Reading
              </span>
            </div>
            <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {devotional.scripture}
            </p>
            {devotional.scriptureText && (
              <blockquote className="text-sm leading-relaxed italic text-zinc-800 dark:text-zinc-200 border-l-2 border-amber-500/50 pl-3 font-serif">
                &ldquo;{devotional.scriptureText}&rdquo;
              </blockquote>
            )}
          </div>
        )}

        {/* Body Paragraphs */}
        <div className="space-y-4 text-base leading-relaxed text-zinc-800 dark:text-zinc-200 font-normal">
          {devotional.body.split('\n\n').map((para, i) => (
            <p key={i} className="leading-relaxed">
              {para}
            </p>
          ))}
        </div>

        {/* Reflection */}
        {devotional.reflection && (
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Spiritual Reflection
              </span>
            </div>
            <p className="text-sm italic leading-relaxed text-zinc-700 dark:text-zinc-300 font-serif">
              {devotional.reflection}
            </p>
          </div>
        )}

        {/* Prayer Box */}
        {devotional.prayer && (
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Heart className="w-4 h-4 fill-current" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Prayer of Faith
              </span>
            </div>
            <p className="text-sm italic leading-relaxed text-zinc-900 dark:text-zinc-100 font-serif">
              {devotional.prayer}
            </p>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => navigate('/bible')}
            className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline inline-flex items-center gap-1"
          >
            <span>Open Bible for Study</span>
            <span>&rarr;</span>
          </button>

          <span className="text-[11px] text-zinc-400">
            LFCI Daily Devotional Series
          </span>
        </div>
      </article>
    </div>
  );
}
