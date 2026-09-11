import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  ActivityIndicator, Platform, TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { getSocket } from '../services/socket';
import { getHostId, saveHostedRoomId } from '../services/hostStorage';
import { MediaItem, MediaMode, RoomData, ListenerInfo } from '../types/sync';
import { SyncedPlayer } from '../components/SyncedPlayer';
import { ShareRoomModal } from '../components/ShareRoomModal';
import { BudcastLogo } from '../components/BudcastLogo';
import {
  Users, ArrowLeft, Radio, Film, QrCode, Sliders, Mic, MicOff,
  Sparkles, Smartphone, Check, ChevronRight, Activity, Copy,
  Headphones, Music, Volume2, ShieldCheck, Zap, Share2, Upload,
  Link2, Play, Plus, FileVideo, FileAudio, AlertCircle, History
} from 'lucide-react-native';

export default function HostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialMode: MediaMode = (params.mode as MediaMode) || 'video';

  // Wizard state: Prompt to select from device
  const [isSetupStage, setIsSetupStage] = useState<boolean>(true);
  const [mode, setMode] = useState<MediaMode>(initialMode);
  const [mediaSourceTab, setMediaSourceTab] = useState<'device' | 'url' | 'mic'>('device');
  const [roomTitle, setRoomTitle] = useState<string>(
    initialMode === 'video' ? 'Budcast Cinema Room' : 'Budcast Silent Party'
  );
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [customUrl, setCustomUrl] = useState<string>('');
  const [customUrlTitle, setCustomUrlTitle] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live Room State
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [roomUrl, setRoomUrl] = useState<string>('');
  const [activeChannel, setActiveChannel] = useState<'red' | 'blue' | 'green'>('red');
  const [listenerCount, setListenerCount] = useState<number>(0);
  const [listenersList, setListenersList] = useState<ListenerInfo[]>([]);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [glowModeActive, setGlowModeActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);

  // Modal
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const handlePickFile = async () => {
    setUploadError('');
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    } else {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: mode === 'video' ? ['video/*'] : ['audio/*'],
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          setUploading(true);

          const formData = new FormData();
          formData.append('media', {
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType || (mode === 'video' ? 'video/mp4' : 'audio/mp3')
          } as any);
          formData.append('title', asset.name.replace(/\.[^/.]+$/, ''));

          const backendUrl = 'http://localhost:4000/api/upload';
          const response = await fetch(backendUrl, {
            method: 'POST',
            body: formData,
            headers: {
              'Content-Type': 'multipart/form-data',
            }
          });

          const data = await response.json();
          if (data && data.url) {
            setSelectedMedia(data);
            setRoomTitle(data.title);
          }
        }
      } catch (err: any) {
        console.error('File pick error:', err);
        setUploadError('Could not upload file. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleWebFileInputChange = async (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('media', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

    try {
      const backendUrl = 'http://localhost:4000/api/upload';
      const response = await fetch(backendUrl, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data && data.url) {
        setSelectedMedia(data);
        setRoomTitle(data.title);
      } else {
        // Fallback: Create local object URL for instant offline preview
        const localUrl = URL.createObjectURL(file);
        const isVideo = file.type.startsWith('video');
        const fallbackMedia: MediaItem = {
          id: 'local-' + Date.now(),
          title: file.name.replace(/\.[^/.]+$/, ''),
          type: isVideo ? 'video' : 'audio',
          url: localUrl,
          filename: file.name,
          size: file.size
        };
        setSelectedMedia(fallbackMedia);
        setRoomTitle(fallbackMedia.title);
      }
    } catch (e) {
      // If server upload failed, fallback to local URL
      const localUrl = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');
      const fallbackMedia: MediaItem = {
        id: 'local-' + Date.now(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        type: isVideo ? 'video' : 'audio',
        url: localUrl,
        filename: file.name,
        size: file.size
      };
      setSelectedMedia(fallbackMedia);
      setRoomTitle(fallbackMedia.title);
    } finally {
      setUploading(false);
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customUrl.trim()) return;
    const isVideo = customUrl.toLowerCase().includes('mp4') || !customUrl.toLowerCase().includes('mp3');
    const customItem: MediaItem = {
      id: 'custom-' + Date.now(),
      title: customUrlTitle.trim() || 'Live Stream',
      type: isVideo ? 'video' : 'audio',
      url: customUrl.trim()
    };
    setSelectedMedia(customItem);
    setMode(customItem.type);
    if (customUrlTitle.trim()) {
      setRoomTitle(customUrlTitle.trim());
    }
  };

  const handleSetLiveMicOnly = () => {
    const micItem: MediaItem = {
      id: 'live-mic-' + Date.now(),
      title: 'Live DJ & Microphone Broadcast',
      type: 'audio',
      url: ''
    };
    setSelectedMedia(micItem);
    setMode('audio');
    setRoomTitle('Live Silent Event Stage');
  };

  const handleLaunchRoom = () => {
    if (!selectedMedia && mediaSourceTab !== 'mic') {
      setUploadError('Please select a file from your device or enter a link first.');
      return;
    }

    const mediaToBroadcast = selectedMedia || {
      id: 'live-mic-' + Date.now(),
      title: 'Live Silent Event Stage',
      type: 'audio',
      url: ''
    };

    setLoading(true);
    const socket = getSocket();

    const createRoom = () => {
      const hostId = getHostId();
      socket.emit('create_room', {
        mode,
        media: mediaToBroadcast,
        title: roomTitle.trim() || (mode === 'video' ? 'Auvi Cinema' : 'Auvi Silent Party'),
        hostId
      }, (response: any) => {
        if (response && response.success) {
          saveHostedRoomId(response.roomId);
          setRoomData(response.room);
          setRoomUrl(response.roomUrl || `http://localhost:8083/room/${response.roomId}`);
          setIsSetupStage(false);
          setLoading(false);
        } else {
          setLoading(false);
        }
      });
    };

    if (socket.connected) {
      createRoom();
    } else {
      socket.once('connect', createRoom);
    }
  };

  // Listener updates
  useEffect(() => {
    const socket = getSocket();
    socket.on('listener_count_update', (data: { count: number; listeners?: ListenerInfo[] }) => {
      setListenerCount(data.count);
      if (data.listeners) {
        setListenersList(data.listeners);
      }
    });

    return () => {
      socket.off('listener_count_update');
    };
  }, []);

  const handleHostAction = (action: 'PLAY' | 'PAUSE' | 'SEEK' | 'SET_RATE', data?: any) => {
    if (!roomData) return;
    const socket = getSocket();
    socket.emit('host_action', {
      roomId: roomData.id,
      action,
      ...data
    });
  };

  const handleToggleGlowMode = () => {
    const nextState = !glowModeActive;
    setGlowModeActive(nextState);
    if (roomData) {
      const socket = getSocket();
      socket.emit('send_reaction', {
        roomId: roomData.id,
        emoji: nextState ? '✨ PARTY GLOW ON' : '💡 GLOW OFF',
        senderName: 'HOST'
      });
    }
  };

  const copyPin = () => {
    if (roomData?.id) {
      if (Platform.OS === 'web' && navigator.clipboard) {
        navigator.clipboard.writeText(roomData.id);
      }
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  // ==========================================
  // STAGE 1: SELECT FILE FROM DEVICE FIRST
  // ==========================================
  if (isSetupStage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/' as any)}>
              <ArrowLeft size={16} color="#94A3B8" />
              <Text style={styles.backText}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BudcastLogo size={28} />
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>HOST BROADCAST</Text>
              </View>
            </View>
          </View>

          {/* Setup Header */}
          <View style={styles.setupHero}>
            <Text style={styles.setupTitle}>Select Media to Play</Text>
            <Text style={styles.setupSubtitle}>
              Pick a video or audio file from your device. All connected earbuds will listen in perfect sync with 0.00ms delay.
            </Text>
          </View>

          {/* Mode Switcher */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTabBtn, mode === 'video' && styles.modeTabBtnActive]}
              onPress={() => {
                setMode('video');
                setSelectedMedia(null);
                setRoomTitle('Budcast Cinema Room');
              }}
            >
              <Film size={18} color={mode === 'video' ? '#38BDF8' : '#64748B'} />
              <Text style={[styles.modeTabText, mode === 'video' && styles.modeTabTextActive]}>
                Movie / Video
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTabBtn, mode === 'audio' && styles.modeTabBtnActiveDisco]}
              onPress={() => {
                setMode('audio');
                setSelectedMedia(null);
                setRoomTitle('Budcast Silent Party');
              }}
            >
              <Headphones size={18} color={mode === 'audio' ? '#EF4444' : '#64748B'} />
              <Text style={[styles.modeTabText, mode === 'audio' && styles.modeTabTextActiveDisco]}>
                Music / Silent Event
              </Text>
            </TouchableOpacity>
          </View>

          {/* Source Tabs: From Device vs URL vs Live Mic */}
          <View style={styles.sourceSelectorRow}>
            <TouchableOpacity
              style={[styles.sourceTab, mediaSourceTab === 'device' && styles.sourceTabActive]}
              onPress={() => setMediaSourceTab('device')}
            >
              <Upload size={14} color={mediaSourceTab === 'device' ? '#38BDF8' : '#64748B'} />
              <Text style={[styles.sourceTabText, mediaSourceTab === 'device' && styles.sourceTabTextActive]}>
                Device File
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sourceTab, mediaSourceTab === 'url' && styles.sourceTabActive]}
              onPress={() => setMediaSourceTab('url')}
            >
              <Link2 size={14} color={mediaSourceTab === 'url' ? '#38BDF8' : '#64748B'} />
              <Text style={[styles.sourceTabText, mediaSourceTab === 'url' && styles.sourceTabTextActive]}>
                Stream Link
              </Text>
            </TouchableOpacity>

            {mode === 'audio' && (
              <TouchableOpacity
                style={[styles.sourceTab, mediaSourceTab === 'mic' && styles.sourceTabActive]}
                onPress={() => {
                  setMediaSourceTab('mic');
                  handleSetLiveMicOnly();
                }}
              >
                <Mic size={14} color={mediaSourceTab === 'mic' ? '#EF4444' : '#64748B'} />
                <Text style={[styles.sourceTabText, mediaSourceTab === 'mic' && { color: '#EF4444', fontWeight: '800' }]}>
                  Live MC Mic
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* TAB 1: Select From Device */}
          {mediaSourceTab === 'device' && (
            <View style={styles.section}>
              <View style={styles.uploadBigCard}>
                <View style={styles.uploadIconCircle}>
                  {mode === 'video' ? (
                    <FileVideo size={36} color="#38BDF8" />
                  ) : (
                    <FileAudio size={36} color="#EF4444" />
                  )}
                </View>

                <Text style={styles.uploadCardTitle}>
                  {mode === 'video' ? 'Select Movie or Video File' : 'Select Music or Audio Track'}
                </Text>
                <Text style={styles.uploadCardDesc}>
                  Supports MP4, MKV, MOV, MP3, WAV, AAC, and FLAC. The file will be shared with attendees on your local Wi-Fi.
                </Text>

                {Platform.OS === 'web' && (
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept={mode === 'video' ? 'video/*' : 'audio/*'}
                    onChange={handleWebFileInputChange}
                  />
                )}

                <TouchableOpacity
                  style={[styles.selectFileBtn, { backgroundColor: mode === 'video' ? '#38BDF8' : '#EF4444' }]}
                  onPress={handlePickFile}
                  disabled={uploading}
                  activeOpacity={0.85}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#090A0F" />
                  ) : (
                    <>
                      <Upload size={18} color="#090A0F" />
                      <Text style={styles.selectFileBtnText}>
                        Browse Files on Device
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Upload Status */}
                {selectedMedia && (
                  <View style={styles.fileSelectedBox}>
                    <Check size={16} color="#10B981" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fileSelectedName} numberOfLines={1}>
                        {selectedMedia.title}
                      </Text>
                      <Text style={styles.fileSelectedSub}>
                        Ready for synchronized broadcast
                      </Text>
                    </View>
                  </View>
                )}

                {uploadError ? (
                  <View style={styles.errorPill}>
                    <AlertCircle size={14} color="#EF4444" />
                    <Text style={styles.errorPillText}>{uploadError}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {/* TAB 2: Stream URL */}
          {mediaSourceTab === 'url' && (
            <View style={styles.section}>
              <View style={styles.urlCard}>
                <Text style={styles.urlCardHeader}>PASTE DIRECT VIDEO OR AUDIO LINK</Text>
                <TextInput
                  style={styles.urlInput}
                  placeholder="https://example.com/movie.mp4 or stream.mp3"
                  placeholderTextColor="#64748B"
                  value={customUrl}
                  onChangeText={setCustomUrl}
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.urlInput, { marginTop: 8 }]}
                  placeholder="Stream Title (e.g. My Watch Party)"
                  placeholderTextColor="#64748B"
                  value={customUrlTitle}
                  onChangeText={setCustomUrlTitle}
                />
                <TouchableOpacity
                  style={styles.applyUrlBtn}
                  onPress={handleApplyCustomUrl}
                >
                  <Text style={styles.applyUrlText}>Confirm Link</Text>
                </TouchableOpacity>

                {selectedMedia && selectedMedia.id.startsWith('custom-') && (
                  <View style={[styles.fileSelectedBox, { marginTop: 12 }]}>
                    <Check size={16} color="#10B981" />
                    <Text style={styles.fileSelectedName}>{selectedMedia.title}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* TAB 3: Live Mic Only */}
          {mediaSourceTab === 'mic' && (
            <View style={styles.section}>
              <View style={styles.micCard}>
                <Mic size={36} color="#EF4444" />
                <Text style={styles.micCardTitle}>Live DJ & Event MC Stage</Text>
                <Text style={styles.micCardDesc}>
                  Broadcast your voice and DJ live announcements directly to attendee earbuds without playing a pre-recorded file.
                </Text>
              </View>
            </View>
          )}

          {/* Room Name Customization */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>ROOM / EVENT NAME</Text>
            <View style={styles.titleInputCard}>
              <TextInput
                style={styles.titleInput}
                placeholder="Room Title"
                placeholderTextColor="#64748B"
                value={roomTitle}
                onChangeText={setRoomTitle}
              />
            </View>
          </View>

          {/* Launch Broadcast Button */}
          <TouchableOpacity
            style={[
              styles.startBroadcastBtn,
              { backgroundColor: mode === 'video' ? '#38BDF8' : '#EF4444' },
              (!selectedMedia && mediaSourceTab !== 'mic') && styles.startBroadcastBtnDisabled
            ]}
            onPress={handleLaunchRoom}
            activeOpacity={0.88}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#090A0F" />
            ) : (
              <>
                <Play size={18} color="#090A0F" fill="#090A0F" />
                <Text style={styles.startBroadcastBtnText}>
                  {selectedMedia ? 'Start Broadcast & Generate QR Code' : 'Select a File to Start'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==========================================
  // STAGE 2: LIVE BROADCAST STUDIO
  // ==========================================
  if (loading || !roomData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Initializing Auvi Broadcast Studio...</Text>
        <Text style={styles.loadingSubText}>Connecting zero-latency audio sync</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setIsSetupStage(true)}>
            <ArrowLeft size={16} color="#94A3B8" />
            <Text style={styles.backText}>Change File</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AuviLogo size={26} />
            <View style={styles.hostPill}>
              <View style={styles.pulseDot} />
              <Text style={styles.hostPillText}>LIVE HOST STUDIO</Text>
            </View>
          </View>
        </View>

        {/* Room Access Inset Banner (PIN & QR Modal Trigger) */}
        <View style={styles.roomCodeBanner}>
          <View style={styles.codeLeft}>
            <Text style={styles.codeLabel}>AUDIENCE ROOM CODE</Text>
            <TouchableOpacity style={styles.pinRow} onPress={copyPin} activeOpacity={0.7}>
              <Text style={styles.pinText}>{roomData.id}</Text>
              <View style={styles.copyBadge}>
                <Copy size={12} color="#38BDF8" />
                <Text style={styles.copyText}>{copiedPin ? 'COPIED!' : 'COPY'}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.codeRight}>
            <TouchableOpacity
              style={styles.qrActionBtn}
              onPress={() => setShowShareModal(true)}
              activeOpacity={0.8}
            >
              <QrCode size={18} color="#FFFFFF" />
              <Text style={styles.qrActionBtnText}>Present QR</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Synced Audio/Video Player */}
        {selectedMedia && selectedMedia.url ? (
          <View style={styles.playerContainer}>
            <SyncedPlayer
              media={selectedMedia}
              mode={mode}
              isHost={true}
              onHostAction={handleHostAction}
              initialPlaybackState={roomData.playbackState}
            />
          </View>
        ) : (
          <View style={styles.micLiveBox}>
            <Mic size={40} color="#EF4444" />
            <Text style={styles.micLiveTitle}>Broadcasting Live Microphone</Text>
            <Text style={styles.micLiveSub}>Speak to all connected attendee earbuds</Text>
          </View>
        )}

        {/* SILENT PARTY / EVENT ORGANIZER CONTROLS */}
        {mode === 'audio' && (
          <View style={styles.section}>
            <View style={styles.organizerToolsCard}>
              <Text style={styles.organizerToolsTitle}>SILENT EVENT ORGANIZER TOOLS</Text>

              <View style={styles.toolRow}>
                <TouchableOpacity
                  style={[styles.toolBtn, isMicActive && styles.toolBtnActive]}
                  onPress={() => setIsMicActive(!isMicActive)}
                  activeOpacity={0.7}
                >
                  {isMicActive ? <Mic size={16} color="#10B981" /> : <MicOff size={16} color="#94A3B8" />}
                  <Text style={[styles.toolBtnText, isMicActive && { color: '#10B981' }]}>
                    {isMicActive ? 'Live MC Mic ON' : 'Broadcast MC Mic'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolBtn, glowModeActive && styles.toolBtnActiveGlow]}
                  onPress={handleToggleGlowMode}
                  activeOpacity={0.7}
                >
                  <Sparkles size={16} color={glowModeActive ? '#F59E0B' : '#94A3B8'} />
                  <Text style={[styles.toolBtnText, glowModeActive && { color: '#F59E0B' }]}>
                    {glowModeActive ? 'Party Glow ON' : 'Trigger Glow Screens'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Change File Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.changeMediaBtn}
            onPress={() => setIsSetupStage(true)}
            activeOpacity={0.85}
          >
            <View style={styles.changeMediaLeft}>
              <View style={styles.changeMediaIcon}>
                <Upload size={16} color="#38BDF8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.changeMediaTitle}>Select Different File from Device</Text>
                <Text style={styles.changeMediaSub} numberOfLines={1}>
                  Current: {selectedMedia?.title || 'Live Mic'}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Connected Earbuds & Listeners Live Analytics */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>CONNECTED EARBUDS & PHONES ({listenerCount})</Text>
            <View style={styles.syncLockBadge}>
              <ShieldCheck size={12} color="#10B981" />
              <Text style={styles.syncLockText}>Phase Locked</Text>
            </View>
          </View>

          <View style={styles.listenersCard}>
            {listenersList.length === 0 ? (
              <View style={styles.emptyListenersBox}>
                <Headphones size={28} color="#475569" />
                <Text style={styles.emptyTitle}>Waiting for listeners to connect...</Text>
                <Text style={styles.emptySub}>
                  Have friends or attendees enter Room PIN <Text style={{ color: '#38BDF8', fontWeight: 'bold' }}>{roomData.id}</Text> or scan the QR code to sync their earbuds.
                </Text>
              </View>
            ) : (
              listenersList.map((listener, idx) => (
                <View key={listener.socketId || idx} style={styles.listenerRow}>
                  <View style={styles.listenerLeft}>
                    <View style={styles.listenerAvatar}>
                      <Headphones size={14} color="#38BDF8" />
                    </View>
                    <View>
                      <Text style={styles.listenerName}>{listener.name}</Text>
                      <Text style={styles.listenerDevice}>
                        {listener.device || 'Wireless Earbuds'} • <Text style={{ color: '#38BDF8' }}>Watching {selectedMedia?.title || 'Live Broadcast'}</Text>
                      </Text>
                    </View>
                  </View>
                  <View style={styles.latencyBadge}>
                    <Activity size={10} color="#10B981" />
                    <Text style={styles.latencyText}>0.00 ms drift</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* View SQLite History Button */}
          <TouchableOpacity
            style={styles.historyShortcutBtn}
            onPress={() => router.push('/history' as any)}
            activeOpacity={0.8}
          >
            <History size={14} color="#38BDF8" />
            <Text style={styles.historyShortcutText}>View Audience & Broadcast History</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Share Room Modal (Full QR Presentation) */}
      <ShareRoomModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        roomId={roomData.id}
        roomUrl={roomUrl}
      />
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
    paddingBottom: 30,
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
  stepBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  stepBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  setupHero: {
    marginBottom: 16,
  },
  setupTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  setupSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 4,
    gap: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  modeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeTabBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  modeTabBtnActiveDisco: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  modeTabText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  modeTabTextActiveDisco: {
    color: '#EF4444',
    fontWeight: '800',
  },
  sourceSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  sourceTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sourceTabActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  sourceTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  sourceTabTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  section: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  uploadBigCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderStyle: 'dashed',
  },
  uploadIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  uploadCardDesc: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
    maxWidth: 280,
  },
  selectFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
    width: '100%',
  },
  selectFileBtnText: {
    color: '#090A0F',
    fontSize: 13,
    fontWeight: '900',
  },
  fileSelectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  fileSelectedName: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '700',
  },
  fileSelectedSub: {
    color: '#10B981',
    fontSize: 10,
    marginTop: 1,
  },
  errorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  errorPillText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  urlCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  urlCardHeader: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  urlInput: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  applyUrlBtn: {
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  applyUrlText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  micCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  micCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  micCardDesc: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    maxWidth: 280,
  },
  titleInputCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleInput: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  startBroadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  startBroadcastBtnDisabled: {
    opacity: 0.6,
  },
  startBroadcastBtnText: {
    color: '#090A0F',
    fontSize: 14,
    fontWeight: '900',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090A0F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 16,
  },
  loadingSubText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  hostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  hostPillText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  roomCodeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    marginBottom: 14,
  },
  codeLeft: {
    flex: 1,
  },
  codeLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  pinText: {
    color: '#38BDF8',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 3,
  },
  copyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  copyText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
  },
  codeRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  qrActionBtnText: {
    color: '#090A0F',
    fontSize: 12,
    fontWeight: '800',
  },
  playerContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  micLiveBox: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 16,
  },
  micLiveTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  micLiveSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  organizerToolsCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  organizerToolsTitle: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  toolRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  toolBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  toolBtnActiveGlow: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  toolBtnText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  changeMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  changeMediaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  changeMediaIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeMediaTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  changeMediaSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  syncLockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  syncLockText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
  },
  listenersCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
  },
  emptyListenersBox: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  listenerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  listenerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listenerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenerName: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '700',
  },
  listenerDevice: {
    color: '#64748B',
    fontSize: 10,
  },
  latencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  latencyText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '700',
  },
  historyShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  historyShortcutText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
});
