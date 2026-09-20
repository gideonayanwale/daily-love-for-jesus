import { trpc } from "@/providers/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BookOpen, Copy, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CompareVersesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookName: string;
  bookNumber: number;
  chapter: number;
  verse: number;
}

export function CompareVersesModal({
  isOpen,
  onClose,
  bookName,
  bookNumber,
  chapter,
  verse,
}: CompareVersesModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const { data: comparisons, isLoading } = trpc.bible.compareVerse.useQuery(
    {
      bookNumber,
      chapter,
      verse,
      translations: ["KJV", "WEB", "ESV", "NIV"],
    },
    {
      enabled: isOpen && bookNumber > 0 && chapter > 0 && verse > 0,
    }
  );

  const handleCopy = (text: string, translation: string, idx: number) => {
    navigator.clipboard.writeText(`${bookName} ${chapter}:${verse} (${translation}) - ${text}`);
    setCopiedIndex(idx);
    toast.success(`Copied ${translation} verse to clipboard!`);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-[92vw] max-h-[85vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl">
        <DialogHeader className="p-4 pb-3 border-b border-gray-100 bg-amber-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-gray-800">
                Compare Scripture Translations
              </DialogTitle>
              <DialogDescription className="text-xs text-amber-700 font-semibold">
                {bookName} {chapter}:{verse}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[60vh]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-xs">Fetching comparisons...</p>
            </div>
          ) : !comparisons || comparisons.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">
              No comparison data found for this verse.
            </div>
          ) : (
            comparisons.map((c, idx) => (
              <div
                key={c.translation}
                className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 hover:border-amber-200 transition-all group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[11px]">
                      {c.translation}
                    </span>
                    {c.fullName && (
                      <span className="text-[11px] text-gray-500 truncate max-w-[200px]">
                        {c.fullName}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleCopy(c.text, c.translation, idx)}
                    className="opacity-60 group-hover:opacity-100 p-1 hover:bg-white rounded transition-all text-gray-500 hover:text-amber-600"
                    title="Copy this translation"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-gray-700 font-serif">
                  {c.text}
                </p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
