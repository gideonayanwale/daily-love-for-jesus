import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'

export function NavBar({ title, onBack }: { title?: string; onBack?: () => void }) {
  return (
    <View className="w-full bg-white/4 py-3 px-4 border-b border-white/6 flex-row items-center">
      {onBack && (
        <TouchableOpacity onPress={onBack} className="mr-3 py-1 px-2 rounded-lg bg-white/10 active:opacity-70">
          <Text className="text-white text-base font-bold">←</Text>
        </TouchableOpacity>
      )}
      <Text className="text-white text-lg font-bold flex-1">{title || 'Daily Love For Jesus'}</Text>
    </View>
  )
}

export default NavBar

