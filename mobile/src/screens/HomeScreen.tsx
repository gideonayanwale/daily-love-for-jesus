import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import GlassCard from '../components/GlassCard';
import { NavBar } from '../components/NavBar';
import { PrimaryButton } from '../components/PrimaryButton';
import { Modal } from '../components/Modal';
import {
  mobileDevotionalsApi,
  mobileBibleApi,
  checkBackendConnection,
  MobileDevotional,
  MobileVerseOfTheDay,
} from '../lib/api-client';

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const [modalVisible, setModalVisible] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const [devotional, setDevotional] = useState<MobileDevotional | null>(null);
  const [verseOfDay, setVerseOfDay] = useState<MobileVerseOfTheDay | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Load live data from NestJS backend on mount
  useEffect(() => {
    loadHomeData();
  }, []);

  async function loadHomeData() {
    setLoadingData(true);
    try {
      // 1. Check backend connection
      const health = await checkBackendConnection();
      setIsConnected(health.connected);
      setHealthStatus(health);

      // 2. Fetch today's devotional & verse in parallel
      const [todayDev, randomVerse] = await Promise.all([
        mobileDevotionalsApi.getToday(),
        mobileBibleApi.getRandomVerse(),
      ]);

      setDevotional(todayDev);
      setVerseOfDay(randomVerse);
    } catch (err) {
      console.warn('[HomeScreen] Error loading live data:', err);
    } finally {
      setLoadingData(false);
    }
  }

  async function testBackend() {
    setCheckingHealth(true);
    const res = await checkBackendConnection();
    setHealthStatus(res);
    setIsConnected(res.connected);
    setCheckingHealth(false);
    setModalVisible(true);
  }

  return (
    <View className="flex-1 bg-slate-900">
      <NavBar title="Daily Love For Jesus" />
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Backend Connectivity Status Bar */}
        <View className="flex-row items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 mb-4">
          <View className="flex-row items-center gap-2">
            <View
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected === true
                  ? 'bg-emerald-400'
                  : isConnected === false
                  ? 'bg-rose-400'
                  : 'bg-amber-400'
              }`}
            />
            <Text className="text-xs text-white/80 font-medium">
              Backend:{' '}
              <Text className="text-white font-semibold">
                {isConnected === true
                  ? 'Connected (NestJS)'
                  : isConnected === false
                  ? 'Offline / Offline Mode'
                  : 'Checking...'}
              </Text>
            </Text>
          </View>
          <TouchableOpacity onPress={testBackend}>
            <Text className="text-xs text-amber-400 font-semibold underline">
              {checkingHealth ? 'Testing...' : 'Diagnostic'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Verse of the Day Card */}
        {verseOfDay && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Bible')}
            className="mb-4 bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl p-5 border border-amber-400/30 shadow-lg"
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-amber-200">
                Verse of the Day
              </Text>
              <Text className="text-xs font-bold text-amber-200">
                {verseOfDay.translation}
              </Text>
            </View>
            <Text className="text-base font-serif italic text-white leading-relaxed mb-3">
              "{verseOfDay.text}"
            </Text>
            <Text className="text-xs font-bold text-amber-100">
              {verseOfDay.bookName} {verseOfDay.chapter}:{verseOfDay.verse}
            </Text>
          </TouchableOpacity>
        )}

        {/* Today's Devotional Card */}
        <GlassCard
          title={devotional ? devotional.title : "Today's Devotional"}
          subtitle={
            devotional?.scripture
              ? devotional.scripture
              : 'Daily spiritual guidance and prayer'
          }
        >
          {loadingData ? (
            <ActivityIndicator size="small" color="#f59e0b" className="py-4" />
          ) : devotional ? (
            <View>
              <Text
                numberOfLines={3}
                className="text-sm text-white/80 leading-relaxed mb-4"
              >
                {devotional.body}
              </Text>
              <PrimaryButton
                title="Read Devotional"
                onPress={() => navigation.navigate('Devotionals')}
              />
            </View>
          ) : (
            <View>
              <Text className="text-sm text-white/70 mb-3">
                No devotional published for today yet. Check past devotionals.
              </Text>
              <PrimaryButton
                title="Open Devotionals"
                onPress={() => navigation.navigate('Devotionals')}
              />
            </View>
          )}
        </GlassCard>

        {/* Quick Access Grid */}
        <View className="mt-2 space-y-3">
          <GlassCard title="Holy Bible" subtitle="50+ translations & audio narration">
            <PrimaryButton
              title="Open Bible Reader"
              onPress={() => navigation.navigate('Bible')}
            />
          </GlassCard>

          <GlassCard title="Hymns Catalog" subtitle="Sacred hymns, sheet music & lyrics">
            <PrimaryButton
              title="Browse Hymns"
              onPress={() => navigation.navigate('Hymns')}
            />
          </GlassCard>

          <GlassCard title="Sunday School & Fellowship" subtitle="Class attendance, rosters & announcements">
            <PrimaryButton
              title="Open Community"
              onPress={() => navigation.navigate('Community')}
            />
          </GlassCard>
        </View>
      </ScrollView>

      {/* Backend Diagnostic Modal */}
      <Modal
        visible={modalVisible}
        title="NestJS Backend Diagnostics"
        onClose={() => setModalVisible(false)}
      >
        <View className="space-y-3">
          <Text className="text-sm text-white/80">
            Target URL: <Text className="font-mono text-amber-300">{healthStatus?.url}</Text>
          </Text>
          <Text className="text-sm text-white/80">
            Status: <Text className="font-semibold text-emerald-300">{healthStatus?.statusText}</Text>
          </Text>
          {healthStatus?.details && (
            <View className="bg-black/30 p-3 rounded-xl mt-2">
              <Text className="text-xs font-mono text-white/70">
                {JSON.stringify(healthStatus.details, null, 2)}
              </Text>
            </View>
          )}
          <TouchableOpacity
            onPress={loadHomeData}
            className="mt-3 bg-amber-500 py-2.5 rounded-xl items-center"
          >
            <Text className="text-slate-950 font-bold text-xs">Refresh Live Data</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
