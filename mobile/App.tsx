import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native'
import { AppNavigator } from './src/navigation/AppNavigator'

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <AppNavigator />
      <StatusBar style="auto" />
    </SafeAreaView>
  )
}
