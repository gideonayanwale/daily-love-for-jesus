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
import { GlassCard } from '../components/GlassCard';
import {
  BIBLE_BOOKS,
  POPULAR_TRANSLATIONS,
  fetchChapterVerses,
  MobileVerse,
  BibleBook,
} from '../lib/bibleApi';

export function BibleScreen() {
  const [selectedBook, setSelectedBook] = useState<BibleBook>(BIBLE_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [translation, setTranslation] = useState<string>('KJV');
  const [verses, setVerses] = useState<MobileVerse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
    loadVerses();
  }, [selectedBook.id, selectedChapter, translation]);

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
          {/* Book & Chapter Trigger */}
          <View className="flex-row items-center space-x-2">
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

          {/* Translation Picker Trigger */}
          <TouchableOpacity
            onPress={() => setIsTransModalVisible(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 active:bg-amber-500/30"
          >
            <Text className="text-amber-400 font-bold text-xs">{translation}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scripture Verses View */}
      <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 60 }}>
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
                <GlassCard className="p-3.5 mb-2.5">
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
            <FlatList
              data={POPULAR_TRANSLATIONS}
              keyExtractor={(item) => item.shortName}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setTranslation(item.shortName);
                    setIsTransModalVisible(false);
                  }}
                  className={`py-3 px-3 rounded-xl mb-1.5 flex-row items-center justify-between ${
                    translation === item.shortName
                      ? 'bg-amber-500/20 border border-amber-500/40'
                      : 'bg-white/5'
                  }`}
                >
                  <View>
                    <Text
                      className={`font-bold text-sm ${
                        translation === item.shortName ? 'text-amber-400' : 'text-white'
                      }`}
                    >
                      {item.shortName}
                    </Text>
                    <Text className="text-white/60 text-xs">{item.fullName}</Text>
                  </View>
                  <Text className="text-amber-400/70 text-xs">{item.language}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
