import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, Text, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center p-6">
      <View className="w-full p-7 rounded-2xl bg-white/6 border border-white/8 items-center shadow-lg">
        <Text className="text-2xl font-bold text-white mb-2">Daily Love For Jesus</Text>
        <Text className="text-sm text-white/90 text-center">A short daily devotional to bless your day.</Text>
      </View>
      <Text className="absolute bottom-7 text-xs text-white/60">Powered by ForLove Media</Text>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
