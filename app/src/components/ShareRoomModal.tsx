import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Users, Shield } from 'lucide-react-native';
import { BudcastLogo } from './BudcastLogo';

interface Props {
  visible: boolean;
  onClose: () => void;
  pin: string;
  url: string;
  listenerCount: number;
}

export const ShareRoomModal: React.FC<Props> = ({
  visible,
  onClose,
  pin,
  url,
  listenerCount,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={20} color="#94A3B8" />
          </TouchableOpacity>

          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <BudcastLogo size={42} />
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.greenPulse} />
            <Users size={14} color="#10B981" />
            <Text style={styles.liveText}>{listenerCount} Connected Now</Text>
          </View>

          <Text style={styles.title}>Invite Listeners</Text>
          <Text style={styles.subtitle}>
            Have guests scan this QR code or enter the 4-digit PIN to sync their earbuds instantly.
          </Text>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            {Platform.OS === 'web' ? (
              <QRCodeSVG value={url} size={180} level="M" />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrText}>Room URL:</Text>
                <Text style={styles.qrUrlText}>{url}</Text>
              </View>
            )}
          </View>

          {/* PIN Display */}
          <View style={styles.pinSection}>
            <Text style={styles.pinLabel}>ROOM 4-DIGIT PIN</Text>
            <Text style={styles.pinNumber}>{pin}</Text>
          </View>

          {/* Copy Button */}
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
            {copied ? <Check size={18} color="#10B981" /> : <Copy size={18} color="#94A3B8" />}
            <Text style={[styles.copyBtnText, copied && styles.copiedText]}>
              {copied ? 'Direct Link Copied!' : 'Copy Room Join Link'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : {}),
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 20,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    marginBottom: 16,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrText: {
    color: '#64748B',
    fontSize: 12,
  },
  qrUrlText: {
    color: '#0F172A',
    fontSize: 10,
    textAlign: 'center',
  },
  pinSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pinLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  pinNumber: {
    fontSize: 34,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 6,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
    justifyContent: 'center',
  },
  copyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  copiedText: {
    color: '#10B981',
  },
});
