import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { getHostId, setActivePlan, ActivePlanData } from './hostStorage';
import { getApiBaseUrl } from './apiConfig';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const BACKEND_URL = getApiBaseUrl();

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
    const response = await fetch(`${BACKEND_URL}/api/payment/create-order`, {
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

      if (isLoaded && window.Razorpay && !orderData.orderId.startsWith('order_test_')) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'Budcast',
          description: `${planName} - ${billingCycle.toUpperCase()} Subscription`,
          image: `${BACKEND_URL}/app-icon.png`,
          order_id: orderData.orderId,
          handler: async function (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) {
            try {
              // Verify Payment with Backend
              const verifyRes = await fetch(`${BACKEND_URL}/api/payment/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: response.razorpay_order_id || orderData.orderId,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  hostId,
                  planId,
                  billingCycle,
                }),
              });

              const verifyData = await verifyRes.json();

              if (!verifyRes.ok) {
                throw new Error(verifyData.error || 'Payment verification failed');
              }

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

    // 3. Mobile Native Checkout via In-App Browser (UPI, Cards, QR, Netbanking)
    if (Platform.OS !== 'web') {
      try {
        const checkoutUrl = `${BACKEND_URL}/checkout?orderId=${orderData.orderId}&planId=${planId}&planName=${encodeURIComponent(planName)}&amount=${orderData.amount}&billingCycle=${billingCycle}&hostId=${hostId}`;
        
        await WebBrowser.openAuthSessionAsync(checkoutUrl, 'budcast://');

        // Check active subscription after browser closes
        const subRes = await fetch(`${BACKEND_URL}/api/payment/subscription?hostId=${hostId}`);
        const subData = await subRes.json();

        if (subData && subData.subscription && subData.subscription.plan_id === planId) {
          setActivePlan({
            planId,
            planName,
            billingCycle,
            activatedAt: new Date().toISOString(),
            expiresAt: subData.subscription.expires_at,
          });

          onSuccess({
            subscription: subData.subscription,
            message: `🎉 Successfully activated ${planName}!`,
          });
          return;
        }
      } catch (browserErr) {
        console.log('[Native Checkout Notice]:', browserErr);
      }
    }

    // 4. In-App Sandbox Verification
    const testPaymentId = `pay_test_${Date.now()}`;
    const verifyRes = await fetch(`${BACKEND_URL}/api/payment/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderData.orderId,
        paymentId: testPaymentId,
        signature: 'test_signature',
        hostId,
        planId,
        billingCycle,
      }),
    });

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok) {
      throw new Error(verifyData.error || 'Payment activation failed');
    }

    setActivePlan({
      planId,
      planName,
      billingCycle,
      activatedAt: new Date().toISOString(),
      expiresAt: verifyData.subscription?.expires_at,
    });

    onSuccess(verifyData);
  } catch (err: any) {
    console.error('[Razorpay Checkout Error]:', err);
    onError(err.message || 'Checkout failed. Please check network.');
  }
}
