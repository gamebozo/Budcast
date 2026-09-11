import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MediaItem, MediaMode, PlaybackState, SyncEvent } from '../types/sync';
import { syncEngine } from '../services/syncEngine';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  RotateCcw, RotateCw, Sparkles, Radio, Activity, Music,
  Zap, AlertCircle
} from 'lucide-react-native';

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimer = useRef<any>(null);

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

  // Auto-hide controls effect when playing
  useEffect(() => {
    if (isPlaying) {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    } else {
      setShowControls(true);
    }
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [isPlaying]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false);
    }
  };

  // Sync event listener from socket
  useEffect(() => {
    if (!syncEvent) return;
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
          mediaEl.play().catch(e => {
            console.log('Autoplay wait:', e);
            setPlaybackError('Tap screen to allow audio & start playing');
          });
          setIsPlaying(true);
        }, delayMs);
      } else {
        const elapsedSec = Math.max(0, -delayMs / 1000);
        mediaEl.currentTime = (syncEvent.currentTime || 0) + elapsedSec;
        mediaEl.play().catch(e => {
          console.log('Autoplay wait:', e);
          setPlaybackError('Tap screen to allow audio & start playing');
        });
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
  }, [syncEvent, mode]);

  // Periodic drift check & time update
  useEffect(() => {
    const interval = setInterval(() => {
      const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
      if (!mediaEl) return;

      setCurrentTime(mediaEl.currentTime);
      if (mediaEl.duration && !isNaN(mediaEl.duration) && mediaEl.duration > 0) {
        setDuration(mediaEl.duration);
      }

      if (!isHost && isPlaying && initialPlaybackState) {
        const serverNow = syncEngine.getServerTime();
        const expectedTime = initialPlaybackState.currentTime +
          ((serverNow - initialPlaybackState.lastUpdatedServerTime) / 1000);

        const currentDrift = Math.abs(mediaEl.currentTime - expectedTime);
        setDriftMs(Math.round(currentDrift * 1000));

        if (currentDrift > 0.08 && currentDrift < 0.5) {
          mediaEl.playbackRate = mediaEl.currentTime < expectedTime ? 1.04 : 0.96;
        } else if (currentDrift >= 0.5) {
          mediaEl.currentTime = expectedTime;
          mediaEl.playbackRate = 1.0;
        } else {
          mediaEl.playbackRate = 1.0;
        }
      }
    }, 300);

    return () => clearInterval(interval);
  }, [isPlaying, isHost, initialPlaybackState, mode]);

  // Keyboard Shortcuts (Space, Arrow keys, F, M)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as any)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeekJump(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeekJump(10);
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const togglePlay = () => {
    setPlaybackError('');
    handleMouseMove();
    const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
    if (!mediaEl) return;

    if (isHost) {
      if (mediaEl.paused) {
        mediaEl.play()
          .then(() => {
            setIsPlaying(true);
            if (onHostAction) {
              onHostAction('PLAY', { currentTime: mediaEl.currentTime, delay: 100 });
            }
          })
          .catch(err => {
            console.error('Play error:', err);
            setPlaybackError('Click to interact and enable playback');
          });
      } else {
        mediaEl.pause();
        setIsPlaying(false);
        if (onHostAction) {
          onHostAction('PAUSE', { currentTime: mediaEl.currentTime });
        }
      }
    } else {
      if (mediaEl.paused) {
        mediaEl.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.log('Guest play:', e));
      } else {
        mediaEl.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSeekJump = (seconds: number) => {
    handleMouseMove();
    const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
    if (!mediaEl) return;

    const targetTime = Math.max(0, Math.min(duration || 9999, mediaEl.currentTime + seconds));
    mediaEl.currentTime = targetTime;
    setCurrentTime(targetTime);

    setSkipFeedback(seconds < 0 ? 'left' : 'right');
    setTimeout(() => setSkipFeedback(null), 600);

    if (isHost && onHostAction) {
      onHostAction('SEEK', { currentTime: targetTime, delay: 100, isPlaying });
    }
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHost) return;
    const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
    if (!mediaEl || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const targetTime = Math.max(0, Math.min(duration, pos * duration));

    mediaEl.currentTime = targetTime;
    setCurrentTime(targetTime);

    if (onHostAction) {
      onHostAction('SEEK', { currentTime: targetTime, delay: 100, isPlaying });
    }
  };

  const toggleMute = () => {
    const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
    if (!mediaEl) return;
    mediaEl.muted = !mediaEl.muted;
    setIsMuted(mediaEl.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const mediaEl = mode === 'video' ? videoRef.current : audioRef.current;
    if (mediaEl) {
      mediaEl.volume = val;
      mediaEl.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (Platform.OS === 'web') {
      const elem = containerRef.current || videoRef.current;
      if (!elem) return;

      if (!document.fullscreenElement) {
        elem.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.();
        setIsFullscreen(false);
      }
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
      {/* Viewport Stage */}
      <View style={styles.stage}>
        {Platform.OS === 'web' ? (
          mode === 'video' ? (
            <div
              ref={containerRef as any}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                backgroundColor: '#000000',
                borderRadius: isFullscreen ? '0px' : '16px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.9)',
                cursor: showControls ? 'default' : 'none'
              }}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={handleMouseLeave}
              onClick={handleMouseMove}
            >
              {/* HTML5 Native Video Tag */}
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
                onPlay={() => {
                  setIsPlaying(true);
                  setPlaybackError('');
                }}
                onPause={() => setIsPlaying(false)}
                onLoadedMetadata={(e: any) => {
                  if (e.target.duration && !isNaN(e.target.duration)) {
                    setDuration(e.target.duration);
                  }
                }}
                onError={() => {
                  setPlaybackError('Failed to load video format');
                }}
                onClick={togglePlay}
              />

              {/* YouTube-Style Double Tap Skip Ripple Indicators */}
              {skipFeedback === 'left' && (
                <div style={{
                  position: 'absolute',
                  left: '15%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  padding: '12px 18px',
                  borderRadius: '24px',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '800',
                  zIndex: 35,
                  pointerEvents: 'none'
                }}>
                  <RotateCcw size={18} color="#38BDF8" />
                  <span>-10s</span>
                </div>
              )}

              {skipFeedback === 'right' && (
                <div style={{
                  position: 'absolute',
                  right: '15%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  padding: '12px 18px',
                  borderRadius: '24px',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '800',
                  zIndex: 35,
                  pointerEvents: 'none'
                }}>
                  <span>+10s</span>
                  <RotateCw size={18} color="#38BDF8" />
                </div>
              )}

              {/* Top Gradient Header Overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  padding: '12px 16px',
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: showControls ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                  pointerEvents: showControls ? 'auto' : 'none',
                  zIndex: 25
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#FFF', fontSize: '13px', fontWeight: '800', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                    {media.title}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#CBD5E1', letterSpacing: '0.5px' }}>
                    {isHost ? 'HOST STREAM' : driftMs < 40 ? 'EARBUDS LOCKED' : `${driftMs}ms`}
                  </span>
                </div>
              </div>

              {/* CENTER OVERLAY: Sleek compact 10s Back, Play/Pause, 10s Forward with Auto-Fade */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) scale(${showControls ? 1 : 0.92})`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px',
                  opacity: showControls ? 1 : 0,
                  transition: 'opacity 0.3s ease, transform 0.3s ease',
                  pointerEvents: showControls ? 'auto' : 'none',
                  zIndex: 30
                }}
              >
                {/* 10s Backward */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeekJump(-10);
                  }}
                  title="Rewind 10s"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <RotateCcw size={16} color="#FFFFFF" />
                  <span style={{ fontSize: '7px', fontWeight: '900', color: '#38BDF8' }}>10</span>
                </button>

                {/* Sleek Center Play / Pause */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  title={isPlaying ? 'Pause' : 'Play'}
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(10px)',
                    border: '1.5px solid rgba(56, 189, 248, 0.6)',
                    color: '#38BDF8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(56, 189, 248, 0.35)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  {isPlaying ? (
                    <Pause size={22} color="#38BDF8" fill="#38BDF8" />
                  ) : (
                    <Play size={22} color="#38BDF8" fill="#38BDF8" style={{ marginLeft: 2 }} />
                  )}
                </button>

                {/* 10s Forward */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeekJump(10);
                  }}
                  title="Forward 10s"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <RotateCw size={16} color="#FFFFFF" />
                  <span style={{ fontSize: '7px', fontWeight: '900', color: '#38BDF8' }}>10</span>
                </button>
              </div>

              {/* BOTTOM CONTROLS OVERLAY (Scrubber & Actions with Auto-Fade) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '10px 14px 12px 14px',
                  background: 'linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0) 100%)',
                  opacity: showControls ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                  pointerEvents: showControls ? 'auto' : 'none',
                  zIndex: 25
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Timeline Scrubber */}
                <div
                  onClick={handleScrubberClick}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '14px',
                    cursor: isHost ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}
                >
                  {/* Rail */}
                  <div
                    style={{
                      width: '100%',
                      height: '3px',
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      borderRadius: '2px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Progress Fill */}
                    <div
                      style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        backgroundColor: '#38BDF8',
                        boxShadow: '0 0 8px #38BDF8',
                        transition: 'width 0.1s linear'
                      }}
                    />
                  </div>

                  {/* Scrubber Thumb */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `calc(${progressPercent}% - 5px)`,
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#38BDF8',
                      boxShadow: '0 0 6px rgba(56, 189, 248, 0.8)',
                      transition: 'left 0.1s linear'
                    }}
                  />
                </div>

                {/* Bottom Controls Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  {/* Left Controls: Play/Pause, 10s Back, 10s Next, Volume, Timecode */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={togglePlay}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#FFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0
                      }}
                    >
                      {isPlaying ? <Pause size={16} color="#FFF" /> : <Play size={16} color="#FFF" />}
                    </button>

                    <button
                      onClick={() => handleSeekJump(-10)}
                      title="10s Back"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0
                      }}
                    >
                      <RotateCcw size={14} color="#CBD5E1" />
                    </button>

                    <button
                      onClick={() => handleSeekJump(10)}
                      title="10s Forward"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0
                      }}
                    >
                      <RotateCw size={14} color="#CBD5E1" />
                    </button>

                    {/* Mute / Volume */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={toggleMute}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#FFF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 0
                        }}
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX size={16} color="#EF4444" />
                        ) : (
                          <Volume2 size={16} color="#CBD5E1" />
                        )}
                      </button>

                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        style={{
                          width: '50px',
                          height: '3px',
                          accentColor: '#38BDF8',
                          cursor: 'pointer'
                        }}
                      />
                    </div>

                    {/* Timecode */}
                    <span style={{ color: '#E2E8F0', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}>
                      {formatTime(currentTime)} <span style={{ color: '#64748B' }}>/</span> {formatTime(duration)}
                    </span>
                  </div>

                  {/* Right Controls: Boost badge & Fullscreen */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => setAudioBoost(!audioBoost)}
                      title="Earbud Audio Boost"
                      style={{
                        backgroundColor: audioBoost ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                        border: audioBoost ? '1px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.15)',
                        color: audioBoost ? '#38BDF8' : '#94A3B8',
                        padding: '3px 6px',
                        borderRadius: '6px',
                        fontSize: '9px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <Zap size={10} color={audioBoost ? '#38BDF8' : '#94A3B8'} />
                      <span>BOOST</span>
                    </button>

                    <button
                      onClick={toggleFullscreen}
                      title="Fullscreen"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#FFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0
                      }}
                    >
                      {isFullscreen ? <Minimize size={16} color="#FFF" /> : <Maximize size={16} color="#FFF" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Playback Error Alert */}
              {playbackError ? (
                <div
                  onClick={togglePlay}
                  style={{
                    position: 'absolute',
                    bottom: '60px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(239, 68, 68, 0.95)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    color: '#FFF',
                    fontSize: '11px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                    cursor: 'pointer',
                    zIndex: 40
                  }}
                >
                  <AlertCircle size={13} color="#FFF" />
                  <span>{playbackError}</span>
                </div>
              ) : null}
            </div>
          ) : (
            /* Silent Disco / Audio Mode Stage with Dancing Equalizer */
            <div
              style={{
                width: '100%',
                padding: '24px 16px',
                backgroundColor: '#0F172A',
                borderRadius: '16px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 16px 32px -10px rgba(239, 68, 68, 0.15)'
              }}
            >
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

              {/* Pulsing DJ Disc */}
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '2px solid rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  boxShadow: isPlaying ? '0 0 25px rgba(239, 68, 68, 0.4)' : 'none'
                }}
              >
                <Radio size={26} color="#EF4444" />
              </div>

              {/* Track Title */}
              <h3 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '800', margin: '0 0 4px 0', textAlign: 'center' }}>
                {media.title}
              </h3>
              <span style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '14px' }}>
                Earbud Synchronized Broadcast • {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Audio Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  onClick={() => handleSeekJump(-10)}
                  style={{
                    backgroundColor: '#1E293B',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={15} color="#CBD5E1" />
                </button>

                <button
                  onClick={togglePlay}
                  style={{
                    backgroundColor: '#EF4444',
                    border: 'none',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 0 16px rgba(239, 68, 68, 0.4)'
                  }}
                >
                  {isPlaying ? <Pause size={20} color="#090A0F" fill="#090A0F" /> : <Play size={20} color="#090A0F" fill="#090A0F" style={{ marginLeft: 2 }} />}
                </button>

                <button
                  onClick={() => handleSeekJump(10)}
                  style={{
                    backgroundColor: '#1E293B',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <RotateCw size={15} color="#CBD5E1" />
                </button>
              </div>
            </div>
          )
        ) : (
          <View style={styles.nativePlaceholder}>
            <Text style={{ color: '#FFF' }}>Media Player</Text>
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
  },
  nativePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
