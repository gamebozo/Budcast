import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const PROD_API_URL = 'https://budcast.onrender.com';

/**
 * Helper to determine the local development host IP on native devices
 */
function getDevHostIp(): string | null {
  if (!__DEV__) return null;
  
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return window.location.hostname;
    }
    return 'localhost';
  }

  // Native mobile (Expo Go / Dev Client)
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).expoGoConfig?.debuggerHost || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) return ip;
  }

  // Fallback dev IP if available
  return '172.17.71.102';
}

/**
 * Returns the primary API base URL for Cloud Services:
 * - Pre-launch & VIP Pass Verification
 * - Razorpay In-App Payment Orders & Subscriptions
 * - Presets & Cloud Sync
 */
export function getApiBaseUrl(): string {
  if (__DEV__) {
    const devHost = getDevHostIp();
    if (devHost) {
      return `http://${devHost}:4000`;
    }
  }
  // Production Cloud URL on Render
  return PROD_API_URL;
}

/**
 * Returns the Socket.IO URL for Live Audio Synchronization
 */
export function getSocketUrl(customHost?: string): string {
  if (customHost) {
    return customHost.startsWith('http') ? customHost : `http://${customHost}:4000`;
  }
  if (__DEV__) {
    const devHost = getDevHostIp();
    if (devHost) {
      return `http://${devHost}:4000`;
    }
  }
  return PROD_API_URL;
}

