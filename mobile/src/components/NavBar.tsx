import React from 'react'
import { View, Text } from 'react-native'

export function NavBar({ title }: { title?: string }) {
  return (
    <View className="w-full bg-white/4 py-3 px-4 border-b border-white/6">
      <Text className="text-white text-lg font-bold">{title || 'Daily Love For Jesus'}</Text>
    </View>
  )
}
