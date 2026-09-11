import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Crown, Check, X, Sparkles, Zap, Shield, Radio, Users, Headphones, CheckCircle2, CreditCard, AlertCircle } from 'lucide-react-native';
import { BudcastLogo } from './BudcastLogo';
import { startRazorpayCheckout } from '../services/razorpay';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const ProUpgradeModal: React.FC<Props> = ({ visible, onClose }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedTier, setSelectedTier] = useState<'pro' | 'business'>('pro');
  const [loading, setLoading] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [error, setError] = useState('');

  const handlePurchase = () => {
    setLoading(true);
    setError('');

    startRazorpayCheckout({
      planId: selectedTier,
      planName: selectedTier === 'business' ? 'Business Enterprise' : 'Organizer Pro',
      billingCycle,
      onSuccess: () => {
        setLoading(false);
        setPurchased(true);
        setTimeout(() => {
          setPurchased(false);
          onClose();
        }, 1600);
      },
      onError: (err) => {
        setLoading(false);
        setError(err || 'Payment failed');
      },
      onDismiss: () => {
        setLoading(false);
      }
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <BudcastLogo size={36} />
              <View style={styles.crownBadge}>
                <Crown size={20} color="#F59E0B" />
              </View>
            </View>
            <Text style={styles.title}>Unlock Budcast Organizer Plans</Text>
            <Text style={styles.subtitle}>
              Broadcast to hundreds of attendees with zero-latency audio and multi-channel DJ battles.
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Billing Switcher */}
          <View style={styles.billingToggleWrapper}>
            <View style={styles.billingToggle}>
              <TouchableOpacity
                style={[styles.billingBtn, billingCycle === 'monthly' && styles.billingBtnActive]}
                onPress={() => setBillingCycle('monthly')}
                activeOpacity={0.8}
              >
                <Text style={[styles.billingBtnText, billingCycle === 'monthly' && styles.billingBtnTextActive]}>
                  Monthly
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.billingBtn, billingCycle === 'yearly' && styles.billingBtnActive]}
                onPress={() => setBillingCycle('yearly')}
                activeOpacity={0.8}
              >
                <Text style={[styles.billingBtnText, billingCycle === 'yearly' && styles.billingBtnTextActive]}>
                  Yearly
                </Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>SAVE 33%</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Pricing Cards */}
            <View style={styles.plansContainer}>
              {/* Event Pro - Featured */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  styles.featuredCard,
                  selectedTier === 'pro' && styles.planCardActive
                ]}
                onPress={() => setSelectedTier('pro')}
                activeOpacity={0.8}
              >
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
                <View style={styles.planHeader}>
                  <View>
                    <Text style={[styles.planTitle, { color: '#38BDF8' }]}>Organizer Pro</Text>
                    <Text style={styles.planDesc}>Up to 150 attendees & 3 DJ channels</Text>
                  </View>
                  <Text style={styles.planPrice}>
                    {billingCycle === 'yearly' ? '$9.99' : '$14.99'}
                    <Text style={styles.perMonth}>/mo</Text>
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Business Enterprise */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedTier === 'business' && styles.planCardActiveBusiness
                ]}
                onPress={() => setSelectedTier('business')}
                activeOpacity={0.8}
              >
                <View style={[styles.popularBadge, { backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.popularText}>ENTERPRISE & FESTIVALS</Text>
                </View>
                <View style={styles.planHeader}>
                  <View>
                    <Text style={[styles.planTitle, { color: '#F59E0B' }]}>Business Enterprise</Text>
                    <Text style={styles.planDesc}>1,000+ attendees, 5 DJ channels & Custom Logo</Text>
                  </View>
                  <Text style={styles.planPrice}>
                    {billingCycle === 'yearly' ? '$34.99' : '$49.99'}
                    <Text style={styles.perMonth}>/mo</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Feature Highlights */}
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <CheckCircle2 size={16} color="#38BDF8" />
                <Text style={styles.featureText}>Broadcast zero-latency audio directly to all attendee earbuds</Text>
              </View>
              <View style={styles.featureItem}>
                <CheckCircle2 size={16} color="#38BDF8" />
                <Text style={styles.featureText}>Guests use their own earbuds with 0.00ms phase lock</Text>
              </View>
              <View style={styles.featureItem}>
                <CheckCircle2 size={16} color="#38BDF8" />
                <Text style={styles.featureText}>Multi-channel Silent Disco switcher & glowing screens</Text>
              </View>
              <View style={styles.featureItem}>
                <CheckCircle2 size={16} color="#38BDF8" />
                <Text style={styles.featureText}>Audience attendance history & listener analytics</Text>
              </View>
            </View>

            {/* Error banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={14} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Action CTA */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                selectedTier === 'business' && { backgroundColor: '#F59E0B' }
              ]}
              onPress={handlePurchase}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#090A0F" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CreditCard size={16} color="#090A0F" />
                  <Text style={styles.actionBtnText}>
                    {purchased ? '✓ Plan Activated!' : `Pay Now`}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.legalNotice}>
              Cancel anytime. Instant activation for all your events.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  crownBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    maxWidth: 320,
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 6,
  },
  billingToggleWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 3,
  },
  billingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  billingBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  billingBtnText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  billingBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  discountBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discountText: {
    color: '#090A0F',
    fontSize: 8,
    fontWeight: '900',
  },
  scrollArea: {
    marginBottom: 10,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  planCardActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  planCardActiveBusiness: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  featuredCard: {
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 14,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularText: {
    color: '#090A0F',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  planDesc: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  planPrice: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  perMonth: {
    color: '#64748B',
    fontSize: 10,
  },
  featureList: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  actionBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionBtnText: {
    color: '#090A0F',
    fontSize: 14,
    fontWeight: '900',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  legalNotice: {
    color: '#64748B',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 10,
  },
});
