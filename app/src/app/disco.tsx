import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Radio, Headphones, Play, Sparkles, Volume2, Users, ArrowLeft,
  Zap, ChevronRight, Check, Mic, ShieldCheck, Flame, Crown
} from 'lucide-react-native';
import { FloatingNavBar } from '../components/FloatingNavBar';
import { ProUpgradeModal } from '../components/ProUpgradeModal';
import { BudcastLogo } from '../components/BudcastLogo';

export default function SilentDiscoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedChannel, setSelectedChannel] = useState<'red' | 'blue' | 'green'>('red');
  const [showProModal, setShowProModal] = useState(false);

  const channels = [
    {
      id: 'red',
      name: 'Channel 1: Mainstage EDM & Dance',
      bpm: '128 BPM',
      vibe: 'Festival Anthems, Pop & High-Energy Hits',
      color: '#EF4444',
      badge: 'RED CHANNEL',
    },
    {
      id: 'blue',
      name: 'Channel 2: Cyber Club & Hip-Hop',
      bpm: '132 BPM',
      vibe: 'Deep House, Techno & Heavy Basslines',
      color: '#38BDF8',
      badge: 'BLUE CHANNEL',
    },
    {
      id: 'green',
      name: 'Channel 3: Chillout Lofi & Live MC',
      bpm: '90 BPM',
      vibe: 'Late Night R&B, Ambient & Live Announcements',
      color: '#10B981',
      badge: 'GREEN CHANNEL',
    },
  ];

  const handleLaunchDisco = () => {
    router.push(`/host?mode=audio&channel=${selectedChannel}&setup=true` as any);
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top + 6, 16),
            paddingBottom: Math.max(insets.bottom + 85, 100)
          }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/' as any)}>
            <ArrowLeft size={16} color="#94A3B8" />
            <Text style={styles.backText}>Home</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BudcastLogo size={26} />
            <View style={styles.liveStageBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.liveStageText}>Silent Event Hub</Text>
            </View>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroBox}>
          <View style={styles.heroTagRow}>
            <View style={styles.heroTag}>
              <Headphones size={12} color="#EF4444" />
              <Text style={styles.heroTagText}>SILENT EVENT & PARTY ORGANIZERS</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Multi-Channel Silent Disco & Events</Text>
          <Text style={styles.heroDesc}>
            Organize silent raves, outdoor festivals, rooftop movie nights, and private parties with zero noise complaints. Broadcast up to 3 synchronized DJ streams directly into attendees' wireless earbuds.
          </Text>
        </View>

        {/* Section: DJ Channels Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SELECT INITIAL DJ BROADCAST CHANNEL</Text>
          <View style={styles.insetCard}>
            {channels.map((ch, index) => {
              const isSelected = selectedChannel === ch.id;
              return (
                <React.Fragment key={ch.id}>
                  <TouchableOpacity
                    style={[styles.channelRow, isSelected && styles.channelRowActive]}
                    onPress={() => setSelectedChannel(ch.id as any)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.channelTitle, { color: ch.color }]}>{ch.name}</Text>
                      </View>
                      <Text style={styles.channelVibe}>
                        {ch.vibe} • <Text style={{ fontWeight: 'bold' }}>{ch.bpm}</Text>
                      </Text>
                    </View>
                    {isSelected ? (
                      <View style={[styles.checkCircle, { backgroundColor: ch.color }]}>
                        <Check size={12} color="#090A0F" />
                      </View>
                    ) : (
                      <View style={styles.emptyCircle} />
                    )}
                  </TouchableOpacity>
                  {index < channels.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Launch Button */}
        <TouchableOpacity
          style={styles.launchBtn}
          onPress={handleLaunchDisco}
          activeOpacity={0.85}
        >
          <Play size={18} color="#090A0F" fill="#090A0F" />
          <Text style={styles.launchBtnText}>Launch Silent Event Stage</Text>
        </TouchableOpacity>

        {/* Section: Organizer Benefits & Feature Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>WHY ORGANIZERS CHOOSE BUDCAST</Text>
          <View style={styles.benefitsCard}>
            <View style={styles.benefitRow}>
              <View style={styles.benefitIconBox}>
                <Volume2 size={18} color="#38BDF8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>Zero Noise Ordinances</Text>
                <Text style={styles.benefitDesc}>
                  Host late-night parties anywhere: rooftops, beaches, dorms, and parks without sound permit restrictions.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.benefitRow}>
              <View style={styles.benefitIconBox}>
                <Users size={18} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>No Expensive Hardware Rental</Text>
                <Text style={styles.benefitDesc}>
                  Guests use their own phones and wireless earbuds (AirPods, Galaxy Buds). No need to rent, charge, or sanitize 100+ hardware headsets.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.benefitRow}>
              <View style={styles.benefitIconBox}>
                <Sparkles size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>Synchronized Glow Screens</Text>
                <Text style={styles.benefitDesc}>
                  Attendee screens illuminate in the active channel color (🔴/🔵/🟢) pulsating to the beat like glowing silent disco headsets.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.benefitRow}>
              <View style={styles.benefitIconBox}>
                <Mic size={18} color="#A855F7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>Live DJ / MC Voice Overlay</Text>
                <Text style={styles.benefitDesc}>
                  Make crowd announcements or hypeman shoutouts across all channels with one tap.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Bottom Nav */}
      <FloatingNavBar />

      {/* Pro Modal */}
      <ProUpgradeModal visible={showProModal} onClose={() => setShowProModal(false)} />
    </View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  liveStageBadge: {
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveStageText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroBox: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginBottom: 20,
  },
  heroTagRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroTagText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  insetCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  channelRowActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  channelTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  channelVibe: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#475569',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 24,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  launchBtnText: {
    color: '#090A0F',
    fontSize: 14,
    fontWeight: '900',
  },
  benefitsCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  benefitIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  benefitTitle: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  benefitDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
});
