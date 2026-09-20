import React from 'react';
import { View, Text } from 'react-native';

type Props = {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export default function GlassCard({ title, subtitle, children }: Props) {
  return (
    <View className="w-full p-6 rounded-2xl bg-white/6 border border-white/8 items-center shadow-lg">
      {title ? <Text className="text-xl font-bold text-white mb-1">{title}</Text> : null}
      {subtitle ? <Text className="text-sm text-white/90 text-center mb-2">{subtitle}</Text> : null}
      <View className="w-full">{children}</View>
    </View>
  );
}
