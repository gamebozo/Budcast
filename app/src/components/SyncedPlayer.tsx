import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  StatusBar,
  BackHandler,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { MediaItem, MediaMode, PlaybackState, SyncEvent } from '../types/sync';
import { syncEngine } from '../services/syncEngine';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Radio,
  Zap,
  Film,
  X,
} from 'lucide-react-native';

// Safe dynamic imports for native video & audio
let VideoViewComponent: any = null;
let useVideoPlayerHook: any = null;

if (Platform.OS !== 'web') {
  try {
    const videoMod = require('expo-video');
    VideoViewComponent = videoMod.VideoView;
    useVideoPlayerHook = videoMod.useVideoPlayer;
  } catch (e) {
    console.log('[SyncedPlayer] expo-video load notice:', e);
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

/**
 * Native Video Player sub-component using expo-video
 * NOTE: nativeControls={false} is critical to keep ONLY ONE single smooth progress bar!
 */
const NativeVideoPlayer: React.FC<{
  url: string;
  isMuted: boolean;
  onTimeUpdate: (cur: number, dur: number) => void;
  onPlayStateChange: (playing: boolean) => void;
  playerRef: React.MutableRefObject<any>;
  isFullscreen?: boolean;
}> = ({ url, isMuted, onTimeUpdate, onPlayStateChange, playerRef, isFullscreen }) => {
  if (!useVideoPlayerHook || !VideoViewComponent) {
    return (
      <View style={styles.fallbackBox}>
        <Film size={36} color="#38BDF8" />
        <Text style={styles.fallbackTitle}>Native Video Ready</Text>
      </View>
    );
  }

  const player = useVideoPlayerHook(url, (p: any) => {
    p.loop = false;
    p.muted = isMuted;
    p.play();
  });

  playerRef.current = player;

  useEffect(() => {
    if (!player) return;
    player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      try {
        const cur = player.currentTime || 0;
        const dur = player.duration || 0;
        const playing = player.playing ?? false;
        onTimeUpdate(cur, dur);
        onPlayStateChange(playing);
      } catch (e) {}
    }, 400);

    return () => clearInterval(interval);
  }, [player]);

  return (
    <VideoViewComponent
      player={player}
      style={isFullscreen ? styles.fullscreenNativeVideo : styles.nativeVideo}
      nativeControls={false}
      allowsFullscreen={false}
      contentFit="contain"
    />
  );
};

