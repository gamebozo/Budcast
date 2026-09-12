import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Platform, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Camera, QrCode, Upload, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import jsQR from 'jsqr';
import { BudcastLogo } from './BudcastLogo';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScannedPin?: (pin: string) => void;
}

export function QRScannerModal({ visible, onClose, onScannedPin }: QRScannerModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'camera' | 'pin'>('camera');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleScannedData = (decodedText: string) => {
    console.log('[QR Modal] Found QR Code:', decodedText);
    stopCamera();
    setScanSuccess(true);

    let extractedPin = '';
    const match = decodedText.match(/\/room\/(\d{4})/);
    if (match && match[1]) {
      extractedPin = match[1];
    } else {
      const pinMatch = decodedText.match(/\b\d{4}\b/);
      if (pinMatch) {
        extractedPin = pinMatch[0];
      }
    }

    if (extractedPin) {
      setTimeout(() => {
        onClose();
        if (onScannedPin) {
          onScannedPin(extractedPin);
        } else {
          router.push(`/room/${extractedPin}` as any);
        }
      }, 500);
    } else {
      setError('Found QR code but could not find a valid 4-digit room PIN.');
      setScanSuccess(false);
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        handleScannedData(code.data);
        return;
      }
    }

    animationFrameId.current = requestAnimationFrame(scanFrame);
  };

  const startCamera = async () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    setError('');
    setScanSuccess(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setError('Camera access denied or unavailable. Please allow camera permissions or enter PIN manually.');
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (visible && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [visible, activeTab]);

  useEffect(() => {
    if (cameraActive) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [cameraActive]);

  const handleFileUpload = (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleScannedData(code.data);
        } else {
          setError('No valid QR code found in the selected image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleManualJoin = () => {
    if (pin.trim().length !== 4) {
      setError('Please enter a 4-digit room PIN');
      return;
    }
    stopCamera();
    onClose();
    if (onScannedPin) {
      onScannedPin(pin.trim());
    } else {
      router.push(`/room/${pin.trim()}` as any);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        stopCamera();
        onClose();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BudcastLogo size={24} />
              <Text style={styles.headerTitle}>Scan Host QR Code</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                stopCamera();
                onClose();
              }}
            >
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'camera' && styles.tabBtnActive]}
              onPress={() => setActiveTab('camera')}
            >
              <Camera size={15} color={activeTab === 'camera' ? '#38BDF8' : '#94A3B8'} />
              <Text style={[styles.tabBtnText, activeTab === 'camera' && styles.tabBtnTextActive]}>
                Camera Scanner
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'pin' && styles.tabBtnActive]}
              onPress={() => setActiveTab('pin')}
            >
              <QrCode size={15} color={activeTab === 'pin' ? '#38BDF8' : '#94A3B8'} />
              <Text style={[styles.tabBtnText, activeTab === 'pin' && styles.tabBtnTextActive]}>
                Enter PIN
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'camera' ? (
            <View style={styles.scannerWrapper}>
              <View style={styles.cameraBox}>
                {Platform.OS === 'web' ? (
                  <div style={{ position: 'relative', width: '260px', height: '260px', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#000' }}>
                    <video
                      ref={videoRef}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {cameraActive && !scanSuccess && (
                      <div style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        right: '20px',
                        bottom: '20px',
                        border: '2px dashed rgba(56, 189, 248, 0.7)',
                        borderRadius: '12px',
                        pointerEvents: 'none',
                        boxShadow: '0 0 20px rgba(56, 189, 248, 0.25)'
                      }}>
                        <div style={{
                          width: '100%',
                          height: '2px',
                          backgroundColor: '#38BDF8',
                          boxShadow: '0 0 10px #38BDF8'
                        }} />
                      </div>
                    )}

                    {scanSuccess && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(9, 10, 15, 0.95)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                      }}>
                        <CheckCircle2 size={40} color="#10B981" />
                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#10B981' }}>
                          QR Verified! Connecting...
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <View style={{ width: 260, height: 260, position: 'relative', backgroundColor: '#000', borderRadius: 16, overflow: 'hidden' }}>
                    {!permission ? (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator color="#38BDF8" size="large" />
                      </View>
                    ) : !permission.granted ? (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                        <Camera size={32} color="#38BDF8" style={{ marginBottom: 12 }} />
                        <Text style={{ color: '#F8FAFC', fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>
                          Camera Access Needed
                        </Text>
                        <Text style={{ color: '#94A3B8', fontSize: 11, textAlign: 'center', marginBottom: 14 }}>
                          Allow camera access to instantly scan host QR codes
                        </Text>
                        <TouchableOpacity
                          style={{ backgroundColor: '#38BDF8', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }}
                          onPress={requestPermission}
                        >
                          <Text style={{ color: '#050814', fontSize: 12, fontWeight: '800' }}>Grant Permission</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <CameraView
                          style={{ width: 260, height: 260 }}
                          facing="back"
                          barcodeScannerSettings={{
                            barcodeTypes: ['qr'],
                          }}
                          onBarcodeScanned={({ data }) => {
                            if (!scanSuccess && data) {
                              handleScannedData(data);
                            }
                          }}
                        />
                        {/* Viewfinder Target Border Overlay */}
                        <View
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            top: 24,
                            left: 24,
                            right: 24,
                            bottom: 24,
                            borderWidth: 2,
                            borderColor: '#38BDF8',
                            borderRadius: 14,
                            borderStyle: 'dashed',
                          }}
                        />
                        {scanSuccess && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: 'rgba(5, 8, 20, 0.92)',
                              justifyContent: 'center',
                              alignItems: 'center',
                              gap: 10,
                            }}
                          >
                            <CheckCircle2 size={44} color="#10B981" />
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#10B981' }}>
                              QR Verified! Connecting...
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                )}
              </View>

              <Text style={styles.scannerHint}>
                Align the host's QR code within the frame to join automatically.
              </Text>

              {Platform.OS === 'web' && (
                <View style={styles.uploadRow}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#1E2433',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: '1px solid #2E3852',
                    color: '#94A3B8',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}>
                    <Upload size={14} color="#38BDF8" />
                    <span>Upload QR Screenshot</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.pinCard}>
              <Text style={styles.pinLabel}>4-DIGIT ROOM PIN</Text>
              <TextInput
                style={styles.pinInput}
                placeholder="0000"
                placeholderTextColor="#475569"
                keyboardType="number-pad"
                maxLength={4}
                value={pin}
                autoFocus
                onChangeText={(val) => {
                  setPin(val);
                  if (error) setError('');
                }}
              />

              <TouchableOpacity
                style={[styles.manualJoinBtn, pin.length === 4 && styles.manualJoinBtnActive]}
                onPress={handleManualJoin}
                activeOpacity={0.8}
              >
                <Text style={styles.manualJoinBtnText}>Enter Broadcast</Text>
              </TouchableOpacity>
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <AlertCircle size={14} color="#F87171" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 13, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0E131F',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  tabContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#151C2C',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#1E293B',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  scannerWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  cameraBox: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  scannerHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
  },
  uploadRow: {
    marginTop: 12,
  },
  pinCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  pinInput: {
    width: 180,
    height: 56,
    backgroundColor: '#151C2C',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 16,
  },
  manualJoinBtn: {
    width: '100%',
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  manualJoinBtnActive: {
    backgroundColor: '#38BDF8',
  },
  manualJoinBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
    width: '100%',
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
