import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Sparkles, BookOpen, Heart, Compass, Check, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AiStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  scripture: string;
  verseText: string;
}

interface StudyData {
  scripture: string;
  historicalContext: string;
  keyWordInsights: Array<{ word: string; originalLanguage: string; meaning: string }>;
  crossReferences: string[];
  lifeApplication: string;
  source: string;
}

export function AiStudyModal({ isOpen, onClose, scripture, verseText }: AiStudyModalProps) {
  const [loading, setLoading] = useState(false);
  const [studyData, setStudyData] = useState<StudyData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && scripture && verseText) {
      fetchStudyGuide();
    }
  }, [isOpen, scripture, verseText]);

  const fetchStudyGuide = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scripture, verseText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStudyData(data);
    } catch {
      toast.error('Unable to fetch study insights. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!studyData) return;
    const text = `📖 Spiritual Study Notes: ${studyData.scripture}\n\n🏛️ Context:\n${studyData.historicalContext}\n\n🌱 Application:\n${studyData.lifeApplication}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Study notes copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl w-[94vw] max-h-[85vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <DialogHeader className="p-4 pb-3 border-b border-zinc-100 dark:border-zinc-800 bg-amber-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 fill-current" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  AI Spiritual Study Guide
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                  Theological context, original language & application
                </DialogDescription>
              </div>
            </div>

            {studyData && (
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 text-xs transition-colors"
                title="Copy Study Notes"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Scripture Anchor Card */}
          <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-xl p-3">
            <div className="text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider mb-1">
              {scripture}
            </div>
            <p className="text-xs text-zinc-800 dark:text-zinc-200 font-serif italic leading-relaxed">
              "{verseText}"
            </p>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Searching scriptures and historical context...
              </p>
            </div>
          ) : studyData ? (
            <div className="space-y-4">
              {/* 1. Historical Context */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <Compass className="w-3.5 h-3.5 text-amber-500" />
                  <span>Historical & Literary Context</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  {studyData.historicalContext}
                </p>
              </div>

              {/* 2. Original Language Insights */}
              {studyData.keyWordInsights && studyData.keyWordInsights.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>Hebrew / Greek Keyword Insights</span>
                  </div>
                  <div className="grid gap-2">
                    {studyData.keyWordInsights.map((kw, i) => (
                      <div
                        key={i}
                        className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold text-zinc-800 dark:text-zinc-200">
                          <span>{kw.word}</span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                            {kw.originalLanguage}
                          </span>
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-1 leading-normal">
                          {kw.meaning}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Cross References */}
              {studyData.crossReferences && studyData.crossReferences.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Cross References
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {studyData.crossReferences.map((ref, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Practical Life Application */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <Heart className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Practical Life Application</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl">
                  {studyData.lifeApplication}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
