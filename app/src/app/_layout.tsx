import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "../global.css";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" backgroundColor="#050814" translucent={false} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#070B14' },
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
