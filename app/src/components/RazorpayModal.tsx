import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X, ShieldCheck, Lock, AlertCircle } from 'lucide-react-native';
import { getApiBaseUrl } from '../services/apiConfig';
import { getHostId, setActivePlan } from '../services/hostStorage';

let WebViewComponent: any = null;
if (Platform.OS !== 'web') {
  try {
    WebViewComponent = require('react-native-webview').WebView;
  } catch (e) {
    console.log('[RazorpayModal] WebView import notice:', e);
  }
}

export interface RazorpayModalProps {
  visible: boolean;
  planId: 'pro' | 'business';
  planName: string;
  billingCycle: 'monthly' | 'yearly';
  amountPaise: number;
  orderId?: string;
  keyId?: string;
  onSuccess: (data: { subscription: any; message: string }) => void;
  onError: (error: string) => void;
  onClose: () => void;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  visible,
  planId,
  planName,
  billingCycle,
  amountPaise,
  orderId: propOrderId,
  keyId: propKeyId,
  onSuccess,
  onError,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState(propOrderId || '');
  const [keyId, setKeyId] = useState(propKeyId || '');
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setErrorMsg('');
      setVerifying(false);
      initOrder();
    }
  }, [visible, planId, billingCycle]);

  const initOrder = async () => {
    try {
      const hostId = getHostId();
      const res = await fetch(`${getApiBaseUrl()}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle,
          hostId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.orderId) {
        setOrderId(data.orderId);
        if (data.keyId) setKeyId(data.keyId);
      } else {
        setErrorMsg(data.error || 'Failed to initialize payment order');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Could not connect to payment server');
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'PAYMENT_SUCCESS') {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = message.data;
        setVerifying(true);

        const hostId = getHostId();
        const verifyRes = await fetch(`${getApiBaseUrl()}/api/payment/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: razorpay_order_id || orderId,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
            hostId,
            planId,
            billingCycle,
          }),
        });

        const verifyData = await verifyRes.json();

        if (verifyRes.ok && verifyData.success) {
          // ONLY activate plan when verification succeeds
          setActivePlan({
            planId,
            planName,
            billingCycle,
            activatedAt: new Date().toISOString(),
            expiresAt: verifyData.subscription?.expires_at,
          });

          onSuccess(verifyData);
          onClose();
        } else {
          // Verification failed -> DO NOT ACTIVATE PLAN
          onError(verifyData.error || 'Payment verification failed');
          onClose();
        }
      } else if (message.type === 'PAYMENT_DISMISSED') {
        // User closed or cancelled payment -> DO NOT ACTIVATE PLAN
        onError('Payment was cancelled');
        onClose();
      } else if (message.type === 'PAYMENT_FAILED') {
        // Payment failed -> DO NOT ACTIVATE PLAN
        onError(message.error || 'Payment transaction failed');
        onClose();
      }
    } catch (e: any) {
      console.error('[RazorpayModal] Message parse error:', e);
      onError('Payment processing error');
      onClose();
    } finally {
      setVerifying(false);
    }
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Razorpay Checkout</title>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background-color: #090A0F;
          color: #FFF;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 100vh;
        }
        .spinner-box {
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
        }
        .spinner {
          width: 44px; height: 44px; border: 3px solid rgba(56, 189, 248, 0.2);
          border-top-color: #38BDF8; border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="spinner-box">
        <div class="spinner"></div>
        <div style="font-size: 14px; font-weight: 800; color: #38BDF8;">Opening Razorpay Checkout...</div>
        <div style="font-size: 11px; color: #94A3B8;">Connecting directly via secure channel</div>
      </div>

      <script>
        function sendToApp(payload) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        }

        function launchRazorpay() {
          const options = {
            key: '${keyId}',
            amount: '${amountPaise}',
            currency: 'INR',
            name: 'Budcast',
            description: '${planName} (${billingCycle.toUpperCase()})',
            image: 'https://budcast.onrender.com/app-icon.png',
            order_id: '${orderId}',
            handler: function(response) {
              sendToApp({
                type: 'PAYMENT_SUCCESS',
                data: {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id || '${orderId}',
                  razorpay_signature: response.razorpay_signature
                }
              });
            },
            prefill: {
              name: 'Budcast Host',
              email: 'host@budcast.live',
              contact: '9999999999'
            },
            theme: {
              color: '#38BDF8'
            },
            modal: {
              ondismiss: function() {
                sendToApp({ type: 'PAYMENT_DISMISSED' });
              }
            }
          };

          if (window.Razorpay) {
            const rzp = new Razorpay(options);
            rzp.on('payment.failed', function(res) {
              sendToApp({
                type: 'PAYMENT_FAILED',
                error: res.error ? res.error.description : 'Payment transaction failed'
              });
            });
            rzp.open();
          } else {
            sendToApp({ type: 'PAYMENT_FAILED', error: 'Razorpay SDK failed to load' });
          }
        }

        window.onload = function() {
          setTimeout(launchRazorpay, 300);
        };
      </script>
    </body>
    </html>
  `;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={() => {
        if (!verifying) {
          onError('Payment was cancelled');
          onClose();
        }
      }}
    >
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.badge}>
              <Lock size={12} color="#38BDF8" />
              <Text style={styles.badgeText}>Razorpay 256-Bit SSL</Text>
            </View>
            <Text style={styles.title}>{planName}</Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              if (!verifying) {
                onError('Payment was cancelled');
                onClose();
              }
            }}
          >
            <X size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Content View */}
        {loading || verifying ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={styles.loadingText}>
              {verifying ? 'Verifying payment signature with server...' : 'Initializing Razorpay order...'}
            </Text>
            <Text style={styles.loadingSubText}>Please do not close this window.</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={40} color="#EF4444" />
            <Text style={styles.errorTitle}>Payment Initialization Error</Text>
            <Text style={styles.errorDesc}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={initOrder}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : WebViewComponent ? (
          <WebViewComponent
            source={{
              html: htmlContent,
              baseUrl: 'https://budcast.onrender.com',
            }}
            onMessage={handleWebViewMessage}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            originWhitelist={['*']}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
          />
        ) : (
          <View style={styles.errorContainer}>
            <AlertCircle size={40} color="#EF4444" />
            <Text style={styles.errorTitle}>WebView Module Unavailable</Text>
            <Text style={styles.errorDesc}>
              Please rebuild the app to support native WebView payments.
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090A0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
  },
  webview: {
    flex: 1,
    backgroundColor: '#090A0F',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingSubText: {
    color: '#64748B',
    fontSize: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  errorDesc: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#090A0F',
    fontWeight: '800',
    fontSize: 14,
  },
});
