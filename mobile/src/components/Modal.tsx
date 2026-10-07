import React from 'react'
import { Modal as RNModal, View, Text, TouchableOpacity } from 'react-native'

export function Modal({ visible, title, children, onClose }: any) {
  return (
    <RNModal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/60 p-4">
        <View className="w-full max-w-md bg-slate-800 p-4 rounded-xl">
          <Text className="text-white text-lg font-bold mb-2">{title}</Text>
          {children}
          <TouchableOpacity onPress={onClose} className="mt-4 bg-white/8 rounded px-3 py-2">
            <Text className="text-white text-center">Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </RNModal>
  )
}
