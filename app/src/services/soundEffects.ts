import { Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';

let nativeAudioPlayer: any = null;

export async function playSyncAlignmentBeep(): Promise<void> {
  // 1. Web Audio API for Browser
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
        return;
      }
    } catch (e) {
      console.log('Web audio beep fallback:', e);
    }
  }

  // 2. Native Android & iOS via expo-audio
  try {
    if (!nativeAudioPlayer) {
      nativeAudioPlayer = createAudioPlayer({
        uri: 'https://cdn.freesound.org/previews/268/268822_4486188-lq.mp3',
      });
    }
    if (nativeAudioPlayer) {
      if (typeof nativeAudioPlayer.seekTo === 'function') {
        nativeAudioPlayer.seekTo(0);
      }
      nativeAudioPlayer.play();
    }
  } catch (e) {
    console.log('Native audio beep error:', e);
  }
}
