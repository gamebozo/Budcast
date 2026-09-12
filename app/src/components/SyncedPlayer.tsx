import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { MediaItem, MediaMode, PlaybackState, SyncEvent } from '../types/sync';
import { syncEngine } from '../services/syncEngine';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  RotateCcw, RotateCw, Sparkles, Radio, Activity, Music,
  Zap, AlertCircle, Film
} from 'lucide-react-native';

// Conditional imports for native video
let VideoView: any = null;
let useVideoPlayer: any = null;
let createAudioPlayer: any = null;

if (Platform.OS !== 'web') {
  try {
    const videoMod = require('expo-video');
    VideoView = videoMod.VideoView;
    useVideoPlayer = videoMod.useVideoPlayer;
  } catch (e) {
    console.log('Native expo-video load:', e);
  }
  try {
    const audioMod = require('expo-audio');
    createAudioPlayer = audioMod.createAudioPlayer;
  } catch (e) {
    console.log('Native expo-audio load:', e);
  }
}

interface Props {
  media: MediaItem;
  mode: MediaMode;
  isHost: boolean;
  onHostAction?: (action: 'PLAY' | 'PAUSE' | 'SEEK' | 'SET_RATE', data?: any) => void;
  syncEvent?: SyncEvent | null;
  initialPlaybackState?: PlaybackState;
}

