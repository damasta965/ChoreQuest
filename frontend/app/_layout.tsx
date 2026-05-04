import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider } from '../src/session';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="pin" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="hero" />
          <Stack.Screen name="boss" />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
