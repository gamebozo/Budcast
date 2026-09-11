import { Platform } from 'react-native';

export const PROD_API_URL = 'https://budcast.onrender.com';

/**
 * Returns the primary API base URL for Cloud Services:
 * - Pre-launch & VIP Pass Verification
 * - Razorpay In-App Payment Orders & Subscriptions
 * - Presets & Cloud Sync
 */
export function getApiBaseUrl(): string {
  // If running in local development web mode on localhost
  if (__DEV__ && Platform.OS === 'web' && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `http://${window.location.hostname}:4000`;
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
  if (__DEV__ && Platform.OS === 'web' && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `http://${window.location.hostname}:4000`;
  }
  return PROD_API_URL;
}
