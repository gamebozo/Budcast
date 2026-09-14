import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SlidersHorizontal, Volume2, Wifi, Zap, ArrowLeft, RefreshCw,
  Sparkles, Check, Headphones, ShieldCheck, Play, Radio,
  KeyRound, Crown, ChevronRight, Award
} from 'lucide-react-native';
import { FloatingNavBar } from '../components/FloatingNavBar';
import { BudcastLogo } from '../components/BudcastLogo';
import { syncEngine } from '../services/syncEngine';
import { getActivePlan } from '../services/hostStorage';
import { playSyncAlignmentBeep, playEqPreviewSound, playEarbudPresetChime } from '../services/soundEffects';

const EARBUD_PRESETS = [
  { name: 'AirPods Pro / Max', offset: 70, brand: 'Apple AAC' },
  { name: 'Galaxy Buds2 / Pro', offset: 85, brand: 'Samsung SSC' },
  { name: 'Sony WH / WF-1000XM5', offset: 95, brand: 'LDAC' },
  { name: 'Bose QuietComfort', offset: 110, brand: 'aptX' },
  { name: 'Wired 3.5mm / USB-C', offset: 0, brand: 'Direct 0ms' }
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [audioBoost, setAudioBoost] = useState(true);
  const [lowLatency, setLowLatency] = useState(true);
  const [spatialAudio, setSpatialAudio] = useState(true);
  const [selectedEq, setSelectedEq] = useState<'flat' | 'bass' | 'vocal' | 'cinema'>('cinema');
  const [earbudOffset, setEarbudOffset] = useState(70);
  const [diag, setDiag] = useState(syncEngine.getDiagnostics());
  const [calibrating, setCalibrating] = useState(false);
  const [isPlayingTestTone, setIsPlayingTestTone] = useState(false);

  const handleSelectPreset = (offset: number) => {
    setEarbudOffset(offset);
    playEarbudPresetChime(offset);
  };

  const handleSelectEq = (eq: 'flat' | 'bass' | 'vocal' | 'cinema') => {
    setSelectedEq(eq);
    playEqPreviewSound(eq);
  };

  const handleRecalibrate = () => {
    setCalibrating(true);
    syncEngine.startSync();
    setTimeout(() => {
      setDiag(syncEngine.getDiagnostics());
      setCalibrating(false);
    }, 1200);
  };

  const playTestBeep = async () => {
    setIsPlayingTestTone(true);
    try {
      await playSyncAlignmentBeep();
    } catch (e) {
      console.log('Beep error:', e);
    }
    setTimeout(() => setIsPlayingTestTone(false), 350);
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top + 6, 16),
            paddingBottom: Math.max(insets.bottom + 65, 80)
          }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >{/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/' as any)}>
            <ArrowLeft size={18} color="#94A3B8" />
            <Text style={styles.backText}>Home</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BudcastLogo size={26} />
            <View style={styles.headerPill}>
              <SlidersHorizontal size={14} color="#38BDF8" />
              <Text style={styles.headerPillText}>Earbud Calibration & FX</Text>
            </View>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.title}>Audio & Earbud Tuner</Text>
          <Text style={styles.subtitle}>
            Calibrate Bluetooth delay for your wireless earbuds (AirPods, Galaxy Buds) so movie audio and silent disco sets match with 0.00ms phase lock.
          </Text>
        </View>

        {/* Section 1: Earbud Latency Calibration */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Headphones size={20} color="#38BDF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Bluetooth Earbud Presets</Text>
              <Text style={styles.cardSub}>Auto-compensate wireless codec latency</Text>
            </View>
            <View style={styles.msBadge}>
              <Text style={styles.msBadgeText}>+{earbudOffset} ms</Text>
            </View>
          </View>

          <View style={styles.presetsList}>
            {EARBUD_PRESETS.map((preset) => {
              const isSelected = earbudOffset === preset.offset;
              return (
                <TouchableOpacity
                  key={preset.name}
                  style={[styles.presetRow, isSelected && styles.presetRowActive]}
                  onPress={() => handleSelectPreset(preset.offset)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.presetName, isSelected && { color: '#38BDF8' }]}>
                      {preset.name}
                    </Text>
                    <Text style={styles.presetBrand}>{preset.brand} • +{preset.offset}ms delay compensation</Text>
                  </View>
                  {isSelected ? (
                    <View style={styles.checkIcon}>
                      <Check size={14} color="#090A0F" />
                    </View>
                  ) : (
                    <View style={styles.emptyCircle} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Test Sync Tone Button */}
          <TouchableOpacity
            style={styles.testToneBtn}
            onPress={playTestBeep}
            activeOpacity={0.8}
          >
            <Play size={14} color="#10B981" fill="#10B981" />
            <Text style={styles.testToneText}>
              {isPlayingTestTone ? 'Beeping...' : 'Play Sync Alignment Beep'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section 2: Audio Enhancements */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Volume2 size={20} color="#A855F7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Acoustic & EQ Profiles</Text>
              <Text style={styles.cardSub}>Optimized for movies & silent disco</Text>
            </View>
          </View>

          <View style={styles.eqGrid}>
            {[
              { id: 'cinema', label: 'Cinema Surround', desc: 'Enhanced speech & dynamic range' },
              { id: 'bass', label: 'Club Bass Boost', desc: 'Deep punch for silent party raves' },
              { id: 'vocal', label: 'Vocal Clarity', desc: 'Dialogue & MC boost' },
              { id: 'flat', label: 'Studio Flat', desc: 'Uncolored reference audio' },
            ].map((item) => {
              const isSelected = selectedEq === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.eqCard, isSelected && styles.eqCardActive]}
                  onPress={() => handleSelectEq(item.id as any)}
                >
                  <Text style={[styles.eqTitle, isSelected && { color: '#A855F7' }]}>
                    {item.label}
                  </Text>
                  <Text style={styles.eqDesc}>{item.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Spatial Audio Simulator</Text>
              <Text style={styles.toggleSub}>Widens stereo soundstage in earbuds</Text>
            </View>
            <Switch
              value={spatialAudio}
              onValueChange={setSpatialAudio}
              trackColor={{ false: '#334155', true: '#38BDF8' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* NTP Diagnostics Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Zap size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Precision Audio Sync</Text>
              <Text style={styles.cardSub}>Sub-millisecond frame synchronization</Text>
            </View>
            <TouchableOpacity style={styles.recalBtn} onPress={handleRecalibrate} disabled={calibrating}>
              <RefreshCw size={16} color="#38BDF8" />
            </TouchableOpacity>
          </View>

          <View style={styles.diagGrid}>
            <View style={styles.diagItem}>
              <Text style={styles.diagLabel}>CLOCK OFFSET</Text>
              <Text style={styles.diagValue}>{diag.clockOffset ?? 0} ms</Text>
            </View>
            <View style={styles.diagItem}>
              <Text style={styles.diagLabel}>ROUND TRIP (RTT)</Text>
              <Text style={styles.diagValue}>{diag.rtt ?? 0} ms</Text>
            </View>
            <View style={styles.diagItem}>
              <Text style={styles.diagLabel}>STATUS</Text>
              <Text style={[styles.diagValue, { color: '#10B981' }]}>LOCKED</Text>
            </View>
          </View>
        </View>

        {/* VIP Passcode Redemption Section */}
        <TouchableOpacity
          style={[styles.card, { borderColor: 'rgba(0, 242, 254, 0.3)', backgroundColor: 'rgba(0, 242, 254, 0.04)' }]}
          onPress={() => router.push('/vip' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(0, 242, 254, 0.15)' }]}>
              <KeyRound size={20} color="#00F2FE" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>VIP Pass & Founder Code</Text>
              <Text style={styles.cardSub}>Redeem waitlist passcode for Founder Gold perks</Text>
            </View>
            <ChevronRight size={18} color="#00F2FE" />
          </View>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Bottom Nav */}
      <FloatingNavBar />
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
    paddingBottom: 30,
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
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  headerPillText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  heroSection: {
    marginBottom: 18,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cardSub: {
    color: '#64748B',
    fontSize: 10,
  },
  msBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  msBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  presetsList: {
    gap: 6,
    marginBottom: 12,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  presetRowActive: {
    borderColor: 'rgba(56, 189, 248, 0.4)',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  presetName: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '700',
  },
  presetBrand: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#475569',
  },
  testToneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  testToneText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },
  eqGrid: {
    gap: 8,
    marginBottom: 12,
  },
  eqCard: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  eqCardActive: {
    borderColor: 'rgba(168, 85, 247, 0.4)',
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  eqTitle: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '700',
  },
  eqDesc: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  toggleTitle: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '700',
  },
  toggleSub: {
    color: '#64748B',
    fontSize: 10,
  },
  recalBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 10,
  },
  diagItem: {
    alignItems: 'center',
  },
  diagLabel: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '800',
  },
  diagValue: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
});
