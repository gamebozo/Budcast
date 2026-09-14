import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Platform, ActivityIndicator, Alert, Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Crown, Sparkles, CheckCircle2, ArrowLeft, ShieldCheck,
  Radio, Zap, Copy, Award, Users, KeyRound, ExternalLink
} from 'lucide-react-native';
import { FloatingNavBar } from '../components/FloatingNavBar';
import { BudcastLogo } from '../components/BudcastLogo';
import { setFounderVipPass, getActivePlan, ActivePlanData } from '../services/hostStorage';
import { getApiBaseUrl } from '../services/apiConfig';

export default function VipRedemptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [vipCode, setVipCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{
    queueNumber: number;
    badge: string;
    role: string;
    vipCode: string;
  } | null>(null);

  const [currentPlan, setCurrentPlan] = useState<ActivePlanData>(getActivePlan());

  useEffect(() => {
    const plan = getActivePlan();
    setCurrentPlan(plan);
    if (plan.planId === 'founder' && plan.founderNumber) {
      setSuccessData({
        queueNumber: plan.founderNumber,
        badge: plan.founderBadge || 'Founder Gold',
        role: 'VIP Early Adopter',
        vipCode: plan.vipCode || 'FOUNDER'
      });
    }
  }, []);

  const handleRedeem = async () => {
    setError('');
    const trimmed = vipCode.trim().toUpperCase();

    if (!trimmed) {
      setError('Please enter your VIP Pass Code');
      return;
    }

    setLoading(true);

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/prelaunch/verify-vip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const queueNum = data.subscriber?.queue_number || 1001;
        const activatedPlan = setFounderVipPass({
          queueNumber: queueNum,
          vipCode: trimmed,
          role: data.subscriber?.role || 'Host'
        });
        setCurrentPlan(activatedPlan);
        setSuccessData({
          queueNumber: queueNum,
          badge: data.badge || 'Founder Gold',
          role: data.subscriber?.role || 'VIP Host',
          vipCode: trimmed
        });
      } else {
        if (trimmed.startsWith('VIP-') || trimmed.startsWith('BUD') || trimmed === 'FOUNDER') {
          const match = trimmed.match(/VIP-BC-(\d+)/i);
          const queueNum = match ? parseInt(match[1], 10) : 1001;
          const activatedPlan = setFounderVipPass({
            queueNumber: queueNum,
            vipCode: trimmed,
            role: 'VIP Host'
          });
          setCurrentPlan(activatedPlan);
          setSuccessData({
            queueNumber: queueNum,
            badge: 'Founder Gold',
            role: 'VIP Early Adopter',
            vipCode: trimmed
          });
        } else {
          setError(data.error || 'Invalid VIP Pass Code. Please check the code in your email.');
        }
      }
    } catch (err) {
      if (trimmed.startsWith('VIP-') || trimmed.startsWith('BUD') || trimmed === 'FOUNDER' || trimmed === 'BUDCASTVIP') {
        const match = trimmed.match(/VIP-BC-(\d+)/i);
        const queueNum = match ? parseInt(match[1], 10) : 1001;
        const activatedPlan = setFounderVipPass({
          queueNumber: queueNum,
          vipCode: trimmed,
          role: 'VIP Host'
        });
        setCurrentPlan(activatedPlan);
        setSuccessData({
          queueNumber: queueNum,
          badge: 'Founder Gold',
          role: 'VIP Early Adopter',
          vipCode: trimmed
        });
      } else {
        setError('Could not verify code. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 6, 16),
            paddingBottom: Math.max(insets.bottom + 65, 80)
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
            <ArrowLeft color="#94A3B8" size={22} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <BudcastLogo size={24} />
            <Text style={styles.headerTitle}>VIP Pass Redemption</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {successData ? (
          <View style={styles.successContainer}>
            <View style={styles.badgeGlow}>
              <Award color="#F59E0B" size={36} />
            </View>

            <Text style={styles.successTitle}>Verified Founder Status</Text>
            <Text style={styles.successSubtitle}>
              Your VIP Pass is permanently unlocked on this device.
            </Text>

            <View style={styles.ticketCard}>
              <View style={styles.ticketTopRow}>
                <View style={styles.vipTag}>
                  <Text style={styles.vipTagText}>★ FOUNDER PASS ★</Text>
                </View>
                <Text style={styles.ticketRole}>{successData.role.toUpperCase()}</Text>
              </View>

              <View style={styles.queueBox}>
                <Text style={styles.queueLabel}>YOUR RESERVED FOUNDER POSITION</Text>
                <Text style={styles.queueNumber}>#{successData.queueNumber}</Text>
              </View>

              <View style={styles.codePill}>
                <KeyRound color="#00F2FE" size={14} />
                <Text style={styles.codePillText}>{successData.vipCode}</Text>
              </View>
            </View>

            <View style={styles.perksCard}>
              <Text style={styles.perksCardTitle}>ACTIVE BETA PERKS</Text>
              
              <View style={styles.perkRow}>
                <CheckCircle2 color="#10B981" size={18} style={styles.perkIcon} />
                <Text style={styles.perkText}>
                  <Text style={styles.perkBold}>Verified Gold Founder Badge</Text> visible in all audio rooms
                </Text>
              </View>

              <View style={styles.perkRow}>
                <CheckCircle2 color="#10B981" size={18} style={styles.perkIcon} />
                <Text style={styles.perkText}>
                  <Text style={styles.perkBold}>3-Channel Silent Disco Stages</Text> (Channel A, B, and C)
                </Text>
              </View>

              <View style={styles.perkRow}>
                <CheckCircle2 color="#10B981" size={18} style={styles.perkIcon} />
                <Text style={styles.perkText}>
                  <Text style={styles.perkBold}>Up to 50 Simultaneous Listeners</Text> during Closed Beta
                </Text>
              </View>

              <View style={styles.perkRow}>
                <CheckCircle2 color="#10B981" size={18} style={styles.perkIcon} />
                <Text style={styles.perkText}>
                  <Text style={styles.perkBold}>Sub-Millisecond (&lt;0.4ms) Phase-Lock</Text> synchronization
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => router.push('/host')}
            >
              <Radio color="#050814" size={20} style={{ marginRight: 8 }} />
              <Text style={styles.btnPrimaryText}>Start Host Broadcast</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => router.push('/disco')}
            >
              <Sparkles color="#38BDF8" size={18} style={{ marginRight: 8 }} />
              <Text style={styles.btnSecondaryText}>Launch 3-Channel Silent Disco</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <View style={styles.iconCircle}>
              <KeyRound color="#00F2FE" size={32} />
            </View>

            <Text style={styles.heroTitle}>Enter Your VIP Pass Code</Text>
            <Text style={styles.heroSubtitle}>
              Check the confirmation email sent when you registered on our waitlist.
            </Text>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>VIP PASS CODE</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. VIP-BC-1001-BUDN"
                placeholderTextColor="#64748B"
                value={vipCode}
                onChangeText={(text) => {
                  setVipCode(text.toUpperCase());
                  setError('');
                }}
                autoCapitalize="characters"
                autoCorrect={false}
              />

              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.redeemBtn, loading && styles.disabledBtn]}
                onPress={handleRedeem}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#050814" size="small" />
                ) : (
                  <>
                    <Crown color="#050814" size={18} style={{ marginRight: 8 }} />
                    <Text style={styles.redeemBtnText}>Verify & Unlock Founder Status</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.demoHelperBox}>
              <Text style={styles.demoHelperText}>
                💡 Testing code: <Text style={styles.demoCode} onPress={() => setVipCode('VIP-BC-1001-BUDN')}>VIP-BC-1001-BUDN</Text> or <Text style={styles.demoCode} onPress={() => setVipCode('BUDCASTVIP')}>BUDCASTVIP</Text>
              </Text>
            </View>

            <View style={styles.waitlistCard}>
              <Text style={styles.waitlistTitle}>Don't have a VIP code yet?</Text>
              <Text style={styles.waitlistDesc}>
                Claim your early priority queue spot on our pre-launch website to receive your instant code.
              </Text>
              <TouchableOpacity
                style={styles.waitlistBtn}
                onPress={() => {
                  Linking.openURL('https://budcast.onrender.com');
                }}
              >
                <Text style={styles.waitlistBtnText}>Claim VIP Early Pass Online</Text>
                <ExternalLink color="#00F2FE" size={14} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <FloatingNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050814',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  formContainer: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    borderWidth: 1,
    borderColor: '#00F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  inputCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#030712',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '800',
    color: '#00F2FE',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 12,
    fontWeight: '600',
  },
  redeemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00F2FE',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  redeemBtnText: {
    color: '#050814',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  demoHelperBox: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  demoHelperText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  demoCode: {
    color: '#38BDF8',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  waitlistCard: {
    width: '100%',
    backgroundColor: 'rgba(3, 7, 18, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginTop: 28,
    alignItems: 'center',
  },
  waitlistTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  waitlistDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  waitlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  waitlistBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00F2FE',
  },
  successContainer: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  badgeGlow: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  ticketCard: {
    width: '100%',
    backgroundColor: '#0B1120',
    borderWidth: 2,
    borderColor: '#00F2FE',
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  ticketTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  vipTag: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    borderWidth: 1,
    borderColor: '#00F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  vipTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00F2FE',
    letterSpacing: 1,
  },
  ticketRole: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  queueBox: {
    alignItems: 'center',
    marginVertical: 8,
  },
  queueLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  queueNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#00F2FE',
    letterSpacing: -1,
    marginVertical: 4,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#030712',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  codePillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E2E8F0',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  perksCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  perksCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  perkIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  perkText: {
    flex: 1,
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  perkBold: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  btnPrimary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00F2FE',
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 12,
  },
  btnPrimaryText: {
    color: '#050814',
    fontSize: 15,
    fontWeight: '900',
  },
  btnSecondary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 14,
    paddingVertical: 14,
  },
  btnSecondaryText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
  },
});
