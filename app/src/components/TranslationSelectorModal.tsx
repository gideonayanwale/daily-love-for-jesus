import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, Globe, Check, Download, Trash2, Loader2 } from "lucide-react";
import {
  getDownloadedTranslations,
  isTranslationDownloaded,
  deleteDownloadedTranslation,
} from "@/lib/bibleOffline";

interface TranslationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTranslation: string;
  onSelectTranslation: (translation: string) => void;
  onStartDownload?: (translation: string) => void;
}

export function TranslationSelectorModal({
  isOpen,
  onClose,
  currentTranslation,
  onSelectTranslation,
  onStartDownload,
}: TranslationSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"popular" | "en" | "es" | "fr" | "all">("popular");
  const [downloadedSet, setDownloadedSet] = useState<Set<string>>(new Set());

  const { data: allTranslations, isLoading } = trpc.bible.translations.useQuery(undefined, {
    enabled: isOpen,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const { data: popularList } = trpc.bible.popularTranslations.useQuery(undefined, {
    enabled: isOpen,
  });

  const refreshDownloaded = async () => {
    const list = await getDownloadedTranslations();
    setDownloadedSet(new Set(list.map((t) => t.toUpperCase())));
  };

  useEffect(() => {
    if (isOpen) {
      refreshDownloaded();
    }
  }, [isOpen]);

  const listToFilter = allTranslations ?? popularList ?? [];

  const filtered = listToFilter.filter((t) => {
    const matchesSearch =
      t.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.language.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (searchQuery.trim().length > 0) return true;

    if (activeTab === "popular") return !!t.isPopular;
    if (activeTab === "en") return t.language.toLowerCase().includes("english");
    if (activeTab === "es") return t.language.toLowerCase().includes("spanish") || t.language.toLowerCase().includes("español");
    if (activeTab === "fr") return t.language.toLowerCase().includes("french") || t.language.toLowerCase().includes("français");
    return true;
  });

  const handleDeleteOffline = async (e: React.MouseEvent, shortName: string) => {
    e.stopPropagation();
    await deleteDownloadedTranslation(shortName);
    await refreshDownloaded();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[92vw] max-h-[85vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl">
        <DialogHeader className="p-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-gray-800">
                Select Bible Translation
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Multi-version & multilingual offline support
              </DialogDescription>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative mt-3">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search version (e.g. NIV, ESV, Reina-Valera, Segond)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
            />
          </div>

          {/* Filter Pills */}
          {searchQuery.trim().length === 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
              {(
                [
                  { id: "popular", label: "Popular" },
                  { id: "en", label: "English" },
                  { id: "es", label: "Español" },
                  { id: "fr", label: "Français" },
                  { id: "all", label: "All Languages" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Translation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[50vh]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-xs">Loading Bible translations...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs">
              No translations found matching "{searchQuery}"
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected =
                item.shortName.toUpperCase() === currentTranslation.toUpperCase();
              const isDownloaded = downloadedSet.has(item.shortName.toUpperCase());

              return (
                <div
                  key={`${item.language}-${item.shortName}`}
                  onClick={() => {
                    onSelectTranslation(item.shortName);
                    onClose();
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-amber-50/80 border-amber-300 ring-1 ring-amber-400"
                      : "bg-white hover:bg-gray-50/80 border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`w-11 h-9 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        isSelected
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-gray-100 text-gray-700 font-semibold"
                      }`}
                    >
                      {item.shortName}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-xs text-gray-800 truncate">
                          {item.fullName}
                        </h4>
                        {isDownloaded && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-700 rounded-md">
                            Offline
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 truncate">
                        {item.language}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isDownloaded ? (
                      <button
                        title="Delete downloaded offline copy"
                        onClick={(e) => handleDeleteOffline(e, item.shortName)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      onStartDownload && (
                        <button
                          title="Download for 100% offline reading"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartDownload(item.shortName);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-500">
            Downloaded translations work anywhere without internet connection.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
