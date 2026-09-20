import React, { useState } from 'react'
import { View, Text } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import GlassCard from '../components/GlassCard'
import { NavBar } from '../components/NavBar'
import { PrimaryButton } from '../components/PrimaryButton'
import { Modal } from '../components/Modal'
import { fetchHello } from '../lib/api-client'

export function HomeScreen() {
  const navigation = useNavigation()
  const [modalVisible, setModalVisible] = useState(false)
  const [payload, setPayload] = useState<any>(null)

  async function callApi() {
    const res = await fetchHello()
    setPayload(res)
    setModalVisible(true)
  }

  return (
    <View className="flex-1 bg-slate-900">
      <NavBar title="Daily Love For Jesus" />
      <View className="p-4">
        <Text className="text-2xl font-bold text-white mb-4">Welcome</Text>

        <GlassCard title="Bible" subtitle="Read the Word">
          <PrimaryButton title="Open Bible" onPress={() => navigation.navigate('Bible' as never)} />
        </GlassCard>

        <GlassCard title="Hymns" subtitle="Sing with faith">
          <PrimaryButton title="Open Hymns" onPress={() => navigation.navigate('Hymns' as never)} />
        </GlassCard>

        <GlassCard title="Devotionals" subtitle="Daily inspiration">
          <PrimaryButton title="Open Devotionals" onPress={() => navigation.navigate('Devotionals' as never)} />
        </GlassCard>

        <View className="mt-6">
          <PrimaryButton title="Test API" onPress={callApi} />
        </View>
      </View>

      <Modal visible={modalVisible} title="API Result" onClose={() => setModalVisible(false)}>
        <Text className="text-white">{payload ? JSON.stringify(payload) : 'No response'}</Text>
      </Modal>
    </View>
  )
}
