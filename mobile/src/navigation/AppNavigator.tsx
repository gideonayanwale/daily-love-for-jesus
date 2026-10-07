import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { HomeScreen } from '../screens/HomeScreen'
import { BibleScreen } from '../screens/BibleScreen'
import { HymnsScreen } from '../screens/HymnsScreen'
import { DevotionalsScreen } from '../screens/DevotionalsScreen'
import { CommunityScreen } from '../screens/CommunityScreen'
import { AuthScreen } from '../screens/AuthScreen'

const Stack = createNativeStackNavigator()

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Bible" component={BibleScreen} />
        <Stack.Screen name="Hymns" component={HymnsScreen} />
        <Stack.Screen name="Devotionals" component={DevotionalsScreen} />
        <Stack.Screen name="Community" component={CommunityScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
