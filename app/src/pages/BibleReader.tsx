import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Type,
  Share2,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Download,
  Check,
  Columns,
  Highlighter,
  Globe,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { TranslationSelectorModal } from "@/components/TranslationSelectorModal";
import { CompareVersesModal } from "@/components/CompareVersesModal";
import { bibleNarrator } from "@/lib/bibleAudio";
import {
  saveOfflineChapter,
  getOfflineChapter,
  isTranslationDownloaded,
  markTranslationDownloaded,
  type OfflineVerse,
} from "@/lib/bibleOffline";


const HIGHLIGHT_COLORS = [
  { id: "amber", bg: "bg-amber-100/80 dark:bg-amber-950/40 text-amber-900 border-amber-300" },
  { id: "emerald", bg: "bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-900 border-emerald-300" },
  { id: "rose", bg: "bg-rose-100/80 dark:bg-rose-950/40 text-rose-900 border-rose-300" },
  { id: "sky", bg: "bg-sky-100/80 dark:bg-sky-950/40 text-sky-900 border-sky-300" },
] as const;

export default function BibleReader() {
  const { bookNumber, chapter } = useParams<{
    bookNumber: string;
    chapter: string;
  }>();
  const navigate = useNavigate();
  const bNum = parseInt(bookNumber ?? "1");
  const chNum = parseInt(chapter ?? "1");

  // Translation State
  const [translation, setTranslation] = useState<string>(() => {
    return localStorage.getItem("preferred_bible_translation") || "KJV";
  });
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);

  // Compare Verses State
  const [compareVerseNumber, setCompareVerseNumber] = useState<number | null>(null);

  // Reader Settings
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

  // Audio Narration State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [activeNarratedVerse, setActiveNarratedVerse] = useState<number | null>(null);
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);

  // Offline Download State
  const [isCurrentTranslationDownloaded, setIsCurrentTranslationDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [offlineVerses, setOfflineVerses] = useState<OfflineVerse[] | null>(null);

  // Highlights state: { [verseNum]: colorId }
  const [highlights, setHighlights] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem(`highlights:${bNum}:${chNum}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const verseContainerRef = useRef<HTMLDivElement>(null);

  // Save preferred translation
  const handleSelectTranslation = (newTrans: string) => {
    setTranslation(newTrans);
    localStorage.setItem("preferred_bible_translation", newTrans);
    toast.success(`Switched to ${newTrans} translation`);
  };

  // Check offline status
  useEffect(() => {
    isTranslationDownloaded(translation).then(setIsCurrentTranslationDownloaded);
  }, [translation]);

  // Load Book metadata
  const { data: book } = trpc.bible.bookById.useQuery({
    id: bNum,
  });

  // Load chapters for book
  const { data: chaptersList } = trpc.bible.chapters.useQuery({
    bookNumber: bNum,
  });

  // Load Verses from tRPC (which queries local DB or Bolls Life API)
  const {
    data: fetchedVerses,
    isLoading: isQueryLoading,
    error: queryError,
  } = trpc.bible.verses.useQuery(
    {
      bookNumber: bNum,
      chapter: chNum,
      translation,
    },
    {
      retry: 1,
      staleTime: 1000 * 60 * 30, // 30 minutes
    }
  );

  // Check offline cache if query fails or on mount
  useEffect(() => {
    getOfflineChapter(translation, bNum, chNum).then((cached) => {
      if (cached && cached.length > 0) {
        setOfflineVerses(cached);
      } else {
        setOfflineVerses(null);
      }
    });
  }, [translation, bNum, chNum]);

  // When remote verses arrive, auto-cache to IndexedDB
  useEffect(() => {
    if (fetchedVerses && fetchedVerses.length > 0) {
      saveOfflineChapter(translation, bNum, chNum, fetchedVerses as OfflineVerse[]);
    }
  }, [fetchedVerses, translation, bNum, chNum]);

  const verses = fetchedVerses ?? offlineVerses;
  const isLoading = isQueryLoading && !offlineVerses;

  // Cleanup audio on unmount or navigation
  useEffect(() => {
    return () => {
      bibleNarrator.stop();
    };
  }, [bNum, chNum, translation]);

  // Reading tracking & Sunday School accountability
  const [isChapterCompleted, setIsChapterCompleted] = useState<boolean>(false);
  const readingStartTimeRef = useRef<number>(Date.now());
  const hasTriggeredReadRef = useRef<boolean>(false);

  // Reset tracking state whenever the chapter changes (React Router reuses the component)
  useEffect(() => {
    let stored = false;
    try {
      stored = localStorage.getItem(`chapter_read:${bNum}:${chNum}`) === "true";
    } catch {}
    setIsChapterCompleted(stored);
    hasTriggeredReadRef.current = stored;
    readingStartTimeRef.current = Date.now();
  }, [bNum, chNum]);

  const markChapterAsRead = async () => {
    if (hasTriggeredReadRef.current || isChapterCompleted) return;
    hasTriggeredReadRef.current = true;
    setIsChapterCompleted(true);
    try {
      localStorage.setItem(`chapter_read:${bNum}:${chNum}`, "true");
    } catch {}

    const timeSpent = Math.max(15, Math.round((Date.now() - readingStartTimeRef.current) / 1000));
    const contentId = `bible:${bNum}:${chNum}`;

    // Attach Supabase auth token so the server can identify the user
    let authToken: string | null = null;
    try {
      const session = localStorage.getItem("daily_love_supabase_session");
      if (session) {
        authToken = JSON.parse(session)?.access_token ?? null;
      }
    } catch {}

    try {
      const res = await fetch("/api/tracking/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          logs: [
            {
              contentId,
              contentType: "bible_chapter",
              bookNumber: bNum,
              chapter: chNum,
              timeSpent,
              scrollDepth: 100,
              completedAt: new Date().toISOString(),
              clientLogId: `web_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            },
          ],
        }),
      });
      if (res.ok) {
        toast.success(`✓ ${book?.name ?? "Chapter"} ${chNum} reading recorded!`);
      } else {
        console.warn("Reading log sync returned", res.status);
      }
    } catch (err) {
      console.warn("Could not sync reading log immediately:", err);
    }
  };

  // Scroll listener for 85% depth
  useEffect(() => {
    const onScroll = () => {
      if (hasTriggeredReadRef.current) return;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0 && window.scrollY / scrollHeight >= 0.85) {
        markChapterAsRead();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [bNum, chNum]);

  // Audio narration controls
  const handleToggleAudio = () => {
    if (!verses || verses.length === 0) return;

    if (isPlayingAudio) {
      if (isAudioPaused) {
        bibleNarrator.resume();
        setIsAudioPaused(false);
      } else {
        bibleNarrator.pause();
        setIsAudioPaused(true);
      }
      return;
    }

    const verseTexts = verses.map((v) => `${v.verse}. ${v.text}`);
    const startIndex = selectedVerse
      ? Math.max(0, verses.findIndex((v) => v.verse === selectedVerse))
      : 0;

    bibleNarrator.setRate(audioSpeed);
    bibleNarrator.startNarration(
      verseTexts,
      startIndex,
      (idx) => {
        const v = verses[idx];
        if (v) {
          setActiveNarratedVerse(v.verse);
        }
      },
      () => {
        setIsPlayingAudio(false);
        setIsAudioPaused(false);
        setActiveNarratedVerse(null);
      }
    );

    setIsPlayingAudio(true);
    setIsAudioPaused(false);
  };

  const handleStopAudio = () => {
    bibleNarrator.stop();
    setIsPlayingAudio(false);
    setIsAudioPaused(false);
    setActiveNarratedVerse(null);
  };

  const handleSpeedCycle = () => {
    const speeds = [1.0, 1.25, 1.5, 0.75];
    const nextIdx = (speeds.indexOf(audioSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setAudioSpeed(nextSpeed);
    bibleNarrator.setRate(nextSpeed);
  };

  // Download translation for offline use
  const handleDownloadTranslation = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    toast.info(`Downloading ${translation} translation for offline use...`);

    try {
      if (verses && verses.length > 0) {
        await saveOfflineChapter(translation, bNum, chNum, verses as OfflineVerse[]);
      }
      await markTranslationDownloaded(translation, {
        downloadedAt: Date.now(),
        name: translation,
      });
      setIsCurrentTranslationDownloaded(true);
      toast.success(`${translation} is now saved for offline reading!`);
    } catch {
      toast.error("Failed to complete offline download");
    } finally {
      setIsDownloading(false);
    }
  };

  // Highlight actions
  const handleSetHighlight = (verseNum: number, colorId: string) => {
    const next = { ...highlights };
    if (next[verseNum] === colorId) {
      delete next[verseNum];
    } else {
      next[verseNum] = colorId;
    }
    setHighlights(next);
    localStorage.setItem(`highlights:${bNum}:${chNum}`, JSON.stringify(next));
  };

  // Share action
  const handleShare = (text: string, reference: string) => {
    const shareText = `"${text}" — ${reference} (${translation})`;
    if (navigator.share) {
      navigator.share({
        title: reference,
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Copied scripture to clipboard!");
    }
  };

  const maxChapter = chaptersList && chaptersList.length > 0 ? Math.max(...chaptersList) : 50;
  const hasNextChapter = chNum < maxChapter;
  const hasPrevChapter = chNum > 1;

  const fontSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const verseNumberSize = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <div className="max-w-xl mx-auto pb-16">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100/80 px-4 py-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/bible/${bNum}`)}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-700"
              title="Back to chapters"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-gray-800 text-sm leading-tight">
                  {book?.name ?? "Bible"}
                </h1>
                <span className="text-gray-400 text-xs">Ch. {chNum}</span>
              </div>
              <p className="text-[10px] text-amber-600 font-medium tracking-wide">
                {translation} Translation
              </p>
            </div>
          </div>

          {/* Right-side action buttons */}
          <div className="flex items-center gap-1.5">
            {/* Mark as Read Completion Action */}
            <button
              onClick={markChapterAsRead}
              disabled={isChapterCompleted}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isChapterCompleted
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
              }`}
              title="Mark this chapter as completed for reading progress & Sunday School"
            >
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isChapterCompleted ? "Completed" : "Mark Read"}</span>
            </button>

            {/* Translation Picker Trigger */}
            <button
              onClick={() => setIsTranslationModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 rounded-xl text-xs font-bold text-amber-800 transition-colors shadow-xs"
              title="Change translation & language"
            >
              <Globe className="w-3.5 h-3.5 text-amber-600" />
              <span>{translation}</span>
            </button>

            {/* Offline Download Action */}
            <button
              onClick={handleDownloadTranslation}
              disabled={isDownloading}
              className={`p-1.5 rounded-xl border transition-colors ${
                isCurrentTranslationDownloaded
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                  : "bg-white hover:bg-gray-50 border-gray-200 text-gray-500"
              }`}
              title={
                isCurrentTranslationDownloaded
                  ? "Saved offline (Click to re-sync)"
                  : "Download for offline reading"
              }
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              ) : isCurrentTranslationDownloaded ? (
                <Check className="w-4 h-4" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>

            {/* Audio Narration Trigger */}
            <button
              onClick={handleToggleAudio}
              className={`p-1.5 rounded-xl border transition-colors ${
                isPlayingAudio
                  ? "bg-amber-500 border-amber-600 text-white shadow-sm"
                  : "bg-white hover:bg-gray-50 border-gray-200 text-gray-600"
              }`}
              title={isPlayingAudio ? "Pause/Resume narration" : "Listen to chapter"}
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {/* Font Size Toggle */}
            <button
              onClick={() =>
                setFontSize((s) => (s === "sm" ? "md" : s === "md" ? "lg" : "sm"))
              }
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
              title="Adjust font size"
            >
              <Type className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Audio Floating Bar (when active) */}
        {isPlayingAudio && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-gray-600 font-medium text-[11px]">
                {isAudioPaused ? "Audio Paused" : `Reading Verse ${activeNarratedVerse ?? 1}...`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleToggleAudio}
                className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                {isAudioPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleSpeedCycle}
                className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[10px] font-bold text-gray-700"
              >
                {audioSpeed}x
              </button>
              <button
                onClick={handleStopAudio}
                className="p-1 rounded bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500"
                title="Stop narration"
              >
                <VolumeX className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Verses Container */}
      <div ref={verseContainerRef} className="px-4 py-6 space-y-1">
        {isLoading ? (
          <div className="space-y-4 pt-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-6 h-5 bg-gray-100 rounded flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : verses && verses.length > 0 ? (
          <div className={`${fontSizeClasses[fontSize]} leading-relaxed space-y-1.5 font-serif`}>
            {verses.map((verse) => {
              const isSelected = selectedVerse === verse.verse;
              const isNarrated = activeNarratedVerse === verse.verse;
              const userColorId = highlights[verse.verse];
              const highlightStyle = HIGHLIGHT_COLORS.find((c) => c.id === userColorId);

              return (
                <div
                  key={verse.id || `${verse.bookNumber}-${verse.chapter}-${verse.verse}`}
                  id={`verse-${verse.verse}`}
                  onClick={() => setSelectedVerse(isSelected ? null : verse.verse)}
                  className={`group relative rounded-xl px-2.5 py-2 transition-all cursor-pointer border ${
                    isNarrated
                      ? "bg-amber-100/90 border-amber-300 ring-2 ring-amber-400 shadow-sm"
                      : highlightStyle
                      ? `${highlightStyle.bg} border`
                      : isSelected
                      ? "bg-amber-50/70 border-amber-200"
                      : "border-transparent hover:bg-gray-50/80"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <sup
                      className={`${verseNumberSize[fontSize]} text-amber-600 font-bold mt-1 flex-shrink-0 font-sans`}
                    >
                      {verse.verse}
                    </sup>
                    <span className="text-gray-800 flex-1">{verse.text}</span>
                  </div>

                  {/* Context Actions toolbar on click */}
                  {isSelected && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 pt-2 border-t border-gray-200/50 flex flex-wrap items-center justify-between gap-2 text-xs font-sans animate-in fade-in slide-in-from-top-1"
                    >
                      {/* Highlight color picker */}
                      <div className="flex items-center gap-1.5">
                        <Highlighter className="w-3.5 h-3.5 text-gray-400 mr-0.5" />
                        {HIGHLIGHT_COLORS.map((col) => (
                          <button
                            key={col.id}
                            onClick={() => handleSetHighlight(verse.verse, col.id)}
                            className={`w-5 h-5 rounded-full border transition-transform ${
                              col.bg
                            } ${
                              userColorId === col.id
                                ? "scale-125 ring-2 ring-gray-600 shadow-xs"
                                : "hover:scale-110"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={() => setCompareVerseNumber(verse.verse)}
                          className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 text-[11px] font-medium transition-colors"
                          title="Compare across versions"
                        >
                          <Columns className="w-3 h-3 text-amber-600" />
                          Compare
                        </button>

                        <button
                          onClick={() =>
                            handleShare(verse.text, `${book?.name} ${chNum}:${verse.verse}`)
                          }
                          className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 text-[11px] font-medium transition-colors"
                          title="Share scripture"
                        >
                          <Share2 className="w-3 h-3 text-amber-600" />
                          Share
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">
              Chapter not found in {translation}
            </h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
              Try switching back to KJV or check your internet connection.
            </p>
            <button
              onClick={() => handleSelectTranslation("KJV")}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              Switch to KJV
            </button>
          </div>
        )}

        {/* Chapter Navigation Footer */}
        <div className="flex items-center justify-between pt-8 pb-6 border-t border-gray-100 mt-8">
          {hasPrevChapter ? (
            <button
              onClick={() => navigate(`/bible/${bNum}/${chNum - 1}`)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              Chapter {chNum - 1}
            </button>
          ) : (
            <div />
          )}

          {hasNextChapter ? (
            <button
              onClick={() => navigate(`/bible/${bNum}/${chNum + 1}`)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
            >
              Chapter {chNum + 1}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Translation Picker Modal */}
      <TranslationSelectorModal
        isOpen={isTranslationModalOpen}
        onClose={() => setIsTranslationModalOpen(false)}
        currentTranslation={translation}
        onSelectTranslation={handleSelectTranslation}
        onStartDownload={(trans) => {
          setTranslation(trans);
          handleDownloadTranslation();
        }}
      />

      {/* Compare Verses Modal */}
      {compareVerseNumber !== null && (
        <CompareVersesModal
          isOpen={compareVerseNumber !== null}
          onClose={() => setCompareVerseNumber(null)}
          bookName={book?.name ?? "Scripture"}
          bookNumber={bNum}
          chapter={chNum}
          verse={compareVerseNumber}
        />
      )}
    </div>
  );
}
