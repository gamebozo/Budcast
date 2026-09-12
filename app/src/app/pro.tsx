import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Platform, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Crown, Check, Zap, Sparkles, ShieldCheck, ArrowLeft,
  Headphones, Volume2, Users, Building2, Radio, CheckCircle2,
  ChevronRight, X, AlertCircle, Mic, Layers, Download, Sliders, CreditCard
} from 'lucide-react-native';
import { FloatingNavBar } from '../components/FloatingNavBar';
import { BudcastLogo } from '../components/BudcastLogo';
import { startRazorpayCheckout } from '../services/razorpay';
import { getActivePlan, setActivePlan, ActivePlanData } from '../services/hostStorage';

export default function ProScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [currentPlan, setCurrentPlan] = useState<ActivePlanData>(getActivePlan());
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string>('');

  useEffect(() => {
    setCurrentPlan(getActivePlan());
    // Preload checkout script for instant modal opening
    if (Platform.OS === 'web') {
      import('../services/razorpay').then((mod) => mod.loadRazorpayScript());
    }
  }, []);

  const handlePlanAction = (planId: string, planName: string) => {
    setPaymentError('');
    if (planId === currentPlan.planId) {
      return;
    }

    if (planId === 'free') {
      // Downgrade to Free tier
      setActivePlan({
        planId: 'free',
        planName: 'Starter Cinema',
        billingCycle: 'monthly'
      });
      setCurrentPlan(getActivePlan());
      setPaymentSuccess('Reverted to Starter Cinema plan.');
      return;
    }

    // Directly start Razorpay checkout - No intermediate popup modal
    setLoading(true);
    setLoadingPlanId(planId);
    setPaymentError('');

    startRazorpayCheckout({
      planId: planId as 'pro' | 'business',
      planName,
      billingCycle,
      onSuccess: (data) => {
        setLoading(false);
        setLoadingPlanId(null);
        const updated = getActivePlan();
        setCurrentPlan(updated);
        setPaymentSuccess(`🎉 Successfully activated ${planName}!`);
      },
      onError: (err) => {
        setLoading(false);
        setLoadingPlanId(null);
        setPaymentError(err || 'Payment was not completed.');
      },
      onDismiss: () => {
        setLoading(false);
        setLoadingPlanId(null);
      }
    });
  };

  const plans = [
    {
      id: 'free',
      name: 'Starter Cinema',
      tagline: 'For friends & living room movie nights',
      monthlyPrice: '$0',
      yearlyPrice: '$0',
      period: 'forever',
      badge: 'FREE FOREVER',
      badgeColor: '#64748B',
      accentColor: '#94A3B8',
      headlineBenefit: 'Perfect for small groups & home watch parties',
      benefits: [
        { title: '8 Connected Earbuds', desc: 'Sync up to 8 friends wirelessly at once' },
        { title: 'Zero Internet Data', desc: 'Streams directly over your local Wi-Fi without consuming cellular data' },
        { title: 'Sub-Millisecond Sync', desc: 'Accurate audio phase-lock for cinema movies' },
        { title: 'Instant QR / PIN Join', desc: 'Attendees connect in seconds via 4-digit code' },
      ],
      ctaText: 'Current Plan',
      isCurrent: currentPlan.planId === 'free',
      popular: false,
    },
    {
      id: 'pro',
      name: 'Organizer Pro',
      tagline: 'For silent discos, club raves & rooftop events',
      monthlyPrice: '₹799',
      yearlyPrice: '₹7,999',
      period: billingCycle === 'monthly' ? 'per month ($9.99)' : 'per year ($99.99)',
      yearlyBilled: '₹7,999 / year (Save 33% + 2 Months Free)',
      badge: 'RECOMMENDED',
      badgeColor: '#38BDF8',
      accentColor: '#38BDF8',
      headlineBenefit: 'Everything needed to host professional silent parties',
      benefits: [
        { title: '150 Attendee Earbuds', desc: 'Scale for medium venues, bars, and club nights' },
        { title: '3 Live DJ Channels', desc: 'Red, Blue & Green multi-genre channel switching' },
        { title: 'Live MC Voice Mic', desc: 'Broadcast microphone shoutouts over live music' },
        { title: 'Silent Disco Glow Screens', desc: 'Attendee phones flash colors in sync with music' },
        { title: 'Lossless 320kbps Audio', desc: 'High-fidelity audio with zero distortion or hiss' },
        { title: 'Audience Attendance History', desc: 'Track attendee device names & what they heard' },
      ],
      ctaText: 'Pay Now',
      isCurrent: currentPlan.planId === 'pro',
      popular: true,
    },
    {
      id: 'business',
      name: 'Business Enterprise',
      tagline: 'For festivals, event companies & large venues',
      monthlyPrice: '₹2,799',
      yearlyPrice: '₹27,999',
      period: billingCycle === 'monthly' ? 'per month ($34.99)' : 'per year ($349.99)',
      yearlyBilled: '₹27,999 / year (Save 30%)',
      badge: 'FESTIVALS & VENUES',
      badgeColor: '#F59E0B',
      accentColor: '#F59E0B',
      headlineBenefit: 'Maximum scale, custom branding & offline reliability',
      benefits: [
        { title: 'Unlimited (1,000+) Earbuds', desc: 'Crowd scaling for outdoor festivals & stadiums' },
        { title: '5 Discrete DJ Channels', desc: 'Host 5 stages simultaneously with zero bleed' },
        { title: 'Custom Event Logo & QR', desc: 'Brand the connection screen with your sponsor logo' },
        { title: 'Offline Router Support', desc: 'Broadcast 100% reliably with no internet access' },
        { title: 'Multi-DJ Co-Broadcast', desc: 'Multiple hosts stream simultaneously from phones' },
        { title: 'Export Attendance Reports', desc: 'Download attendee logs and music breakdown' },
        { title: '24/7 Dedicated Event Support', desc: 'Priority technical support for live operations' },
      ],
      ctaText: 'Pay Now',
      isCurrent: currentPlan.planId === 'business',
      popular: false,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 16 : 8),
            paddingBottom: insets.bottom + 90,
          }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/' as any)}>
            <ArrowLeft size={16} color="#94A3B8" />
            <Text style={styles.backText}>Home</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BudcastLogo size={26} />
            <View style={styles.proPill}>
              <Crown size={13} color="#F59E0B" />
              <Text style={styles.proPillText}>Budcast Plans</Text>
            </View>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.title}>
            Choose Your <Text style={{ color: '#F59E0B' }}>Budcast Plan</Text>
          </Text>
          <Text style={styles.subtitle}>
            Broadcast zero-latency movie audio or multi-channel silent discos directly into everyone's wireless earbuds.
          </Text>
        </View>

        {/* VIP Pass Redemption Banner */}
        <TouchableOpacity
          style={styles.vipBannerCard}
          onPress={() => router.push('/vip' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.vipBannerLeft}>
            <View style={styles.vipBannerIconWrap}>
              <Sparkles size={18} color="#00F2FE" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.vipBannerTitle}>Have an Early Access VIP Code?</Text>
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>FREE PASS</Text>
                </View>
              </View>
              <Text style={styles.vipBannerSubtitle}>
                Redeem your code to unlock Founder Gold status & 3-channel beta stages
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#00F2FE" />
        </TouchableOpacity>

        {/* Payment Feedback Banners */}
        {paymentSuccess ? (
          <View style={styles.successBanner}>
            <CheckCircle2 size={18} color="#10B981" />
            <Text style={styles.successBannerText}>{paymentSuccess}</Text>
          </View>
        ) : null}

        {paymentError ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color="#EF4444" />
            <Text style={styles.errorBannerText}>{paymentError}</Text>
          </View>
        ) : null}

        {/* Billing Cycle Switcher (Monthly vs Yearly) */}
        <View style={styles.billingToggleWrapper}>
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[styles.billingBtn, billingCycle === 'monthly' && styles.billingBtnActive]}
              onPress={() => setBillingCycle('monthly')}
              activeOpacity={0.8}
            >
              <Text style={[styles.billingBtnText, billingCycle === 'monthly' && styles.billingBtnTextActive]}>
                Monthly Billing
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.billingBtn, billingCycle === 'yearly' && styles.billingBtnActive]}
              onPress={() => setBillingCycle('yearly')}
              activeOpacity={0.8}
            >
              <Text style={[styles.billingBtnText, billingCycle === 'yearly' && styles.billingBtnTextActive]}>
                Yearly Billing
              </Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>SAVE 33%</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* PLANS LIST */}
        <View style={styles.plansContainer}>
          {plans.map((plan) => {
            const displayPrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  plan.popular && styles.planCardPopular,
                  plan.isCurrent && styles.planCardCurrent
                ]}
              >
                {/* Popular or Current Badge */}
                {plan.isCurrent ? (
                  <View style={[styles.popularBadge, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.popularBadgeText}>CURRENT ACTIVE PLAN</Text>
                  </View>
                ) : plan.popular ? (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>{plan.badge}</Text>
                  </View>
                ) : null}

                {/* Plan Header */}
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planTagline}>{plan.tagline}</Text>
                </View>

                {/* Pricing Display */}
                <View style={styles.priceRow}>
                  <Text style={[styles.priceAmount, { color: plan.accentColor }]}>{displayPrice}</Text>
                  <Text style={styles.pricePeriod}>/{plan.period}</Text>
                </View>

                {billingCycle === 'yearly' && plan.yearlyBilled ? (
                  <Text style={styles.billedText}>{plan.yearlyBilled}</Text>
                ) : null}

                {/* Headline benefit */}
                <View style={styles.headlineBox}>
                  <Text style={[styles.headlineText, { color: plan.accentColor }]}>
                    {plan.headlineBenefit}
                  </Text>
                </View>

                {/* Detailed Benefits List */}
                <View style={styles.benefitsList}>
                  {plan.benefits.map((b, bIdx) => (
                    <View key={bIdx} style={styles.benefitRow}>
                      <CheckCircle2 size={16} color={plan.accentColor} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.benefitTitle}>{b.title}</Text>
                        <Text style={styles.benefitDesc}>{b.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                  style={[
                    styles.ctaButton,
                    { backgroundColor: plan.accentColor },
                    plan.isCurrent && styles.ctaButtonCurrent
                  ]}
                  onPress={() => handlePlanAction(plan.id, plan.name)}
                  activeOpacity={0.85}
                  disabled={loading || plan.isCurrent}
                >
                  {loading && loadingPlanId === plan.id ? (
                    <ActivityIndicator size="small" color="#090A0F" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {!plan.isCurrent && plan.id !== 'free' && <CreditCard size={15} color="#090A0F" />}
                      <Text style={[styles.ctaButtonText, plan.isCurrent && { color: '#94A3B8' }]}>
                        {plan.isCurrent ? 'Active Current Plan' : plan.ctaText}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Feature Comparison Table */}
        <View style={styles.comparisonTableSection}>
          <Text style={styles.tableTitle}>TIER FEATURE COMPARISON</Text>

          <View style={styles.tableCard}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableColHeader, { flex: 2 }]}>Feature</Text>
              <Text style={[styles.tableColHeader, { flex: 1, textAlign: 'center' }]}>Free</Text>
              <Text style={[styles.tableColHeader, { flex: 1, textAlign: 'center', color: '#38BDF8' }]}>Pro</Text>
              <Text style={[styles.tableColHeader, { flex: 1, textAlign: 'center', color: '#F59E0B' }]}>Business</Text>
            </View>

            {[
              { name: 'Max Earbud Listeners', free: '8', pro: '150', biz: '1,000+' },
              { name: 'DJ Audio Channels', free: '1', pro: '3', biz: '5' },
              { name: 'Audio Bitrate Quality', free: '160kbps', pro: '320kbps', biz: 'Lossless' },
              { name: 'Live MC Voice Mic', free: '—', pro: '✓', biz: '✓' },
              { name: 'Disco Glow Screens', free: '—', pro: '✓', biz: '✓' },
              { name: 'Audience Attendance History', free: '—', pro: '✓', biz: '✓' },
              { name: 'Custom Event Logo on QR', free: '—', pro: '—', biz: '✓' },
              { name: 'Offline Mode (No Internet)', free: '—', pro: '—', biz: '✓' },
            ].map((row, idx) => (
              <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCellFeature, { flex: 2 }]}>{row.name}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{row.free}</Text>
                <Text style={[styles.tableCell, { flex: 1, color: '#38BDF8', fontWeight: '800' }]}>{row.pro}</Text>
                <Text style={[styles.tableCell, { flex: 1, color: '#F59E0B', fontWeight: '800' }]}>{row.biz}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Bottom Nav */}
      <FloatingNavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090A0F',
  },
  container: {
    padding: 18,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1E293B',
    borderRadius: 10,
  },
  backText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  proPillText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
  },
  heroSection: {
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
  },
  successBannerText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  billingToggleWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  billingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  billingBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  billingBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  billingBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  discountBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    color: '#090A0F',
    fontSize: 8,
    fontWeight: '900',
  },
  plansContainer: {
    gap: 16,
    marginBottom: 28,
  },
  planCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  planCardPopular: {
    borderColor: 'rgba(56, 189, 248, 0.4)',
    backgroundColor: '#0C1322',
  },
  planCardCurrent: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: '#09151C',
  },
  popularBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  popularBadgeText: {
    color: '#090A0F',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planBadgeText: {
    color: '#090A0F',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planHeader: {
    marginBottom: 10,
    paddingRight: 60,
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  planTagline: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
  },
  pricePeriod: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  billedText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
  },
  yearlyBilledText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
  },
  headlineBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  headlineText: {
    fontSize: 11,
    fontWeight: '800',
  },
  benefitsList: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
    marginBottom: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  benefitTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  benefitDesc: {
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 1,
  },
  ctaButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  ctaButtonCurrent: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  ctaButtonText: {
    color: '#090A0F',
    fontSize: 13,
    fontWeight: '900',
  },
  comparisonTableSection: {
    marginBottom: 20,
  },
  tableTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  tableCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableColHeader: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  tableCellFeature: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  tableCell: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  vipBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 242, 254, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  vipBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vipBannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  freeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  vipBannerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 15,
  },
});
