import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ArrowLeft, Camera, QrCode, Upload, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import jsQR from 'jsqr';
import { BudcastLogo } from '../components/BudcastLogo';

export default function JoinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  // Extract Room PIN from scanned QR code data
  const handleScannedData = (decodedText: string) => {
    if (scanSuccess) return;
    console.log('[QR Scanner] Found QR Code:', decodedText);
    stopCamera();
    setScanSuccess(true);

    // Extract 4-digit PIN from URL or raw text
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
        router.replace(`/room/${extractedPin}` as any);
      }, 500);
    } else {
      setError('Found QR code but could not find a 4-digit room PIN.');
      setScanSuccess(false);
    }
  };

  // Continuous Camera QR Code Frame Analyzer
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
        return; // stop scanning loop on hit
      }
    }

    animationFrameId.current = requestAnimationFrame(scanFrame);
  };

  // Start Camera Stream
  const startWebCamera = async () => {
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
      setError('Camera access denied or unavailable. Please allow camera access or enter PIN manually.');
      setCameraActive(false);
    }
  };

  // Stop Camera Stream
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

  // Run scanning loop when camera becomes active
  useEffect(() => {
    if (cameraActive && Platform.OS === 'web') {
      animationFrameId.current = requestAnimationFrame(scanFrame);
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [cameraActive]);

  // Tab change trigger
  useEffect(() => {
    if (activeTab === 'camera') {
      if (Platform.OS === 'web') {
        startWebCamera();
      } else {
        if (!permission?.granted) {
          requestPermission();
        }
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, permission?.granted]);

  // Decode QR code from uploaded photo
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
          setError('No QR code found in the uploaded image.');
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
    router.replace(`/room/${pin.trim()}` as any);
  };

  return (
    <View style={styles.safeArea}>
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top + 8, 36),
            paddingBottom: Math.max(insets.bottom + 20, 30)
          }
        ]}
      >
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => {
            stopCamera();
            router.replace('/' as any);
          }}>
            <ArrowLeft size={16} color="#94A3B8" />
            <Text style={styles.backText}>Home</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BudcastLogo size={24} />
            <Text style={styles.headerTitle}>Join Broadcast Room</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Tab Switcher (Camera Scanner vs PIN Input) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'camera' && styles.tabBtnActive]}
            onPress={() => setActiveTab('camera')}
          >
            <Camera size={16} color={activeTab === 'camera' ? '#38BDF8' : '#94A3B8'} />
            <Text style={[styles.tabBtnText, activeTab === 'camera' && styles.tabBtnTextActive]}>
              Scan Camera QR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'pin' && styles.tabBtnActive]}
            onPress={() => setActiveTab('pin')}
          >
            <QrCode size={16} color={activeTab === 'pin' ? '#38BDF8' : '#94A3B8'} />
            <Text style={[styles.tabBtnText, activeTab === 'pin' && styles.tabBtnTextActive]}>
              Type 4-Digit PIN
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content: Live Camera Scanner */}
        {activeTab === 'camera' ? (
          <View style={styles.scannerWrapper}>
            <View style={styles.cameraBox}>
              {Platform.OS === 'web' ? (
                <div style={{ position: 'relative', width: '280px', height: '280px', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#000' }}>
                  <video
                    ref={videoRef}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  {/* Viewfinder Reticle & Glowing Laser */}
                  {cameraActive && !scanSuccess && (
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      left: '20px',
                      right: '20px',
                      bottom: '20px',
                      border: '2px dashed rgba(56, 189, 248, 0.6)',
                      borderRadius: '12px',
                      pointerEvents: 'none',
                      boxShadow: '0 0 20px rgba(56, 189, 248, 0.25)'
                    }}>
                      <div style={{
                        width: '100%',
                        height: '2px',
                        backgroundColor: '#38BDF8',
                        boxShadow: '0 0 10px #38BDF8',
                        animation: 'scanLaser 2s ease-in-out infinite alternate'
                      }} />
                    </div>
                  )}

                  {/* Scan Success Overlay */}
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
                      <CheckCircle2 size={44} color="#10B981" />
                      <span style={{ fontSize: '15px', fontWeight: '800', color: '#10B981' }}>
                        QR Verified! Joining...
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <View style={styles.nativeCameraContainer}>
                  {!permission?.granted ? (
                    <View style={styles.permissionBox}>
                      <Camera size={36} color="#38BDF8" />
                      <Text style={styles.permissionTitle}>Camera Access Required</Text>
                      <Text style={styles.permissionSub}>
                        Budcast needs camera access to scan and connect to the host's QR code.
                      </Text>
                      <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                        <ShieldCheck size={16} color="#090A0F" />
                        <Text style={styles.grantBtnText}>Allow Camera Access</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <CameraView
                      style={styles.nativeCameraView}
                      facing="back"
                      barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                      }}
                      onBarcodeScanned={({ data }) => {
                        if (data) {
                          handleScannedData(data);
                        }
                      }}
                    >
                      <View style={styles.reticleFrame}>
                        <View style={styles.reticleCornerTL} />
                        <View style={styles.reticleCornerTR} />
                        <View style={styles.reticleCornerBL} />
                        <View style={styles.reticleCornerBR} />
                        <View style={styles.laserLine} />
                      </View>
                    </CameraView>
                  )}
                </View>
              )}
            </View>

            <Text style={styles.scannerHint}>
              Point your camera at the host's screen to connect instantly.
            </Text>

            {/* Scan from Photo / Screenshot Fallback */}
            {Platform.OS === 'web' && (
              <View style={styles.uploadRow}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#1E293B',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  color: '#94A3B8',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}>
                  <Upload size={16} color="#38BDF8" />
                  <span>Scan from Photo / Screenshot</span>
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
          /* Tab Content: 4-Digit PIN Entry */
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
              includeFontPadding={false}
              textAlignVertical="center"
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
              <Text style={styles.manualJoinBtnText}>Enter Room</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error Alert */}
        {error ? (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color="#F87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090A0F',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#12141D',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1F2333',
  },
  backText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#12141D',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1F2333',
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#1A1D2A',
  },
  tabBtnText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  scannerWrapper: {
    backgroundColor: '#12141D',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2333',
  },
  cameraBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  nativeCameraContainer: {
    width: 260,
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeCameraView: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
    textAlign: 'center',
  },
  permissionSub: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 16,
  },
  grantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  grantBtnText: {
    color: '#090A0F',
    fontSize: 12,
    fontWeight: '900',
  },
  reticleFrame: {
    width: 180,
    height: 180,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderRadius: 16,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleCornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#38BDF8',
    borderTopLeftRadius: 12,
  },
  reticleCornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#38BDF8',
    borderTopRightRadius: 12,
  },
  reticleCornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#38BDF8',
    borderBottomLeftRadius: 12,
  },
  reticleCornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#38BDF8',
    borderBottomRightRadius: 12,
  },
  laserLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  scannerHint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 14,
  },
  uploadRow: {
    marginTop: 16,
  },
  pinCard: {
    backgroundColor: '#12141D',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2333',
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  pinInput: {
    width: '100%',
    height: 60,
    backgroundColor: '#1A1D2A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3044',
    color: '#38BDF8',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: 16,
  },
  manualJoinBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#1A1D2A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A3044',
  },
  manualJoinBtnActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  manualJoinBtnText: {
    color: '#090A0F',
    fontSize: 15,
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    flex: 1,
  },
});
