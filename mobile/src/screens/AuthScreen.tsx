import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import GlassCard from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { mobileSupabase } from '../lib/supabase';

export function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const res = await mobileSupabase.signUp(email.trim(), password, name.trim());
        if (res.error) {
          Alert.alert('Sign Up Failed', res.error.message);
        } else {
          Alert.alert('Success', 'Account created! Welcome to Daily Love For Jesus.');
        }
      } else {
        const res = await mobileSupabase.signIn(email.trim(), password);
        if (res.error) {
          Alert.alert('Login Failed', res.error.message);
        } else {
          Alert.alert('Success', 'Welcome back!');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-900 justify-center items-center px-6">
      <View className="w-full max-w-sm">
        {/* Header */}
        <View className="items-center mb-6">
          <Text className="text-3xl font-bold text-amber-400">Daily Love</Text>
          <Text className="text-sm font-semibold text-white/80 uppercase tracking-widest mt-1">
            For Jesus
          </Text>
          <Text className="text-xs text-white/50 mt-1">Love Fellowship Christian International</Text>
        </View>

        {/* Glass Card Container */}
        <GlassCard
          title={isSignUp ? 'Create Account' : 'Welcome Back'}
          subtitle={isSignUp ? 'Sign up to sync devotionals & streaks' : 'Sign in to access your saved verses & prayers'}
        >
          {/* Tab Switcher */}
          <View className="flex-row bg-white/10 rounded-xl p-1 mb-4 w-full">
            <TouchableOpacity
              onPress={() => setIsSignUp(false)}
              className={`flex-1 py-2 rounded-lg items-center ${!isSignUp ? 'bg-amber-500' : ''}`}
            >
              <Text className={`text-xs font-bold ${!isSignUp ? 'text-slate-950' : 'text-white/70'}`}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsSignUp(true)}
              className={`flex-1 py-2 rounded-lg items-center ${isSignUp ? 'bg-amber-500' : ''}`}
            >
              <Text className={`text-xs font-bold ${isSignUp ? 'text-slate-950' : 'text-white/70'}`}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          {isSignUp && (
            <TextInput
              placeholder="Full Name"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              className="w-full bg-white/10 text-white rounded-xl px-4 py-3 mb-3 border border-white/10 text-sm"
            />
          )}

          <TextInput
            placeholder="Email address"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            className="w-full bg-white/10 text-white rounded-xl px-4 py-3 mb-3 border border-white/10 text-sm"
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            className="w-full bg-white/10 text-white rounded-xl px-4 py-3 mb-4 border border-white/10 text-sm"
          />

          {loading ? (
            <ActivityIndicator size="small" color="#f59e0b" className="py-3" />
          ) : (
            <PrimaryButton
              title={isSignUp ? 'Create Account' : 'Sign In'}
              onPress={handleAuth}
              className="w-full bg-amber-500"
            />
          )}
        </GlassCard>
      </View>
    </View>
  );
}
