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
import { mobileDevotionalsApi, MobileDevotional } from '../lib/api-client';

export function DevotionalsScreen() {
  const navigation = useNavigation<any>();
  const [devotionals, setDevotionals] = useState<MobileDevotional[]>([]);
  const [selectedDevotional, setSelectedDevotional] = useState<MobileDevotional | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDevotionals();
  }, []);

  async function fetchDevotionals() {
    setLoading(true);
    try {
      const data = await mobileDevotionalsApi.getList(30, 0);
      setDevotionals(data.items || []);
      if (data.items && data.items.length > 0) {
        setSelectedDevotional(data.items[0]);
      }
    } catch (err) {
      console.warn('[DevotionalsScreen] Error loading devotionals:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = devotionals.filter((d) =>
    search ? d.title.toLowerCase().includes(search.toLowerCase()) || d.scripture?.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <View className="flex-1 bg-slate-900">
      <NavBar title="Daily Devotionals" onBack={() => navigation.goBack()} />

      {/* If a devotional is opened in reader view */}
      {selectedDevotional ? (
        <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 60 }}>
          <TouchableOpacity
            onPress={() => setSelectedDevotional(null)}
            className="mb-4 inline-flex flex-row items-center gap-1"
          >
            <Text className="text-amber-400 font-semibold text-xs">← Back to All Devotionals</Text>
          </TouchableOpacity>

          <GlassCard
            title={selectedDevotional.title}
            subtitle={
              selectedDevotional.devotionalDate
                ? new Date(selectedDevotional.devotionalDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : undefined
            }
          >
            {/* Scripture Pill */}
            {selectedDevotional.scripture && (
              <View className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-3 my-2">
                <Text className="text-amber-300 font-bold text-xs uppercase tracking-wide">
                  Scripture Reference
                </Text>
                <Text className="text-white font-serif font-semibold text-sm mt-0.5">
                  {selectedDevotional.scripture}
                </Text>
                {selectedDevotional.scriptureText && (
                  <Text className="text-white/80 font-serif italic text-xs mt-1">
                    "{selectedDevotional.scriptureText}"
                  </Text>
                )}
              </View>
            )}

            {/* Devotional Body */}
            <Text className="text-white/90 text-sm leading-relaxed my-3 font-normal">
              {selectedDevotional.body}
            </Text>

            {/* Reflection */}
            {selectedDevotional.reflection && (
              <View className="border-t border-white/10 pt-3 mt-3">
                <Text className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                  Daily Reflection
                </Text>
                <Text className="text-white/80 text-xs leading-relaxed italic">
                  {selectedDevotional.reflection}
                </Text>
              </View>
            )}

            {/* Prayer */}
            {selectedDevotional.prayer && (
              <View className="bg-white/5 border border-white/10 rounded-xl p-3 mt-4">
                <Text className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                  Prayer for Today
                </Text>
                <Text className="text-white/90 font-serif italic text-xs leading-relaxed">
                  {selectedDevotional.prayer}
                </Text>
              </View>
            )}

            {selectedDevotional.author && (
              <Text className="text-white/50 text-[10px] mt-4 text-right">
                Minister: {selectedDevotional.author}
              </Text>
            )}
          </GlassCard>
        </ScrollView>
      ) : (
        /* Devotionals Catalog / List View */
        <View className="flex-1 p-4">
          {/* Search bar */}
          <TextInput
            placeholder="Search devotionals or scriptures..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            className="w-full bg-white/10 text-white rounded-xl px-4 py-2.5 mb-3 border border-white/10 text-xs"
          />

          {loading ? (
            <ActivityIndicator size="large" color="#f59e0b" className="py-12" />
          ) : filtered.length === 0 ? (
            <View className="py-16 items-center">
              <Text className="text-white/60 text-sm">No devotionals found.</Text>
            </View>
          ) : (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {filtered.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedDevotional(item)}
                  className="mb-2.5 bg-white/5 border border-white/10 rounded-xl p-3.5 hover:bg-white/10"
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-xs text-amber-400 font-semibold">
                      {item.devotionalDate
                        ? new Date(item.devotionalDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Devotional'}
                    </Text>
                    {item.scripture && (
                      <Text className="text-[11px] text-white/50 font-mono">
                        {item.scripture}
                      </Text>
                    )}
                  </View>
                  <Text className="text-sm font-bold text-white mb-1">{item.title}</Text>
                  <Text numberOfLines={2} className="text-xs text-white/70 leading-relaxed">
                    {item.body}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}
