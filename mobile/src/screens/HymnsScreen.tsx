import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavBar } from '../components/NavBar';
import GlassCard from '../components/GlassCard';
import { mobileHymnsApi, MobileHymn } from '../lib/api-client';

export function HymnsScreen() {
  const navigation = useNavigation<any>();
  const [hymns, setHymns] = useState<MobileHymn[]>([]);
  const [selectedHymn, setSelectedHymn] = useState<MobileHymn | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHymns();
  }, [selectedCategory]);

  async function loadHymns() {
    setLoading(true);
    try {
      const [hymnList, cats] = await Promise.all([
        mobileHymnsApi.getList(undefined, selectedCategory || undefined),
        categories.length === 0 ? mobileHymnsApi.getCategories() : Promise.resolve(categories),
      ]);
      setHymns(hymnList || []);
      if (cats && categories.length === 0) setCategories(cats);
    } catch (err) {
      console.warn('[HymnsScreen] Error loading hymns:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = hymns.filter((h) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      h.title.toLowerCase().includes(q) ||
      h.hymnNumber.toString().includes(q) ||
      (h.lyrics && h.lyrics.toLowerCase().includes(q))
    );
  });

  return (
    <View className="flex-1 bg-slate-900">
      <NavBar title="Sacred Hymns" onBack={() => navigation.goBack()} />

      {/* Detail Lyrics Reader */}
      {selectedHymn ? (
        <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 60 }}>
          <TouchableOpacity
            onPress={() => setSelectedHymn(null)}
            className="mb-4 inline-flex flex-row items-center gap-1"
          >
            <Text className="text-amber-400 font-semibold text-xs">← Back to Hymn Index</Text>
          </TouchableOpacity>

          <GlassCard
            title={`#${selectedHymn.hymnNumber} - ${selectedHymn.title}`}
            subtitle={selectedHymn.category || 'Hymn of Praise'}
          >
            {selectedHymn.author && (
              <Text className="text-amber-300 text-xs italic mb-4">
                Author: {selectedHymn.author}
              </Text>
            )}

            {/* Lyrics with Stanzas */}
            <View className="bg-white/5 border border-white/10 rounded-xl p-4 my-2">
              <Text className="text-white/95 text-sm font-serif leading-relaxed whitespace-pre-line">
                {selectedHymn.lyrics}
              </Text>
            </View>

            {selectedHymn.chorus && (
              <View className="bg-amber-500/10 border border-amber-400/20 rounded-xl p-3 mt-3">
                <Text className="text-amber-300 font-bold text-xs uppercase tracking-wider mb-1">
                  Chorus / Refrain
                </Text>
                <Text className="text-white/90 text-xs italic font-serif leading-relaxed">
                  {selectedHymn.chorus}
                </Text>
              </View>
            )}
          </GlassCard>
        </ScrollView>
      ) : (
        /* Hymns Catalog List */
        <View className="flex-1 p-4">
          {/* Search Box */}
          <TextInput
            placeholder="Search by title, lyrics, or hymn number..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            className="w-full bg-white/10 text-white rounded-xl px-4 py-2.5 mb-3 border border-white/10 text-xs"
          />

          {/* Category Chips Horizontal Scroll */}
          {categories.length > 0 && (
            <View className="mb-3">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                <TouchableOpacity
                  onPress={() => setSelectedCategory(null)}
                  className={`px-3 py-1.5 rounded-full mr-2 border ${
                    !selectedCategory
                      ? 'bg-amber-500 border-amber-400'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      !selectedCategory ? 'text-slate-950' : 'text-white/70'
                    }`}
                  >
                    All Hymns
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() =>
                      setSelectedCategory(selectedCategory === cat ? null : cat)
                    }
                    className={`px-3 py-1.5 rounded-full mr-2 border ${
                      selectedCategory === cat
                        ? 'bg-amber-500 border-amber-400'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        selectedCategory === cat ? 'text-slate-950' : 'text-white/70'
                      }`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#f59e0b" className="py-12" />
          ) : filtered.length === 0 ? (
            <View className="py-16 items-center">
              <Text className="text-white/60 text-sm">No hymns match your query.</Text>
            </View>
          ) : (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {filtered.map((hymn) => (
                <TouchableOpacity
                  key={hymn.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedHymn(hymn)}
                  className="mb-2 bg-white/5 border border-white/10 rounded-xl p-3 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <View className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 items-center justify-center">
                      <Text className="text-amber-300 font-bold text-xs">
                        {hymn.hymnNumber}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-white truncate">
                        {hymn.title}
                      </Text>
                      {hymn.category && (
                        <Text className="text-[11px] text-white/50">{hymn.category}</Text>
                      )}
                    </View>
                  </View>
                  <Text className="text-amber-400 font-bold text-xs">→</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}
