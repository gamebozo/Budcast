import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react-native';

interface Props {
  pin: string;
  url: string;
  title?: string;
}

export const QRCodeDisplay: React.FC<Props> = ({ pin, url, title }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.qrWrapper}>
        {Platform.OS === 'web' ? (
          <QRCodeSVG value={url} size={180} level="M" />
        ) : (
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrPlaceholderText}>QR Code for:</Text>
            <Text style={styles.qrUrlText} numberOfLines={2}>{url}</Text>
          </View>
        )}
      </View>

      <View style={styles.pinWrapper}>
        <Text style={styles.pinLabel}>ROOM 4-DIGIT PIN</Text>
        <Text style={styles.pinNumber}>{pin}</Text>
      </View>

      <TouchableOpacity style={styles.copyButton} onPress={handleCopy} activeOpacity={0.8}>
        {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} color="#94A3B8" />}
        <Text style={[styles.copyText, copied && styles.copiedText]}>
          {copied ? 'Link Copied!' : 'Copy Join Link'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  qrPlaceholderText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  qrUrlText: {
    fontSize: 10,
    color: '#0F172A',
    textAlign: 'center',
  },
  pinWrapper: {
    alignItems: 'center',
    marginBottom: 12,
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  pinNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 6,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  copyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  copiedText: {
    color: '#10B981',
  },
});
