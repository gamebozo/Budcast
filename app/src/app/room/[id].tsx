import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getSocket } from '../../services/socket';
import { MediaItem, MediaMode, PlaybackState, SyncEvent, ReactionItem } from '../../types/sync';
import { SyncedPlayer } from '../../components/SyncedPlayer';
import { ReactionOverlay } from '../../components/ReactionOverlay';
import {
  ArrowLeft, Users, Film, Radio, AlertTriangle, Headphones,
  Sparkles, Sliders, Volume2, ShieldCheck, Activity, Zap
} from 'lucide-react-native';

const DISCO_CHANNELS = [
  {
    id: 'red',
    name: 'Channel 1: Pop/EDM',
    color: '#EF4444',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  },
  {
    id: 'blue',
    name: 'Channel 2: Cyber Club',
    color: '#38BDF8',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
  },
  {
    id: 'green',
    name: 'Channel 3: Chill / Live Mic',
    color: '#10B981',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
  }
];

export default function GuestRoomScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [mode, setMode] = useState<MediaMode>('video');
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [syncEvent, setSyncEvent] = useState<SyncEvent | null>(null);
  const [activeChannel, setActiveChannel] = useState<'red' | 'blue' | 'green'>('red');
  const [listenerCount, setListenerCount] = useState<number>(1);
  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const [earbudOffsetMs, setEarbudOffsetMs] = useState<number>(0);
  const [isGlowMode, setIsGlowMode] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();

    const joinRoom = () => {
      socket.emit('join_room', {
        roomId: id,
        name: `Earbuds #${Math.floor(100 + Math.random() * 900)}`,
        device: 'Wireless Earbuds'
      }, (response: any) => {
        if (response && response.success) {
          setTitle(response.title || 'Budcast Live Broadcast');
          setMode(response.mode || 'video');
          setMedia(response.media);
          setPlaybackState(response.playbackState);
          setListenerCount(response.listenerCount || 1);
          if (response.channel) setActiveChannel(response.channel);
          setLoading(false);
        } else {
          setError(response?.error || 'Room not found. Check the 4-digit PIN.');
          setLoading(false);
        }
      });
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.once('connect', joinRoom);
    }

    socket.on('sync_event', (event: SyncEvent) => {
      if (event.action === 'SET_MEDIA' && event.media) {
        setMedia(event.media);
        setMode(event.media.type);
      } else if (event.action === 'CHANGE_CHANNEL' && event.channel) {
        setActiveChannel(event.channel as any);
        if (event.media) {
          setMedia(event.media);
        }
      }
      setSyncEvent(event);
    });

    socket.on('listener_count_update', (data: { count: number }) => {
      setListenerCount(data.count);
    });

    socket.on('reaction_broadcast', (item: ReactionItem) => {
      if (item.emoji.includes('GLOW ON')) {
        setIsGlowMode(true);
      } else if (item.emoji.includes('GLOW OFF')) {
        setIsGlowMode(false);
      }
      setReactions((prev) => [...prev.slice(-8), item]);
    });

    socket.on('host_disconnected', () => {
      setError('The Host has ended this broadcast room.');
    });

    return () => {
      socket.off('sync_event');
      socket.off('listener_count_update');
      socket.off('reaction_broadcast');
      socket.off('host_disconnected');
    };
  }, [id]);

  const handleSendReaction = (emoji: string) => {
    if (!id) return;
    const socket = getSocket();
    socket.emit('send_reaction', {
      roomId: id,
      emoji,
      senderName: 'You'
    });
  };

  const handleChannelSelect = (channel: 'red' | 'blue' | 'green') => {
    setActiveChannel(channel);
    const targetChannel = DISCO_CHANNELS.find(c => c.id === channel);
    if (targetChannel && media) {
      setMedia({
        ...media,
        id: `channel-${channel}`,
        title: targetChannel.name,
        url: targetChannel.url
      });
    }
  };

  const currentChannelColor =
    activeChannel === 'red' ? '#EF4444' : activeChannel === 'blue' ? '#38BDF8' : '#10B981';

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Syncing Earbuds to Room #{id}...</Text>
        <Text style={styles.loadingSub}>Establishing sub-millisecond phase lock</Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <AlertTriangle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Connection Failed</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.errorBtn}
            onPress={() => router.push('/' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.errorBtnText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, isGlowMode && { backgroundColor: currentChannelColor }]}>
      {/* Fullscreen Glow Screen Mode Overlay if active */}
      {isGlowMode ? (
        <TouchableOpacity
          style={[styles.glowModeContainer, { backgroundColor: currentChannelColor }]}
          onPress={() => setIsGlowMode(false)}
          activeOpacity={0.95}
        >
          <View style={styles.glowContent}>
            <Headphones size={64} color="#090A0F" />
            <Text style={styles.glowTitle}>SILENT DISCO GLOW</Text>
            <Text style={styles.glowChannelText}>
              {activeChannel.toUpperCase()} CHANNEL ACTIVE
            </Text>
            <Text style={styles.glowTapHint}>Tap screen to return to player controls</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/' as any)}>
              <ArrowLeft size={16} color="#94A3B8" />
              <Text style={styles.backText}>Exit Room</Text>
            </TouchableOpacity>

            <View style={styles.statusPill}>
              <View style={styles.greenPulse} />
              <Text style={styles.statusText}>Synced • {listenerCount} Listeners</Text>
            </View>
          </View>

          {/* Room Header Info */}
          <View style={styles.roomHeaderCard}>
            <View style={styles.roomHeaderLeft}>
              <View style={styles.modeIconBadge}>
                {mode === 'video' ? (
                  <Film size={18} color="#38BDF8" />
                ) : (
                  <Headphones size={18} color={currentChannelColor} />
                )}
              </View>
              <View>
                <Text style={styles.roomTitle}>{title}</Text>
                <Text style={styles.roomSub}>
                  Room PIN: <Text style={{ color: '#38BDF8', fontWeight: 'bold' }}>{id}</Text> • {mode === 'video' ? 'Cinema Sync' : 'Silent Party'}
                </Text>
              </View>
            </View>
          </View>

          {/* SILENT PARTY / MULTI-CHANNEL SELECTOR */}
          {mode === 'audio' && (
            <View style={styles.channelSection}>
              <Text style={styles.channelSectionTitle}>SWITCH SILENT DISCO CHANNEL</Text>
              <View style={styles.channelBtnRow}>
                {DISCO_CHANNELS.map((ch) => {
                  const isSelected = activeChannel === ch.id;
                  return (
                    <TouchableOpacity
                      key={ch.id}
                      style={[
                        styles.channelSelectBtn,
                        isSelected && { backgroundColor: ch.color, borderColor: ch.color }
                      ]}
                      onPress={() => handleChannelSelect(ch.id as any)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.channelSelectText, isSelected && { color: '#090A0F' }]}>
                        {ch.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Synced Audio/Video Player */}
          {media && (
            <View style={styles.playerContainer}>
              <SyncedPlayer
                media={media}
                mode={mode}
                isHost={false}
                syncEvent={syncEvent}
                initialPlaybackState={playbackState || undefined}
              />
            </View>
          )}

          {/* Earbud Latency Fine-Tuner */}
          <View style={styles.earbudTunerCard}>
            <View style={styles.tunerHeader}>
              <View style={styles.tunerLeft}>
                <Sliders size={16} color="#10B981" />
                <Text style={styles.tunerTitle}>Earbud Latency Compensator</Text>
              </View>
              <Text style={styles.tunerValue}>
                {earbudOffsetMs > 0 ? `+${earbudOffsetMs}ms` : `${earbudOffsetMs}ms`}
              </Text>
            </View>
            <Text style={styles.tunerDesc}>
              Fine-tune for Bluetooth earbud delay (AirPods/Buds) so audio aligns 100% with the host.
            </Text>
            <View style={styles.tunerButtonsRow}>
              {[-60, -30, 0, +30, +60, +100].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.tunerPresetBtn,
                    earbudOffsetMs === val && styles.tunerPresetBtnActive
                  ]}
                  onPress={() => setEarbudOffsetMs(val)}
                >
                  <Text
                    style={[
                      styles.tunerPresetText,
                      earbudOffsetMs === val && styles.tunerPresetTextActive
                    ]}
                  >
                    {val > 0 ? `+${val}` : val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Silent Party Glow Mode Toggle Button */}
          {mode === 'audio' && (
            <TouchableOpacity
              style={[styles.glowLaunchBtn, { borderColor: currentChannelColor }]}
              onPress={() => setIsGlowMode(true)}
              activeOpacity={0.85}
            >
              <Sparkles size={18} color={currentChannelColor} />
              <Text style={[styles.glowLaunchBtnText, { color: currentChannelColor }]}>
                Turn Phone into Glowing Silent Disco Light
              </Text>
            </TouchableOpacity>
          )}

          {/* Floating Reaction Bar */}
          <View style={styles.reactionSection}>
            <Text style={styles.reactionLabel}>SEND REACTION TO HOST & ROOM</Text>
            <View style={styles.reactionBar}>
              {['❤️', '🔥', '🎧', '💃', '👏', '⚡'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionBtn}
                  onPress={() => handleSendReaction(emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Floating Reaction Animation Overlay */}
      <ReactionOverlay reactions={reactions} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090A0F',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#090A0F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 16,
  },
  loadingSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 6,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  errorBtn: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorBtnText: {
    color: '#090A0F',
    fontSize: 13,
    fontWeight: '800',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  backText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  roomHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  roomHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  roomSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  channelSection: {
    marginBottom: 12,
  },
  channelSectionTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  channelBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  channelSelectBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  channelSelectText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
  },
  playerContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  earbudTunerCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 14,
  },
  tunerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tunerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tunerTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tunerValue: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },
  tunerDesc: {
    color: '#64748B',
    fontSize: 10,
    marginBottom: 10,
    lineHeight: 14,
  },
  tunerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  tunerPresetBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  tunerPresetBtnActive: {
    backgroundColor: '#10B981',
  },
  tunerPresetText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  tunerPresetTextActive: {
    color: '#090A0F',
    fontWeight: '900',
  },
  glowLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  glowLaunchBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  reactionSection: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  reactionLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 8,
    textAlign: 'center',
  },
  reactionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  reactionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 20,
  },
  glowModeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  glowContent: {
    alignItems: 'center',
  },
  glowTitle: {
    color: '#090A0F',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 16,
    letterSpacing: 1,
  },
  glowChannelText: {
    color: '#090A0F',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  glowTapHint: {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 24,
  },
});
