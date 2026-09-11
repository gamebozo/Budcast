import crypto from 'crypto';
import { createOrder, verifyPayment, getHostSubscription, PLAN_PRICING } from './payment.js';

async function runTest() {
  console.log('Testing Razorpay backend service...');
  console.log('Available plans:', Object.keys(PLAN_PRICING));

  // 1. Test Order Creation for Pro Plan
  const order = await createOrder({
    planId: 'pro',
    billingCycle: 'yearly',
    hostId: 'test-host-123'
  });

  console.log('Created order:', order);

  if (!order || !order.orderId) {
    throw new Error('Order creation failed');
  }

  // 2. Test Verification with genuine HMAC SHA256 signature
  const testPaymentId = `pay_test_${Date.now()}`;
  const realSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'CX9q1pPoXJ7m8My53P5aXwkA')
    .update(`${order.orderId}|${testPaymentId}`)
    .digest('hex');

  const verifyRes = await verifyPayment({
    orderId: order.orderId,
    paymentId: testPaymentId,
    signature: realSignature,
    hostId: 'test-host-123',
    planId: 'pro',
    billingCycle: 'yearly'
  });

  console.log('Verification result:', verifyRes);

  // 3. Test Fetching Active Subscription
  const sub = await getHostSubscription('test-host-123');
  console.log('Fetched subscription:', sub);

  if (sub && sub.plan_id === 'pro' && sub.status === 'active') {
    console.log('✅ Razorpay payment & subscription test PASSED successfully!');
  } else {
    throw new Error('Subscription verification failed');
  }
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