export const SyncedPlayer: React.FC<Props> = ({
  media,
  mode,
  isHost,
  onHostAction,
  syncEvent,
  initialPlaybackState,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const webContainerRef = useRef<HTMLDivElement | null>(null);
  const nativePlayerRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(
    initialPlaybackState !== undefined ? initialPlaybackState.isPlaying : true
  );
  const [currentTime, setCurrentTime] = useState(initialPlaybackState?.currentTime || 0);
  const [duration, setDuration] = useState(media.duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [audioBoost, setAudioBoost] = useState(false);
  const [driftMs, setDriftMs] = useState(0);
  const [skipFeedback, setSkipFeedback] = useState<'left' | 'right' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoScrubberWidth, setVideoScrubberWidth] = useState(300);
  const [audioScrubberWidth, setAudioScrubberWidth] = useState(300);
  const controlsTimeoutRef = useRef<any>(null);

  // Auto-hide controls in fullscreen after 3.5s
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  useEffect(() => {
    if (isFullscreen) {
      resetControlsTimeout();
    } else {
      setShowControls(true);
    }
  }, [isFullscreen, isPlaying]);

  // YouTube-Style Screen Orientation Listener for Auto-Rotation
  useEffect(() => {
    let orientationSubscription: any = null;

    if (Platform.OS !== 'web' && mode === 'video') {
      try {
        ScreenOrientation.unlockAsync().catch(() => {});

        orientationSubscription = ScreenOrientation.addOrientationChangeListener((evt) => {
          const orientation = evt.orientationInfo.orientation;
          const isLandscape =
            orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
            orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;

          setIsFullscreen(isLandscape);
        });
      } catch (e) {
        console.log('[Orientation Error]:', e);
      }
    }

    return () => {
      if (orientationSubscription) {
        ScreenOrientation.removeOrientationChangeListener(orientationSubscription);
      }
      if (Platform.OS !== 'web') {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
    };
  }, [mode]);

  // Android Hardware Back Button to Exit Fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const onBackPress = () => {
      toggleFullscreen();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [isFullscreen]);

  // Toggle Fullscreen Function (Rotate & Expand)
  const toggleFullscreen = async () => {
    const nextState = !isFullscreen;
    setIsFullscreen(nextState);

    if (Platform.OS === 'web') {
      if (nextState) {
        const elem = webContainerRef.current || (videoRef.current as any);
        if (elem?.requestFullscreen) {
          elem.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } else {
      try {
        if (nextState) {
          // Lock to Landscape on Fullscreen
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } else {
          // Return to Portrait when exiting
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          setTimeout(() => {
            ScreenOrientation.unlockAsync().catch(() => {});
          }, 600);
        }
      } catch (err) {
        console.log('[ScreenOrientation Error]:', err);
      }
    }
  };

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
            mediaEl.play().catch((e) => console.log('Web play err:', e));
            setIsPlaying(true);
          }, delayMs);
        } else {
          const elapsedSec = Math.max(0, -delayMs / 1000);
          mediaEl.currentTime = (syncEvent.currentTime || 0) + elapsedSec;
          mediaEl.play().catch((e) => console.log('Web play err:', e));
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
          mediaEl.play().catch((e) => console.log('Seek play:', e));
          setIsPlaying(true);
        }
      }
    } else {
      // Native Player sync handling
      const p = nativePlayerRef.current;
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
  }, [syncEvent, mode]);

  // Periodic web drift check & time update
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const interval = setInterval(() => {
      const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
      if (mediaEl) {
        setCurrentTime(mediaEl.currentTime || 0);
        if (mediaEl.duration && !isNaN(mediaEl.duration) && mediaEl.duration > 0) {
          setDuration(mediaEl.duration);
        }
      }
    }, 400);

    return () => clearInterval(interval);
  }, [mode]);

  const togglePlay = () => {
    resetControlsTimeout();
    if (Platform.OS === 'web') {
      const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
      if (!mediaEl) return;

      if (isHost) {
        if (mediaEl.paused) {
          mediaEl
            .play()
            .then(() => {
              setIsPlaying(true);
              if (onHostAction) onHostAction('PLAY', { currentTime: mediaEl.currentTime, delay: 100 });
            })
            .catch((err) => console.error('Play error:', err));
        } else {
          mediaEl.pause();
          setIsPlaying(false);
          if (onHostAction) onHostAction('PAUSE', { currentTime: mediaEl.currentTime });
        }
      } else {
        if (mediaEl.paused) {
          mediaEl.play().then(() => setIsPlaying(true)).catch((e) => console.log(e));
        } else {
          mediaEl.pause();
          setIsPlaying(false);
        }
      }
    } else {
      // Native Play / Pause
      const p = nativePlayerRef.current;
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
    resetControlsTimeout();
    const targetTime = Math.max(0, Math.min(duration || 9999, currentTime + seconds));
    setCurrentTime(targetTime);

    if (Platform.OS === 'web') {
      const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
      if (mediaEl) mediaEl.currentTime = targetTime;
    } else {
      const p = nativePlayerRef.current;
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

  const handleScrubberTouch = (event: any, isVideoScrubber = true) => {
    resetControlsTimeout();
    const { locationX } = event.nativeEvent;
    const measuredWidth = isVideoScrubber ? videoScrubberWidth : audioScrubberWidth;
    const barWidth = measuredWidth > 0 ? measuredWidth : Dimensions.get('window').width - 32;
    if (duration > 0 && barWidth > 0) {
      const seekRatio = Math.max(0, Math.min(1, locationX / barWidth));
      const targetTime = seekRatio * duration;
      setCurrentTime(targetTime);

      if (Platform.OS === 'web') {
        const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
        if (mediaEl) mediaEl.currentTime = targetTime;
      } else {
        const p = nativePlayerRef.current;
        if (p) {
          if (p.currentTime !== undefined) p.currentTime = targetTime;
          else if (p.seekTo) p.seekTo(targetTime);
        }
      }

      if (isHost && onHostAction) {
        onHostAction('SEEK', { currentTime: targetTime, delay: 100, isPlaying });
      }
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (Platform.OS === 'web') {
      const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
      if (mediaEl) mediaEl.muted = nextMuted;
    } else {
      const p = nativePlayerRef.current;
      if (p && p.muted !== undefined) p.muted = nextMuted;
    }
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  // Video Player Content Elements
  const renderVideoPlayerElement = (isModalFullscreen: boolean) => {
    if (Platform.OS === 'web') {
      return (
        <video
          ref={videoRef}
          src={media.url}
          playsInline
          autoPlay
          preload="auto"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: '#000',
            cursor: 'pointer',
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
      );
    }

    return (
      <NativeVideoPlayer
        url={media.url}
        isMuted={isMuted}
        playerRef={nativePlayerRef}
        isFullscreen={isModalFullscreen}
        onTimeUpdate={(cur, dur) => {
          setCurrentTime(cur);
          if (dur > 0) setDuration(dur);
        }}
        onPlayStateChange={(playing) => setIsPlaying(playing)}
      />
    );
  };

  // Video Controls Overlay (Single Smooth Scrubber + Buttons)
  const renderVideoControlsOverlay = (isModalFullscreen: boolean) => {
    if (!showControls && isModalFullscreen) return null;

    return (
      <View style={styles.controlsOverlayContainer} pointerEvents="box-none">
        {/* Top Overlay */}
        <View style={styles.topOverlay}>
          <Text style={styles.mediaTitle} numberOfLines={1}>
            {media.title}
          </Text>
          <View style={styles.topRightRow}>
            <View style={styles.lockBadge}>
              <View style={styles.lockDot} />
              <Text style={styles.lockText}>
                {isHost ? 'HOST STREAM' : driftMs < 40 ? 'EARBUDS LOCKED' : `${driftMs}ms`}
              </Text>
            </View>
            {isModalFullscreen && (
              <TouchableOpacity onPress={toggleFullscreen} style={styles.exitBtn}>
                <X size={18} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Skip Feedback Animation */}
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
          {/* SINGLE SMOOTH SCRUBBER RAIL */}
          <TouchableOpacity
            activeOpacity={1}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0) setVideoScrubberWidth(w);
            }}
            onPress={(e) => handleScrubberTouch(e, true)}
            style={styles.scrubberTouchableArea}
          >
            <View style={styles.scrubberRail}>
              <View style={[styles.scrubberProgress, { width: `${progressPercent}%` }]} />
              <View
                style={[
                  styles.scrubberThumb,
                  { left: `${Math.max(0, Math.min(98, progressPercent))}%` },
                ]}
              />
            </View>
          </TouchableOpacity>

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

            {/* Right controls: Boost badge & Fullscreen Toggle */}
            <View style={styles.controlsRight}>
              <TouchableOpacity
                onPress={() => setAudioBoost(!audioBoost)}
                style={[styles.boostBadge, audioBoost && styles.boostBadgeActive]}
              >
                <Zap size={11} color={audioBoost ? '#38BDF8' : '#94A3B8'} />
                <Text style={[styles.boostText, audioBoost && { color: '#38BDF8' }]}>BOOST</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleFullscreen} style={styles.fullscreenBtn}>
                {isModalFullscreen ? (
                  <Minimize size={17} color="#FFF" />
                ) : (
                  <Maximize size={17} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. ROOT FULLSCREEN MODAL (YouTube-Style Immersive Landscape Player) */}
      {mode === 'video' && isFullscreen && (
        <Modal
          visible={isFullscreen}
          transparent={false}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={toggleFullscreen}
        >
          <StatusBar hidden={true} />
          <TouchableWithoutFeedback onPress={resetControlsTimeout}>
            <View style={styles.rootFullscreenModal}>
              {renderVideoPlayerElement(true)}
              {renderVideoControlsOverlay(true)}
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* 2. IN-LINE PORTRAIT PLAYER */}
      <View style={styles.stage}>
        {mode === 'video' ? (
          <TouchableWithoutFeedback onPress={resetControlsTimeout}>
            <View
              // @ts-ignore
              ref={webContainerRef}
              style={styles.videoWrapper}
            >
              {renderVideoPlayerElement(false)}
              {renderVideoControlsOverlay(false)}
            </View>
          </TouchableWithoutFeedback>
        ) : (
          /* AUDIO / SILENT DISCO MODE */
          <View style={styles.audioStage}>
            {Platform.OS === 'web' ? (
              <audio
                ref={audioRef}
                src={media.url}
                autoPlay
                preload="auto"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedMetadata={(e: any) => {
                  if (e.target.duration && !isNaN(e.target.duration)) {
                    setDuration(e.target.duration);
                  }
                }}
              />
            ) : (
              <NativeVideoPlayer
                url={media.url}
                isMuted={isMuted}
                playerRef={nativePlayerRef}
                isFullscreen={false}
                onTimeUpdate={(cur, dur) => {
                  setCurrentTime(cur);
                  if (dur > 0) setDuration(dur);
                }}
                onPlayStateChange={(playing) => setIsPlaying(playing)}
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

            {/* Single Smooth Audio Scrubber Rail */}
            <TouchableOpacity
              activeOpacity={1}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0) setAudioScrubberWidth(w);
              }}
              onPress={(e) => handleScrubberTouch(e, false)}
              style={styles.audioScrubberTouchable}
            >
              <View style={styles.audioScrubberRail}>
                <View style={[styles.audioScrubberProgress, { width: `${progressPercent}%` }]} />
              </View>
            </TouchableOpacity>

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
  rootFullscreenModal: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeVideo: {
    width: '100%',
    height: '100%',
  },
  fullscreenNativeVideo: {
    width: '100%',
    height: '100%',
  },
  controlsOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    zIndex: 30,
  },

  fallbackBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackTitle: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  topOverlay: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exitBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
  },
  mediaTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
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
    zIndex: 35,
  },
  skipText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  bottomControlsBar: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  scrubberTouchableArea: {
    width: '100%',
    paddingVertical: 8,
    justifyContent: 'center',
  },
  scrubberRail: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  scrubberProgress: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 2,
  },
  scrubberThumb: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38BDF8',
    top: -3,
    marginLeft: -5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  controlsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 2,
  },
  fullscreenBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
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
  audioScrubberTouchable: {
    width: '90%',
    paddingVertical: 6,
  },
  audioScrubberRail: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
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
    marginTop: 8,
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


