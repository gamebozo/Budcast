import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import "../global.css";

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        (NavigationBar as any).setVisibilityAsync?.('hidden');
        (NavigationBar as any).setBehaviorAsync?.('overlay-swipe');
        (NavigationBar as any).setBackgroundColorAsync?.('#050814');
      } catch (e) {
        console.log('NavigationBar immersive init:', e);
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#050814' },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="disco" />
          <Stack.Screen name="pro" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="host" />
          <Stack.Screen name="join" />
          <Stack.Screen name="scan" />
          <Stack.Screen name="history" />
          <Stack.Screen name="vip" />
          <Stack.Screen name="room/[id]" />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

