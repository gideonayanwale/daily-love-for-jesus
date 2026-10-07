import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GlassCard } from '../components/GlassCard';
import {
  BIBLE_BOOKS,
  POPULAR_TRANSLATIONS,
  fetchChapterVerses,
  MobileVerse,
  BibleBook,
} from '../lib/bibleApi';
import { useReadingTracker } from '../hooks/useReadingTracker';
import { mobileNarrator } from '../lib/mobileAudio';
import {
  downloadWholeVersion,
  getDownloadedVersions,
  isVersionDownloaded,
  DownloadProgress,
} from '../lib/mobileBibleStorage';
import {
  lookupMobileYorubaAudio,
  saveYorubaAudioLocal,
  MobileYorubaAudioInfo,
} from '../lib/yorubaAudio';

export function BibleScreen() {
  const navigation = useNavigation<any>();
  const [selectedBook, setSelectedBook] = useState<BibleBook>(BIBLE_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [translation, setTranslation] = useState<string>('KJV');
  const [verses, setVerses] = useState<MobileVerse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Offline Translations Storage State
  const [downloadedVersions, setDownloadedVersions] = useState<string[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

  // Yoruba DaBible Audio State
  const [yorubaAudio, setYorubaAudio] = useState<MobileYorubaAudioInfo | null>(null);
  const [showYorubaBar, setShowYorubaBar] = useState(false);

  // Audio Narration State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [activeNarratedVerse, setActiveNarratedVerse] = useState<number | null>(null);

  // Hook for 90% scroll depth tracking and offline reading queue sync
  const {
    isCompleted,
    scrollDepth,
    pendingQueueCount,
    markAsRead,
    handleScroll,
  } = useReadingTracker({
    bookNumber: selectedBook.id,
    chapter: selectedChapter,
  });

  // Modals
  const [isBookModalVisible, setIsBookModalVisible] = useState<boolean>(false);
  const [isChapterModalVisible, setIsChapterModalVisible] = useState<boolean>(false);
  const [isTransModalVisible, setIsTransModalVisible] = useState<boolean>(false);

  // Load verses
  const loadVerses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchChapterVerses(translation, selectedBook.id, selectedChapter);
      setVerses(data);
    } catch (err) {
      setError('Unable to load chapter. Please check connection or try another translation.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    mobileNarrator.stop();
    setIsPlayingAudio(false);
    setIsAudioPaused(false);
    setActiveNarratedVerse(null);
    loadVerses();
    getDownloadedVersions().then(setDownloadedVersions);
    lookupMobileYorubaAudio(selectedBook.id, selectedChapter).then(setYorubaAudio);
    return () => {
      mobileNarrator.stop();
    };
  }, [selectedBook.id, selectedChapter, translation]);

  const handleDownloadTranslation = async (transCode: string) => {
    if (downloadProgress && downloadProgress.status === 'downloading') return;
    setDownloadProgress({
      completedChapters: 0,
      totalChapters: 1189,
      percentage: 0,
      status: 'downloading',
      currentBookName: 'Starting...',
    });
    try {
      await downloadWholeVersion(transCode, (prog) => {
        setDownloadProgress({ ...prog });
      });
      const updated = await getDownloadedVersions();
      setDownloadedVersions(updated);
    } catch {
      setDownloadProgress(null);
    }
  };

  const handleSaveYorubaAudio = async () => {
    await saveYorubaAudioLocal(selectedBook.id, selectedChapter, 'cached');
    const updated = await lookupMobileYorubaAudio(selectedBook.id, selectedChapter);
    setYorubaAudio(updated);
  };

  const handleToggleAudio = () => {
    if (isPlayingAudio && !isAudioPaused) {
      mobileNarrator.pause();
      setIsAudioPaused(true);
      return;
    }

    if (isAudioPaused) {
      mobileNarrator.resume();
      setIsAudioPaused(false);
      return;
    }

    if (verses.length === 0) return;

    const verseTexts = verses.map(
      (v) => `Verse ${v.verse}. ${v.text}`
    );

    setIsPlayingAudio(true);
    setIsAudioPaused(false);
    mobileNarrator.startNarration(
      verseTexts,
      0,
      (idx) => {
        if (verses[idx]) {
          setActiveNarratedVerse(verses[idx].verse);
        }
      },
      () => {
        setIsPlayingAudio(false);
        setIsAudioPaused(false);
        setActiveNarratedVerse(null);
      }
    );
  };

  const handleStopAudio = () => {
    mobileNarrator.stop();
    setIsPlayingAudio(false);
    setIsAudioPaused(false);
    setActiveNarratedVerse(null);
  };

  const handleShareVerse = (verse: MobileVerse) => {
    Share.share({
      message: `"${verse.text}" — ${selectedBook.name} ${selectedChapter}:${verse.verse} (${translation})`,
    });
  };

  const hasPrev = selectedChapter > 1;
  const hasNext = selectedChapter < selectedBook.chapters;

  return (
    <View className="flex-1 bg-slate-950">
      {/* Header Bar */}
      <View className="pt-12 pb-3 px-4 bg-slate-900/80 border-b border-white/10">
        <View className="flex-row items-center justify-between">
          {/* Book & Chapter Trigger with Back Button */}
          <View className="flex-row items-center space-x-2">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 active:bg-white/20 mr-1"
              accessibilityLabel="Back to Home"
            >
              <Text className="text-white font-bold text-xs">←</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsBookModalVisible(true)}
              className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 active:bg-white/20"
            >
              <Text className="text-white font-bold text-sm">{selectedBook.name}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsChapterModalVisible(true)}
              className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 active:bg-white/20"
            >
              <Text className="text-white font-bold text-sm">Ch. {selectedChapter}</Text>
            </TouchableOpacity>
          </View>

          {/* Audio Narration and Translation Controls */}
          <View className="flex-row items-center space-x-1.5">
            <TouchableOpacity
              onPress={handleToggleAudio}
              className={`px-2.5 py-1.5 rounded-xl border flex-row items-center space-x-1 ${
                isPlayingAudio
                  ? 'bg-amber-500 border-amber-400'
                  : 'bg-white/10 border-white/15 active:bg-white/20'
              }`}
            >
              <Text className={`text-xs font-bold ${isPlayingAudio ? 'text-slate-950' : 'text-white'}`}>
                {isPlayingAudio ? (isAudioPaused ? '▶ Resume' : '⏸ Pause') : '🔊 Listen'}
              </Text>
            </TouchableOpacity>

            {isPlayingAudio && (
              <TouchableOpacity
                onPress={handleStopAudio}
                className="px-2 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40"
              >
                <Text className="text-rose-400 font-bold text-xs">⏹</Text>
              </TouchableOpacity>
            )}

            {/* Yoruba Audio Trigger */}
            <TouchableOpacity
              onPress={() => setShowYorubaBar(!showYorubaBar)}
              className={`px-2 py-1.5 rounded-xl border flex-row items-center ${
                showYorubaBar
                  ? 'bg-amber-600 border-amber-500'
                  : 'bg-white/10 border-white/15 active:bg-white/20'
              }`}
            >
              <Text className="text-white text-xs font-bold">Yorùbá</Text>
              {yorubaAudio?.isDownloaded && (
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />
              )}
            </TouchableOpacity>

            {/* Translation Picker Trigger */}
            <TouchableOpacity
              onPress={() => setIsTransModalVisible(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 active:bg-amber-500/30"
            >
              <Text className="text-amber-400 font-bold text-xs">{translation}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Yoruba DaBible Audio Panel */}
        {showYorubaBar && (
          <View className="mt-2.5 pt-2 border-t border-amber-500/30 bg-amber-500/10 -mx-4 px-4 py-2 flex-row items-center justify-between">
            <View>
              <Text className="text-amber-300 font-bold text-xs">
                Bibeli Mímọ́ (Yorùbá) — Orí {selectedChapter}
              </Text>
              <Text className="text-white/60 text-[10px]">
                {yorubaAudio?.isDownloaded ? '✓ Saved on Local Storage' : 'Streaming from DaBible'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSaveYorubaAudio}
              className="px-2.5 py-1 rounded-lg bg-white/15 border border-white/20"
            >
              <Text className="text-white text-[11px] font-semibold">
                {yorubaAudio?.isDownloaded ? '✓ Saved' : '↓ Save Offline'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Accountability & Reading Progress Bar */}
        <View className="mt-2.5 pt-2 border-t border-white/5 flex-row items-center justify-between">
          <View className="flex-row items-center space-x-2">
            <View className="h-1.5 w-20 bg-white/10 rounded-full overflow-hidden">
              <View
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${Math.min(100, Math.max(scrollDepth, isCompleted ? 100 : 0))}%` }}
              />
            </View>
            <Text className="text-[10px] text-white/50">{scrollDepth}% read</Text>
            {pendingQueueCount > 0 && (
              <View className="px-1.5 py-0.5 rounded bg-amber-500/20">
                <Text className="text-[9px] text-amber-300 font-medium">
                  {pendingQueueCount} queued offline
                </Text>
              </View>
            )}
          </View>

          {/* Mark as Read Button */}
          <TouchableOpacity
            onPress={markAsRead}
            disabled={isCompleted}
            className={`px-3 py-1 rounded-lg flex-row items-center space-x-1 ${
              isCompleted
                ? 'bg-emerald-500/20 border border-emerald-500/40'
                : 'bg-amber-500 active:bg-amber-600'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                isCompleted ? 'text-emerald-400' : 'text-slate-950'
              }`}
            >
              {isCompleted ? '✓ Completed' : 'Mark as Read'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scripture Verses View */}
      <ScrollView
        className="flex-1 px-4 py-4"
        contentContainerStyle={{ paddingBottom: 60 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text className="text-white/60 text-xs mt-3">Loading Holy Scripture...</Text>
          </View>
        ) : error ? (
          <View className="py-16 items-center px-4">
            <Text className="text-amber-400 font-bold text-sm mb-2 text-center">{error}</Text>
            <TouchableOpacity
              onPress={() => setTranslation('KJV')}
              className="mt-3 px-4 py-2 rounded-xl bg-amber-500 active:bg-amber-600"
            >
              <Text className="text-white font-semibold text-xs">Switch to KJV</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-3">
            {verses.map((v) => (
              <TouchableOpacity
                key={v.id || v.verse}
                onPress={() => handleShareVerse(v)}
                activeOpacity={0.7}
              >
                <GlassCard
                  className={`p-3.5 mb-2.5 ${
                    activeNarratedVerse === v.verse
                      ? 'border border-amber-400 bg-amber-500/20'
                      : ''
                  }`}
                >
                  <View className="flex-row items-start space-x-2">
                    <Text className="text-amber-400 font-bold text-xs mt-0.5 w-6">
                      {v.verse}
                    </Text>
                    <Text className="text-white/90 text-base leading-relaxed flex-1 font-serif">
                      {v.text}
                    </Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}

            {/* Bottom Chapter Pager */}
            <View className="flex-row items-center justify-between pt-6 pb-8">
              {hasPrev ? (
                <TouchableOpacity
                  onPress={() => setSelectedChapter((c) => c - 1)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15"
                >
                  <Text className="text-white text-xs font-semibold">
                    ← Chapter {selectedChapter - 1}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}

              {hasNext && (
                <TouchableOpacity
                  onPress={() => setSelectedChapter((c) => c + 1)}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 active:bg-amber-600"
                >
                  <Text className="text-white text-xs font-semibold">
                    Chapter {selectedChapter + 1} →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Book Picker Modal */}
      <Modal visible={isBookModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-slate-900 rounded-t-3xl p-5 max-h-[80%] border-t border-white/10">
            <View className="flex-row items-center justify-between pb-3 border-b border-white/10 mb-3">
              <Text className="text-white font-bold text-base">Select Book of the Bible</Text>
              <TouchableOpacity onPress={() => setIsBookModalVisible(false)}>
                <Text className="text-amber-400 text-sm font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={BIBLE_BOOKS}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedBook(item);
                    setSelectedChapter(1);
                    setIsBookModalVisible(false);
                  }}
                  className={`py-3 px-3 rounded-xl mb-1 flex-row items-center justify-between ${
                    selectedBook.id === item.id ? 'bg-amber-500/20' : 'bg-transparent'
                  }`}
                >
                  <Text
                    className={`font-semibold text-sm ${
                      selectedBook.id === item.id ? 'text-amber-400 font-bold' : 'text-white/80'
                    }`}
                  >
                    {item.name}
                  </Text>
                  <Text className="text-white/40 text-xs">{item.chapters} Ch.</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Chapter Picker Modal */}
      <Modal visible={isChapterModalVisible} animationType="fade" transparent>
        <View className="flex-1 bg-black/80 items-center justify-center p-4">
          <View className="bg-slate-900 rounded-3xl p-5 w-full max-w-sm border border-white/10">
            <View className="flex-row items-center justify-between pb-3 border-b border-white/10 mb-4">
              <Text className="text-white font-bold text-base">
                {selectedBook.name} - Select Chapter
              </Text>
              <TouchableOpacity onPress={() => setIsChapterModalVisible(false)}>
                <Text className="text-amber-400 text-sm font-semibold">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-72">
              <View className="flex-row flex-wrap justify-between">
                {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
                  <TouchableOpacity
                    key={ch}
                    onPress={() => {
                      setSelectedChapter(ch);
                      setIsChapterModalVisible(false);
                    }}
                    className={`w-[18%] py-3 mb-2 rounded-xl items-center justify-center border ${
                      selectedChapter === ch
                        ? 'bg-amber-500 border-amber-400'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        selectedChapter === ch ? 'text-white' : 'text-white/80'
                      }`}
                    >
                      {ch}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Translation Picker Modal */}
      <Modal visible={isTransModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-slate-900 rounded-t-3xl p-5 max-h-[70%] border-t border-white/10">
            <View className="flex-row items-center justify-between pb-3 border-b border-white/10 mb-3">
              <Text className="text-white font-bold text-base">Choose Bible Version</Text>
              <TouchableOpacity onPress={() => setIsTransModalVisible(false)}>
                <Text className="text-amber-400 text-sm font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
            {/* Download Progress Banner */}
            {downloadProgress && downloadProgress.status === 'downloading' && (
              <View className="mb-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-amber-300 font-bold text-xs">
                    Downloading {downloadProgress.currentBookName}...
                  </Text>
                  <Text className="text-amber-300 font-bold text-xs">
                    {downloadProgress.percentage}%
                  </Text>
                </View>
                <View className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${downloadProgress.percentage}%` }}
                  />
                </View>
                <Text className="text-white/40 text-[10px] mt-1">
                  Saving all 66 books to local storage for offline use
                </Text>
              </View>
            )}

            <FlatList
              data={POPULAR_TRANSLATIONS}
              keyExtractor={(item) => item.shortName}
              renderItem={({ item }) => {
                const isInbuilt = item.shortName === 'KJV';
                const isDownloaded = downloadedVersions.includes(item.shortName);
                const isSelected = translation === item.shortName;

                return (
                  <View
                    className={`p-3 rounded-xl mb-2 flex-row items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border border-amber-500/40'
                        : 'bg-white/5 border border-white/5'
                    }`}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setTranslation(item.shortName);
                        setIsTransModalVisible(false);
                      }}
                      className="flex-1 mr-2"
                    >
                      <View className="flex-row items-center space-x-2">
                        <Text
                          className={`font-bold text-sm ${
                            isSelected ? 'text-amber-400' : 'text-white'
                          }`}
                        >
                          {item.shortName}
                        </Text>
                        {isInbuilt && (
                          <View className="px-1.5 py-0.5 rounded bg-emerald-500/20">
                            <Text className="text-emerald-400 text-[9px] font-bold">
                              Inbuilt Default
                            </Text>
                          </View>
                        )}
                        {isDownloaded && !isInbuilt && (
                          <View className="px-1.5 py-0.5 rounded bg-emerald-500/20">
                            <Text className="text-emerald-400 text-[9px] font-bold">
                              ✓ Saved Offline
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-white/60 text-xs">{item.fullName}</Text>
                      <Text className="text-amber-400/60 text-[10px]">{item.language}</Text>
                    </TouchableOpacity>

                    {!isInbuilt && !isDownloaded && (
                      <TouchableOpacity
                        onPress={() => handleDownloadTranslation(item.shortName)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500 active:bg-amber-600"
                      >
                        <Text className="text-slate-950 font-bold text-[10px]">
                          ↓ Download
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