export const SyncedPlayer: React.FC<Props> = ({
  media,
  mode,
  isHost,
  onHostAction,
  syncEvent,
  initialPlaybackState
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nativeAudioRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(initialPlaybackState?.isPlaying || false);
  const [currentTime, setCurrentTime] = useState(initialPlaybackState?.currentTime || 0);
  const [duration, setDuration] = useState(media.duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [audioBoost, setAudioBoost] = useState(false);
  const [driftMs, setDriftMs] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackError, setPlaybackError] = useState<string>('');
  const [skipFeedback, setSkipFeedback] = useState<'left' | 'right' | null>(null);

  // Native Video Player instance from expo-video
  let nativePlayer: any = null;
  if (Platform.OS !== 'web' && useVideoPlayer && mode === 'video') {
    nativePlayer = useVideoPlayer(media.url, (p: any) => {
      p.loop = false;
      p.muted = isMuted;
      if (initialPlaybackState?.isPlaying) {
        p.play();
      }
    });
  }

  // Native Audio player setup
  useEffect(() => {
    if (Platform.OS !== 'web' && createAudioPlayer && mode === 'audio' && media.url) {
      try {
        const p = createAudioPlayer({ uri: media.url });
        nativeAudioRef.current = p;
        if (initialPlaybackState?.isPlaying) {
          p.play();
        }
      } catch (e) {
        console.log('Native audio player init error:', e);
      }
      return () => {
        if (nativeAudioRef.current) {
          try {
            nativeAudioRef.current.pause();
          } catch(e){}
        }
      };
    }
  }, [media.url, mode]);

  // Sync event listener from socket
  useEffect(() => {
    if (!syncEvent) return;

    if (Platform.OS === 'web') {
      const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
      if (!mediaEl) return;

      if (syncEvent.action === 'PLAY') {
        const serverNow = syncEngine.getServerTime();
        const delayMs = (syncEvent.scheduledStartServerTime || serverNow) - serverNow;

        if (typeof syncEvent.currentTime === 'number') {
          mediaEl.currentTime = syncEvent.currentTime;
        }

        if (delayMs > 0) {
          setTimeout(() => {
            mediaEl.play().catch(e => console.log('Web play err:', e));
            setIsPlaying(true);
          }, delayMs);
        } else {
          const elapsedSec = Math.max(0, -delayMs / 1000);
          mediaEl.currentTime = (syncEvent.currentTime || 0) + elapsedSec;
          mediaEl.play().catch(e => console.log('Web play err:', e));
          setIsPlaying(true);
        }
      } else if (syncEvent.action === 'PAUSE') {
        mediaEl.pause();
        if (typeof syncEvent.currentTime === 'number') {
          mediaEl.currentTime = syncEvent.currentTime;
        }
        setIsPlaying(false);
      } else if (syncEvent.action === 'SEEK') {
        if (typeof syncEvent.currentTime === 'number') {
          mediaEl.currentTime = syncEvent.currentTime;
          setCurrentTime(syncEvent.currentTime);
        }
        if (syncEvent.isPlaying) {
          mediaEl.play().catch(e => console.log('Seek play:', e));
          setIsPlaying(true);
        }
      }
    } else {
      // Native Player sync handling
      const p = mode === 'video' ? nativePlayer : nativeAudioRef.current;
      if (!p) return;

      if (syncEvent.action === 'PLAY') {
        if (typeof syncEvent.currentTime === 'number') {
          if (p.currentTime !== undefined) p.currentTime = syncEvent.currentTime;
          else if (p.seekTo) p.seekTo(syncEvent.currentTime);
        }
        p.play?.();
        setIsPlaying(true);
      } else if (syncEvent.action === 'PAUSE') {
        p.pause?.();
        if (typeof syncEvent.currentTime === 'number') {
          if (p.currentTime !== undefined) p.currentTime = syncEvent.currentTime;
          else if (p.seekTo) p.seekTo(syncEvent.currentTime);
        }
        setIsPlaying(false);
      } else if (syncEvent.action === 'SEEK') {
        if (typeof syncEvent.currentTime === 'number') {
          if (p.currentTime !== undefined) p.currentTime = syncEvent.currentTime;
          else if (p.seekTo) p.seekTo(syncEvent.currentTime);
          setCurrentTime(syncEvent.currentTime);
        }
        if (syncEvent.isPlaying) {
          p.play?.();
          setIsPlaying(true);
        }
      }
    }
  }, [syncEvent, mode, nativePlayer]);

  // Periodic drift check & time update
  useEffect(() => {
    const interval = setInterval(() => {
      let cur = 0;
      let dur = duration;

      if (Platform.OS === 'web') {
        const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
        if (mediaEl) {
          cur = mediaEl.currentTime;
          if (mediaEl.duration && !isNaN(mediaEl.duration) && mediaEl.duration > 0) {
            dur = mediaEl.duration;
          }
        }
      } else {
        const p = mode === 'video' ? nativePlayer : nativeAudioRef.current;
        if (p) {
          cur = p.currentTime || (p.currentStatus?.positionMillis ? p.currentStatus.positionMillis / 1000 : currentTime);
          if (p.duration && !isNaN(p.duration)) dur = p.duration;
        }
      }

      setCurrentTime(cur);
      if (dur > 0 && dur !== duration) setDuration(dur);

      if (!isHost && isPlaying && initialPlaybackState) {
        const serverNow = syncEngine.getServerTime();
        const expectedTime = initialPlaybackState.currentTime +
          ((serverNow - initialPlaybackState.lastUpdatedServerTime) / 1000);

        const currentDrift = Math.abs(cur - expectedTime);
        setDriftMs(Math.round(currentDrift * 1000));
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isPlaying, isHost, initialPlaybackState, mode, duration, nativePlayer]);

  const togglePlay = () => {
    setPlaybackError('');
    if (Platform.OS === 'web') {
      const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
      if (!mediaEl) return;

      if (isHost) {
        if (mediaEl.paused) {
          mediaEl.play()
            .then(() => {
              setIsPlaying(true);
              if (onHostAction) onHostAction('PLAY', { currentTime: mediaEl.currentTime, delay: 100 });
            })
            .catch(err => {
              console.error('Play error:', err);
              setPlaybackError('Tap to enable audio');
            });
        } else {
          mediaEl.pause();
          setIsPlaying(false);
          if (onHostAction) onHostAction('PAUSE', { currentTime: mediaEl.currentTime });
        }
      } else {
        if (mediaEl.paused) {
          mediaEl.play().then(() => setIsPlaying(true)).catch(e => console.log(e));
        } else {
          mediaEl.pause();
          setIsPlaying(false);
        }
      }
    } else {
      // Native Play / Pause
      const p = mode === 'video' ? nativePlayer : nativeAudioRef.current;
      if (!p) return;

      if (isPlaying) {
        p.pause?.();
        setIsPlaying(false);
        if (isHost && onHostAction) onHostAction('PAUSE', { currentTime });
      } else {
        p.play?.();
        setIsPlaying(true);
        if (isHost && onHostAction) onHostAction('PLAY', { currentTime, delay: 100 });
      }
    }
  };

  const handleSeekJump = (seconds: number) => {
    const targetTime = Math.max(0, Math.min(duration || 9999, currentTime + seconds));
    setCurrentTime(targetTime);

    if (Platform.OS === 'web') {
      const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
      if (mediaEl) mediaEl.currentTime = targetTime;
    } else {
      const p = mode === 'video' ? nativePlayer : nativeAudioRef.current;
      if (p) {
        if (p.currentTime !== undefined) p.currentTime = targetTime;
        else if (p.seekTo) p.seekTo(targetTime);
      }
    }

    setSkipFeedback(seconds < 0 ? 'left' : 'right');
    setTimeout(() => setSkipFeedback(null), 600);

    if (isHost && onHostAction) {
      onHostAction('SEEK', { currentTime: targetTime, delay: 100, isPlaying });
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (Platform.OS === 'web') {
      const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
      if (mediaEl) mediaEl.muted = nextMuted;
    } else {
      const p = mode === 'video' ? nativePlayer : nativeAudioRef.current;
      if (p && p.muted !== undefined) p.muted = nextMuted;
    }
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        {/* VIDEO MODE */}
        {mode === 'video' ? (
          <View style={styles.videoWrapper}>
            {Platform.OS === 'web' ? (
              <video
                ref={videoRef}
                src={media.url}
                playsInline
                preload="auto"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  backgroundColor: '#000',
                  cursor: 'pointer'
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedMetadata={(e: any) => {
                  if (e.target.duration && !isNaN(e.target.duration)) {
                    setDuration(e.target.duration);
                  }
                }}
                onClick={togglePlay}
              />
            ) : VideoView && nativePlayer ? (
              <VideoView
                player={nativePlayer}
                style={styles.nativeVideo}
                allowsFullscreen
                allowsPictureInPicture
                contentFit="contain"
              />
            ) : (
              <View style={styles.audioStage}>
                <Film size={36} color="#38BDF8" />
                <Text style={styles.mediaTitleText}>{media.title || 'Movie Broadcast'}</Text>
              </View>
            )}

            {/* Top Bar Overlay */}
            <View style={styles.topOverlay}>
              <Text style={styles.mediaTitle} numberOfLines={1}>{media.title}</Text>
              <View style={styles.lockBadge}>
                <View style={styles.lockDot} />
                <Text style={styles.lockText}>
                  {isHost ? 'HOST STREAM' : driftMs < 40 ? 'EARBUDS LOCKED' : `${driftMs}ms`}
                </Text>
              </View>
            </View>

            {/* Skip Feedback Icons */}
            {skipFeedback === 'left' && (
              <View style={[styles.skipBadge, { left: '15%' }]}>
                <RotateCcw size={16} color="#38BDF8" />
                <Text style={styles.skipText}>-10s</Text>
              </View>
            )}
            {skipFeedback === 'right' && (
              <View style={[styles.skipBadge, { right: '15%' }]}>
                <Text style={styles.skipText}>+10s</Text>
                <RotateCw size={16} color="#38BDF8" />
              </View>
            )}

            {/* Bottom Controls Bar */}
            <View style={styles.bottomControlsBar}>
              {/* Scrubber Track */}
              <View style={styles.scrubberRail}>
                <View style={[styles.scrubberProgress, { width: `${progressPercent}%` }]} />
              </View>

              <View style={styles.controlsRow}>
                {/* Play / 10s Rewind / 10s Forward / Timecode */}
                <View style={styles.controlsLeft}>
                  <TouchableOpacity onPress={togglePlay} style={styles.iconBtn}>
                    {isPlaying ? <Pause size={18} color="#FFF" /> : <Play size={18} color="#FFF" />}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleSeekJump(-10)} style={styles.iconBtn}>
                    <RotateCcw size={15} color="#CBD5E1" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleSeekJump(10)} style={styles.iconBtn}>
                    <RotateCw size={15} color="#CBD5E1" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={toggleMute} style={styles.iconBtn}>
                    {isMuted ? <VolumeX size={16} color="#EF4444" /> : <Volume2 size={16} color="#CBD5E1" />}
                  </TouchableOpacity>

                  <Text style={styles.timecodeText}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </Text>
                </View>

                {/* Right controls: Boost badge */}
                <TouchableOpacity
                  onPress={() => setAudioBoost(!audioBoost)}
                  style={[styles.boostBadge, audioBoost && styles.boostBadgeActive]}
                >
                  <Zap size={11} color={audioBoost ? '#38BDF8' : '#94A3B8'} />
                  <Text style={[styles.boostText, audioBoost && { color: '#38BDF8' }]}>BOOST</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          /* AUDIO / SILENT DISCO MODE */
          <View style={styles.audioStage}>
            {Platform.OS === 'web' && (
              <audio
                ref={audioRef}
                src={media.url}
                preload="auto"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedMetadata={(e: any) => {
                  if (e.target.duration && !isNaN(e.target.duration)) {
                    setDuration(e.target.duration);
                  }
                }}
              />
            )}

            {/* Glowing DJ Radio Disc */}
            <View style={[styles.djDisc, isPlaying && styles.djDiscActive]}>
              <Radio size={28} color="#EF4444" />
            </View>

            <Text style={styles.audioTitle}>{media.title || 'Silent Disco Track'}</Text>
            <Text style={styles.audioSubtitle}>
              Earbud Synchronized Broadcast • {formatTime(currentTime)} / {formatTime(duration)}
            </Text>

            {/* Audio Scrubber Rail */}
            <View style={styles.audioScrubberRail}>
              <View style={[styles.audioScrubberProgress, { width: `${progressPercent}%` }]} />
            </View>

            {/* Audio Buttons */}
            <View style={styles.audioControlsRow}>
              <TouchableOpacity onPress={() => handleSeekJump(-10)} style={styles.audioRoundBtn}>
                <RotateCcw size={16} color="#CBD5E1" />
              </TouchableOpacity>

              <TouchableOpacity onPress={togglePlay} style={styles.audioPlayBtn}>
                {isPlaying ? (
                  <Pause size={22} color="#090A0F" fill="#090A0F" />
                ) : (
                  <Play size={22} color="#090A0F" fill="#090A0F" style={{ marginLeft: 2 }} />
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleSeekJump(10)} style={styles.audioRoundBtn}>
                <RotateCw size={16} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  stage: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeVideo: {
    width: '100%',
    height: '100%',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 20,
  },
  mediaTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  mediaTitleText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  lockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  lockText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  skipBadge: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -15 }],
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    zIndex: 25,
  },
  skipText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  bottomControlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 20,
  },
  scrubberRail: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  scrubberProgress: {
    height: '100%',
    backgroundColor: '#38BDF8',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 2,
  },
  timecodeText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
  },
  boostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  boostBadgeActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderColor: '#38BDF8',
  },
  boostText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
  },
  audioStage: {
    width: '100%',
    padding: 20,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  djDisc: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  djDiscActive: {
    borderColor: '#EF4444',
  },
  audioTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
    textAlign: 'center',
  },
  audioSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 12,
  },
  audioScrubberRail: {
    width: '90%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    marginBottom: 14,
    overflow: 'hidden',
  },
  audioScrubberProgress: {
    height: '100%',
    backgroundColor: '#EF4444',
  },
  audioControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  audioRoundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
