import React from 'react'
import { TouchableOpacity, Text, GestureResponderEvent } from 'react-native'

type Props = {
  title: string
  onPress?: (e: GestureResponderEvent) => void
  className?: string
}

export function PrimaryButton({ title, onPress, className = '' }: Props) {
  return (
    <TouchableOpacity onPress={onPress} className={`bg-white/10 rounded-xl px-5 py-3 ${className}`}>
      <Text className="text-white text-base font-semibold text-center">{title}</Text>
    </TouchableOpacity>
  )
}
