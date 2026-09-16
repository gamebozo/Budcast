import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { getHostId, setActivePlan, ActivePlanData } from './hostStorage';
import { getApiBaseUrl } from './apiConfig';

declare global {
  interface Window {
    Razorpay: any;
  }
}


/**
 * Dynamically load Razorpay standard checkout script on Web
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return resolve(false);
    }
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface CheckoutOptions {
  planId: 'pro' | 'business';
  planName: string;
  billingCycle: 'monthly' | 'yearly';
  onSuccess: (data: { subscription: any; message: string }) => void;
  onError: (error: string) => void;
  onDismiss?: () => void;
}

/**
 * Initiate Razorpay checkout process
 */
export async function startRazorpayCheckout({
  planId,
  planName,
  billingCycle,
  onSuccess,
  onError,
  onDismiss,
}: CheckoutOptions) {
  try {
    const hostId = getHostId();

    // 1. Create Order via Backend
    const response = await fetch(`${getApiBaseUrl()}/api/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId,
        billingCycle,
        hostId,
      }),
    });

    const orderData = await response.json();

    if (!response.ok || !orderData.orderId) {
      throw new Error(orderData.error || 'Failed to initialize payment order');
    }

    // 2. Web Browser Checkout via standard Razorpay JS script
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const isLoaded = await loadRazorpayScript();

      if (isLoaded && window.Razorpay) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'Budcast',
          description: `${planName} - ${billingCycle.toUpperCase()} Subscription`,
          image: `${getApiBaseUrl()}/app-icon.png`,
          order_id: orderData.orderId,
          handler: async function (res: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) {
            try {
              // Strict verification with backend
              const verifyRes = await fetch(`${getApiBaseUrl()}/api/payment/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: res.razorpay_order_id || orderData.orderId,
                  paymentId: res.razorpay_payment_id,
                  signature: res.razorpay_signature,
                  hostId,
                  planId,
                  billingCycle,
                }),
              });

              const verifyData = await verifyRes.json();

              if (!verifyRes.ok || !verifyData.success) {
                throw new Error(verifyData.error || 'Payment signature verification failed');
              }

              // ONLY activate when server confirms verification
              setActivePlan({
                planId,
                planName,
                billingCycle,
                activatedAt: new Date().toISOString(),
                expiresAt: verifyData.subscription?.expires_at,
              });

              onSuccess(verifyData);
            } catch (err: any) {
              onError(err.message || 'Payment verification failed');
            }
          },
          prefill: {
            name: 'Budcast Host',
            email: 'host@budcast.live',
            contact: '9999999999',
          },
          theme: {
            color: '#38BDF8',
          },
          modal: {
            ondismiss: function () {
              if (onDismiss) onDismiss();
              onError('Payment window was closed');
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (res: any) {
          onError(res.error?.description || 'Payment transaction failed');
        });
        rzp.open();
        return;
      }
    }

    return orderData;
  } catch (err: any) {
    console.error('[Razorpay Checkout Error]:', err);
    onError(err.message || 'Payment failed to initialize');
  }
}

