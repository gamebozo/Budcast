import { Platform } from 'react-native';

let createAudioPlayerFn: any = null;
if (Platform.OS !== 'web') {
  try {
    const audioModule = require('expo-audio');
    createAudioPlayerFn = audioModule.createAudioPlayer;
  } catch (e) {
    console.log('[soundEffects] expo-audio load warning:', e);
  }
}

let nativePlayerMap: { [key: string]: any } = {};

/**
 * Play standard 880Hz precision sync alignment beep
 */
export async function playSyncAlignmentBeep(): Promise<void> {
  // 1. Web Audio API for Web Browser
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
  playNativeSound('beep', 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
}

/**
 * Play EQ Profile Preview Sound (Cinema, Bass Boost, Vocal Clarity, Studio Flat)
 */
export async function playEqPreviewSound(eqType: 'cinema' | 'bass' | 'vocal' | 'flat'): Promise<void> {
  // Web Audio dynamic synthesis with EQ shaping
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;

        if (eqType === 'cinema') {
          // Cinematic sub boom + chord (110Hz + 440Hz)
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(110, now);
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(440, now);
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        } else if (eqType === 'bass') {
          // Heavy punch bass (80Hz down-sweep)
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(140, now);
          osc1.frequency.exponentialRampToValueAtTime(50, now + 0.4);
          osc2.type = 'sawtooth';
          osc2.frequency.setValueAtTime(70, now);
          gain.gain.setValueAtTime(0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        } else if (eqType === 'vocal') {
          // Bright vocal harmonic bell (880Hz + 1320Hz)
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(880, now);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1320, now);
          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        } else {
          // Studio Flat clean reference tone (440Hz standard)
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(440, now);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(440, now);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        }

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.6);
        osc2.stop(now + 0.6);
        return;
      }
    } catch (e) {
      console.log('Web audio EQ preview error:', e);
    }
  }

  // Native Android & iOS fallback
  const soundUrls: Record<string, string> = {
    cinema: 'https://actions.google.com/sounds/v1/science_fiction/scifi_laser_blast.ogg',
    bass: 'https://actions.google.com/sounds/v1/impacts/wood_plank_flicks.ogg',
    vocal: 'https://actions.google.com/sounds/v1/cartoon/metal_twang.ogg',
    flat: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
  };
  playNativeSound(eqType, soundUrls[eqType] || soundUrls.flat);
}

/**
 * Play Earbud Preset Calibration Chime
 */
export async function playEarbudPresetChime(offsetMs: number): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const freq = 520 + (offsetMs * 3); // Dynamic pitch indicating latency offset
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
        return;
      }
    } catch (e) {
      console.log('Web chime error:', e);
    }
  }

  playNativeSound('chime', 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
}

function playNativeSound(key: string, url: string) {
  if (Platform.OS === 'web' || !createAudioPlayerFn) return;
  try {
    if (!nativePlayerMap[key]) {
      nativePlayerMap[key] = createAudioPlayerFn({ uri: url });
    }
    const player = nativePlayerMap[key];
    if (player) {
      if (typeof player.seekTo === 'function') {
        player.seekTo(0);
      }
      player.play?.();
    }
  } catch (err) {
    console.log('[soundEffects] native sound error:', err);
  }
}
