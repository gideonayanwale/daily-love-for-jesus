import { useParams, useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import { ArrowLeft, Music, User, Share2, Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface Stanza {
  number: number;
  text: string;
}

export default function HymnDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data: hymn, isLoading } = trpc.hymns.byId.useQuery({
    id: parseInt(id ?? '1'),
  });

  let stanzas: Stanza[] = [];
  if (hymn?.stanzas) {
    try {
      stanzas = typeof hymn.stanzas === 'string' ? JSON.parse(hymn.stanzas) : (hymn.stanzas as any);
    } catch {
      stanzas = [];
    }
  }

  const handleShare = () => {
    if (!hymn) return;
    const lyricsContent =
      stanzas.length > 0
        ? stanzas.map((s) => `${s.number}. ${s.text}`).join('\n\n')
        : hymn.lyrics;

    const text = `#${hymn.hymnNumber} - ${hymn.title}\n\n${lyricsContent}${
      hymn.chorus ? `\n\nChorus:\n${hymn.chorus}` : ''
    }`;

    if (navigator.share) {
      navigator.share({ title: hymn.title, text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 animate-pulse space-y-4">
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!hymn) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <Music className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto" />
        <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
          Hymn not found
        </h2>
        <button
          onClick={() => navigate('/hymns')}
          className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs"
        >
          Return to Hymns
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Top Navigation Bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => navigate('/hymns')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Hymns</span>
        </button>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-medium transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Lyrics Copied</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-zinc-500" />
              <span>Share Lyrics</span>
            </>
          )}
        </button>
      </div>

      {/* ── Main Hymn Card ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
        
        {/* Hymn Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs">
              Hymn #{hymn.hymnNumber}
            </span>
            {hymn.category && (
              <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium">
                {hymn.category}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
            {hymn.title}
          </h1>

          {hymn.author && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 pt-1">
              <User className="w-3.5 h-3.5" />
              <span>Author: {hymn.author}</span>
            </p>
          )}
        </div>

        {/* Stanzas Display */}
        {stanzas.length > 0 ? (
          <div className="space-y-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            {stanzas.map((stanza) => (
              <div
                key={stanza.number}
                className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800 rounded-2xl p-5 relative"
              >
                <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center">
                  {stanza.number}
                </span>
                <p className="text-base sm:text-lg font-serif leading-relaxed text-zinc-900 dark:text-zinc-100 whitespace-pre-line pr-8">
                  {stanza.text}
                </p>
              </div>
            ))}
          </div>
        ) : (
          /* Fallback raw lyrics */
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800 rounded-2xl p-6">
              <p className="text-base sm:text-lg font-serif leading-relaxed text-zinc-900 dark:text-zinc-100 whitespace-pre-line">
                {hymn.lyrics}
              </p>
            </div>
          </div>
        )}

        {/* Chorus / Refrain Highlight Box */}
        {hymn.chorus && (
          <div className="bg-amber-500/10 dark:bg-amber-500/15 border-2 border-amber-500/30 rounded-2xl p-6 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
              Refrain / Chorus
            </span>
            <p className="text-base sm:text-lg font-serif italic text-zinc-900 dark:text-zinc-100 leading-relaxed whitespace-pre-line">
              {hymn.chorus}
            </p>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>Baptist Hymnal Catalog</span>
          <span>Love Fellowship Christian International</span>
        </div>
      </div>
    </div>
  );
}
