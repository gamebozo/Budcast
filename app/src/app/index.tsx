import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Film, Radio, QrCode, ArrowRight, Sparkles, Wifi, Users,
  Play, Crown, ChevronRight, Sliders, Smartphone, Check,
  Headphones, Music, Zap, Flame, ShieldCheck, Volume2, Upload, FileVideo, FileAudio, Mic, History, Clock,
  KeyRound, Award
} from 'lucide-react-native';
import { FloatingNavBar } from '../components/FloatingNavBar';
import { ProUpgradeModal } from '../components/ProUpgradeModal';
import { QRScannerModal } from '../components/QRScannerModal';
import { BudcastLogo } from '../components/BudcastLogo';
import { getHostId, getActivePlan, isFounderUser } from '../services/hostStorage';
import { getApiBaseUrl } from '../services/apiConfig';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showProModal, setShowProModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [recentRooms, setRecentRooms] = useState<any[]>([]);
  const [totalAttendees, setTotalAttendees] = useState<number>(0);

  const [activePlan, setActivePlanState] = useState(getActivePlan());

  useEffect(() => {
    setActivePlanState(getActivePlan());
    const hostId = getHostId();
    const baseUrl = getApiBaseUrl();
    // Fetch only this host's broadcasts from backend
    fetch(`${baseUrl}/api/history/rooms?hostId=${encodeURIComponent(hostId)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRecentRooms(data.slice(0, 2));
        }
      })
      .catch(() => {});

    fetch(`${baseUrl}/api/history/listeners?hostId=${encodeURIComponent(hostId)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTotalAttendees(data.length);
        }
      })
      .catch(() => {});
  }, []);

  const handleJoin = () => {
    if (pin.trim().length !== 4) {
      setError('Please enter a valid 4-digit PIN');
      return;
    }
    setError('');
    router.push(`/room/${pin.trim()}` as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 16 : 8),
            paddingBottom: insets.bottom + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <BudcastLogo size={36} />
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.appName}>Budcast</Text>
                {activePlan.planId === 'founder' ? (
                  <View style={[styles.proTag, { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#F59E0B' }]}>
                    <Text style={[styles.proTagText, { color: '#FBBF24' }]}>FOUNDER #{activePlan.founderNumber || 1001}</Text>
                  </View>
                ) : (
                  <View style={styles.proTag}>
                    <Text style={styles.proTagText}>SYNC</Text>
                  </View>
                )}
              </View>
              <View style={styles.statusPill}>
                <View style={styles.greenPulse} />
                <Text style={styles.statusText}>Zero-Latency Earbud Mesh • 0 Data</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={[
                styles.crownBtn,
                activePlan.planId === 'founder' && { borderColor: 'rgba(245, 158, 11, 0.4)', backgroundColor: 'rgba(245, 158, 11, 0.1)' }
              ]}
              onPress={() => router.push('/vip' as any)}
              activeOpacity={0.8}
            >
              {activePlan.planId === 'founder' ? (
                <>
                  <Award size={14} color="#F59E0B" />
                  <Text style={[styles.crownBtnText, { color: '#FBBF24' }]}>VIP</Text>
                </>
              ) : (
                <>
                  <KeyRound size={13} color="#00F2FE" />
                  <Text style={[styles.crownBtnText, { color: '#00F2FE' }]}>VIP</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.crownBtn}
              onPress={() => router.push('/pro' as any)}
              activeOpacity={0.8}
            >
              <Crown size={14} color="#F59E0B" />
              <Text style={styles.crownBtnText}>Plans</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.badgeRow}>
            <View style={styles.heroBadge}>
              <Sparkles size={12} color="#38BDF8" />
              <Text style={styles.heroBadgeText}>ZERO-LATENCY EARBUD SYNC</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            Share Movies & Music{'\n'}
            <Text style={styles.heroTitleGradient}>Directly to Earbuds</Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            Connect unlimited phones and earbuds wirelessly over local Wi-Fi with 0 cellular data and sub-millisecond lip-sync.
          </Text>
        </View>

        {/* Section 1: Join a Broadcast Room */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Radio size={16} color="#38BDF8" />
              <Text style={styles.sectionTitle}>Join Live Room</Text>
            </View>
            <Text style={styles.sectionSub}>Enter host's 4-digit code</Text>
          </View>

          <View style={styles.joinCard}>
            <TextInput
              style={[
                styles.pinInputFull,
                { letterSpacing: pin.length > 0 ? 8 : 0, fontSize: pin.length > 0 ? 22 : 15 }
              ]}
              placeholder="Enter 4-Digit PIN"
              placeholderTextColor="#475569"
              keyboardType="number-pad"
              maxLength={4}
              value={pin}
              cursorColor="#38BDF8"
              selectionColor="rgba(56, 189, 248, 0.4)"
              onChangeText={(val) => {
                setPin(val);
                setError('');
              }}
            />

            <TouchableOpacity
              style={[styles.joinBtnFull, pin.length === 4 && styles.joinBtnActive]}
              onPress={handleJoin}
              activeOpacity={0.8}
            >
              <Text style={styles.joinBtnText}>Join Sync Broadcast</Text>
              <ArrowRight size={16} color="#0F172A" />
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR SCAN DIRECTLY</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.qrScanBtn}
              onPress={() => setShowQRModal(true)}
              activeOpacity={0.8}
            >
              <QrCode size={18} color="#38BDF8" />
              <Text style={styles.qrScanText}>Scan Host QR Code via Camera</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Host Broadcast Modes */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Film size={16} color="#38BDF8" />
              <Text style={styles.sectionTitle}>Start New Broadcast</Text>
            </View>
            <Text style={styles.sectionSub}>Select host mode</Text>
          </View>

          {/* Mode 1: Cinema Video Player */}
          <TouchableOpacity
            style={styles.hostCard}
            onPress={() => router.push('/host?mode=video' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.hostCardHeader}>
              <View style={styles.hostIconBox}>
                <Film size={22} color="#38BDF8" />
              </View>
              <View style={styles.modeBadge}>
                <Text style={styles.modeBadgeText}>CINEMA SYNC</Text>
              </View>
            </View>
            <Text style={styles.hostCardTitle}>Host Movie / Video Party</Text>
            <Text style={styles.hostCardDesc}>
              Select any movie or video file directly from your device. Friends connect their earbuds to watch in phase-locked lip-sync.
            </Text>
            <View style={styles.hostCardFooter}>
              <View style={styles.featurePill}>
                <Check size={12} color="#38BDF8" />
                <Text style={styles.featurePillText}>Select File from Device</Text>
              </View>
              <View style={styles.featurePill}>
                <Check size={12} color="#38BDF8" />
                <Text style={styles.featurePillText}>Sub-ms Sync</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Mode 2: Silent Disco Audio Stage */}
          <TouchableOpacity
            style={[styles.hostCard, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
            onPress={() => router.push('/disco' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.hostCardHeader}>
              <View style={[styles.hostIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Radio size={22} color="#EF4444" />
              </View>
              <View style={[styles.modeBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                <Text style={[styles.modeBadgeText, { color: '#EF4444' }]}>SILENT PARTY</Text>
              </View>
            </View>
            <Text style={styles.hostCardTitle}>Host Silent Disco / Event</Text>
            <Text style={styles.hostCardDesc}>
              Multi-channel silent party broadcasting for organizers. Broadcast up to 3 DJ channels and live microphone voice to crowd earbuds.
            </Text>
            <View style={styles.channelRowPreview}>
              <View style={styles.channelPillRed}>
                <Text style={styles.channelPillText}>Channel 1</Text>
              </View>
              <View style={styles.channelPillBlue}>
                <Text style={styles.channelPillText}>Channel 2</Text>
              </View>
              <View style={styles.channelPillGreen}>
                <Text style={styles.channelPillText}>Channel 3 & Mic</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 3: My Broadcast History on Home Page */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <History size={16} color="#38BDF8" />
              <Text style={styles.sectionTitle}>My Broadcast History</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/history' as any)} hitSlop={10}>
              <Text style={styles.viewAllLink}>View All Logs ({totalAttendees}) →</Text>
            </TouchableOpacity>
          </View>

          {recentRooms.length === 0 ? (
            <TouchableOpacity
              style={[styles.fxBanner, { borderColor: 'rgba(56, 189, 248, 0.25)' }]}
              onPress={() => router.push('/host' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.fxLeft}>
                <View style={[styles.fxIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                  <History size={20} color="#38BDF8" />
                </View>
                <View>
                  <Text style={styles.fxTitle}>My Broadcast History</Text>
                  <Text style={styles.fxSubtitle}>No sessions hosted yet. Tap to start your first broadcast</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#64748B" />
            </TouchableOpacity>
          ) : (
            <View style={styles.recentRoomsList}>
              {recentRooms.map((room) => (
                <TouchableOpacity
                  key={room.id}
                  style={styles.recentRoomCard}
                  onPress={() => router.push('/history' as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.recentRoomTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentRoomTitle} numberOfLines={1}>
                        {room.title || 'Broadcast Session'}
                      </Text>
                      <Text style={styles.recentRoomPin}>Room Code: <Text style={{ color: '#38BDF8', fontWeight: 'bold' }}>#{room.id}</Text></Text>
                    </View>
                    <View style={[styles.recentModeBadge, room.mode === 'audio' && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                      <Text style={[styles.recentModeText, room.mode === 'audio' && { color: '#EF4444' }]}>
                        {room.mode === 'video' ? 'CINEMA' : 'SILENT DISCO'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recentRoomBottom}>
                    <View style={styles.recentStatRow}>
                      <Users size={12} color="#38BDF8" />
                      <Text style={styles.recentStatText}>{room.total_listeners || 0} Connected Earbuds</Text>
                    </View>
                    <View style={styles.recentStatRow}>
                      <Clock size={11} color="#64748B" />
                      <Text style={styles.recentDateText}>
                        {new Date(room.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Section 4: Earbud Latency Quick Banner */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.fxBanner}
            onPress={() => router.push('/settings' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.fxLeft}>
              <View style={styles.fxIconBox}>
                <Sliders size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.fxTitle}>Bluetooth Earbud Latency Tuner</Text>
                <Text style={styles.fxSubtitle}>Calibrate AirPods / Galaxy Buds for 0.00ms phase lock</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Section 5: Organizer Pro Callout */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.proBanner}
            onPress={() => router.push('/pro' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.proBannerContent}>
              <View style={styles.proBannerLeft}>
                <View style={styles.proBadge}>
                  <Crown size={12} color="#F59E0B" />
                  <Text style={styles.proBadgeText}>ORGANIZER PLANS</Text>
                </View>
                <Text style={styles.proBannerTitle}>Host Silent Discos for 150+ Guests</Text>
                <Text style={styles.proBannerDesc}>
                  3 live DJ channels, microphone voice broadcasts & zero-latency sync.
                </Text>
              </View>
              <View style={styles.proBannerRight}>
                <View style={styles.upgradeBtn}>
                  <Text style={styles.upgradeBtnText}>View Plans</Text>
                  <ArrowRight size={14} color="#0F172A" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Persistent Floating Bottom Bar */}
      <FloatingNavBar />

      {/* Pro Modal */}
      <ProUpgradeModal
        visible={showProModal}
        onClose={() => setShowProModal(false)}
      />

      {/* Live QR Camera Scanner Modal */}
      <QRScannerModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        onScannedPin={(scannedPin) => {
          setPin(scannedPin);
          router.push(`/room/${scannedPin}` as any);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050814',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  appName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  proTag: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proTagText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '900',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  crownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  crownBtnText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  heroSection: {
    marginBottom: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  heroBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroTitleGradient: {
    color: '#38BDF8',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: 0.2,
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  viewAllLink: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  joinCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  pinInputFull: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 10,
  },
  joinBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 13,
    borderRadius: 12,
    width: '100%',
  },
  joinBtnActive: {
    backgroundColor: '#38BDF8',
  },
  joinBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 10,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E293B',
  },
  dividerText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qrScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  qrScanText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  hostCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  hostCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  hostIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  modeBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hostCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  hostCardDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 12,
  },
  hostCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featurePillText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  channelRowPreview: {
    flexDirection: 'row',
    gap: 6,
  },
  channelPillRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  channelPillBlue: {
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  channelPillGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  channelPillText: {
    color: '#F1F5F9',
    fontSize: 10,
    fontWeight: '700',
  },
  recentRoomsList: {
    gap: 8,
  },
  recentRoomCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  recentRoomTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recentRoomTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  recentRoomPin: {
    color: '#94A3B8',
    fontSize: 11,
  },
  recentModeBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  recentModeText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
  },
  recentRoomBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  recentStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  recentStatText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  recentDateText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  fxBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  fxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fxIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fxTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  fxSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  proBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  proBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proBannerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  proBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
  },
  proBannerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  proBannerDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  proBannerRight: {},
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  upgradeBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
});
