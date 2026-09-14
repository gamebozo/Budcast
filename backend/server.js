import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { 
  saveRoomRecord, logEvent, saveUserJoin, getRecentRooms, getRecentListeners, clearAllHistory,
  addPrelaunchSubscriber, getPrelaunchSubscriberByEmail, getPrelaunchStats, verifyVipCode
} from './db.js';
import { createOrder, verifyPayment, getHostSubscription, getHostPayments, PLAN_PRICING } from './payment.js';
import { sendWelcomeEmail } from './emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Function to find local IPv4 network address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    if (!iface) continue;
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && !alias.internal && alias.address !== '127.0.0.1') {
        return alias.address;
      }
    }
  }
  return '127.0.0.1';
}

const app = express();
const server = http.createServer(app);

// Disable fingerprinting headers
app.disable('x-powered-by');

// Apply Security HTTP Headers via Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Allows flexible cross-origin media playback
}));

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 4000;
const localIp = getLocalIpAddress();

// Rate Limiters to prevent DoS / Brute Force
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Max 500 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Max 30 file uploads per 15 min
  message: { error: 'Upload rate limit reached. Please wait before uploading more files.' }
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Max 50 payment order attempts per 15 min
  message: { error: 'Too many payment requests, please try again later.' }
});

const prelaunchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Max 30 prelaunch registrations per 15 min per IP
  message: { error: 'Too many registration attempts. Please try again later.' }
});

const vipVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Max 10 verification attempts per 15 min per IP to prevent brute-forcing
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many verification attempts. Please wait 15 minutes before trying again.' }
});

app.use(cors());
app.use(express.json({ limit: '5mb' })); // Protect against large JSON payload memory exhaustion
app.use(apiLimiter);

// Serve Prelaunch Landing Website statically from root / and /landing
let landingDir = path.join(__dirname, '../landing');
if (!fs.existsSync(landingDir)) {
  landingDir = path.join(__dirname, 'landing');
}
if (fs.existsSync(landingDir)) {
  app.use(express.static(landingDir));
  app.use('/landing', express.static(landingDir));
  app.get('/', (req, res) => {
    res.sendFile(path.join(landingDir, 'index.html'));
  });
}

// Secure Static Uploads Serving
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'; media-src 'self' http: https: blob: data:;");
  next();
}, express.static(uploadsDir));

// Serve official Budcast App Icon for Razorpay modal & external integrations
app.get(['/app-icon.png', '/assets/icon.png', '/assets/images/icon.png'], (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'app-icon.png'));
});

// Allowed Safe Media Formats Whitelist
const ALLOWED_EXTENSIONS = new Set([
  '.mp4', '.m4v', '.webm', '.mov', '.mkv', '.ogg',
  '.mp3', '.wav', '.aac', '.m4a', '.flac'
]);

const ALLOWED_MIME_TYPES = new Set([
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/ogg',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/flac',
  'audio/x-m4a', 'audio/mp4', 'application/octet-stream'
]);

// Secure Multer storage with sanitized random filenames and strict file filters
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.bin';
    const randomHex = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${randomHex}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max file size
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Explicitly block all dangerous executable & script extensions
    const dangerousExts = [
      '.exe', '.bat', '.cmd', '.sh', '.php', '.phtml', '.js', '.mjs',
      '.py', '.pl', '.cgi', '.html', '.htm', '.svg', '.vbs', '.dll',
      '.scr', '.jar', '.zip', '.tar', '.gz', '.ps1', '.jsp', '.asp'
    ];
    
    if (dangerousExts.includes(ext) || !ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error('Invalid file type! Only video and audio media files (.mp4, .mkv, .mp3, .wav, .aac, .webm) are allowed.'));
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype) && !file.mimetype.startsWith('video/') && !file.mimetype.startsWith('audio/')) {
      return cb(new Error('Invalid file MIME type! Please upload a valid video or audio recording.'));
    }

    cb(null, true);
  }
});

// Built-in presets for instant testing
const DEMO_PRESETS = [
  {
    id: 'demo-movie',
    title: 'Big Buck Bunny (Demo Movie 720p)',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: 596
  },
  {
    id: 'demo-elephants',
    title: 'Elephants Dream (Sci-Fi Animation)',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration: 653
  },
  {
    id: 'demo-music-pop',
    title: 'Silent Disco Channel 1: High Energy Pop',
    type: 'audio',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 372
  },
  {
    id: 'demo-music-edm',
    title: 'Silent Disco Channel 2: Club Beats',
    type: 'audio',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: 423
  },
  {
    id: 'demo-music-chill',
    title: 'Silent Disco Channel 3: Chill Lofi',
    type: 'audio',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: 345
  }
];

// In-Memory Active Room Store for sub-millisecond sync
const activeRooms = new Map();

function generateRoomPin() {
  let pin;
  do {
    pin = Math.floor(1000 + Math.random() * 9000).toString();
  } while (activeRooms.has(pin));
  return pin;
}

// REST API Endpoints
app.get('/api/info', (req, res) => {
  res.json({
    status: 'online',
    serverTime: Date.now(),
    localIp,
    port: PORT,
    activeRoomCount: activeRooms.size
  });
});

app.get('/api/presets', (req, res) => {
  res.json(DEMO_PRESETS);
});

// Broadcast & Listeners History Endpoints
app.get('/api/history/rooms', async (req, res) => {
  try {
    const hostId = req.query.hostId || null;
    const rooms = await getRecentRooms(30, hostId);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history/listeners', async (req, res) => {
  try {
    const hostId = req.query.hostId || null;
    const listeners = await getRecentListeners(50, hostId);
    res.json(listeners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/history/clear', async (req, res) => {
  try {
    const result = await clearAllHistory();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/history/clear', async (req, res) => {
  try {
    const result = await clearAllHistory();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Razorpay Payment & Subscription Endpoints
// ==========================================

// 1. Get Plan Pricing Matrix
app.get('/api/payment/plans', (req, res) => {
  res.json({ success: true, plans: PLAN_PRICING });
});

// 2. Create Razorpay Order (Protected with Rate Limiter)
app.post('/api/payment/create-order', paymentLimiter, async (req, res) => {
  try {
    const { planId, billingCycle, hostId } = req.body;
    if (!planId || typeof planId !== 'string') {
      return res.status(400).json({ error: 'Valid planId is required' });
    }
    const safeBilling = (billingCycle === 'monthly' || billingCycle === 'yearly') ? billingCycle : 'yearly';
    const safeHostId = (typeof hostId === 'string' && hostId.length <= 100) ? hostId.trim() : 'anonymous';
    
    const orderData = await createOrder({ planId, billingCycle: safeBilling, hostId: safeHostId });
    res.json(orderData);
  } catch (err) {
    console.error('[Payment Create Order Error]:', err.message);
    res.status(500).json({ error: 'Failed to create payment order. Please try again.' });
  }
});

// 3. Verify Payment Signature & Activate Tier
app.post('/api/payment/verify', paymentLimiter, async (req, res) => {
  try {
    const { orderId, paymentId, signature, hostId, planId, billingCycle } = req.body;
    if (!orderId || !paymentId) {
      return res.status(400).json({ error: 'orderId and paymentId are required' });
    }

    const verificationResult = await verifyPayment({
      orderId: String(orderId).trim(),
      paymentId: String(paymentId).trim(),
      signature: signature ? String(signature).trim() : '',
      hostId: hostId ? String(hostId).trim() : 'default-host',
      planId: planId ? String(planId).trim() : 'pro',
      billingCycle: (billingCycle === 'monthly' || billingCycle === 'yearly') ? billingCycle : 'yearly'
    });
    res.json(verificationResult);
  } catch (err) {
    console.error('[Payment Verify Error]:', err.message);
    res.status(400).json({ error: err.message || 'Payment verification failed' });
  }
});

// 4. Fetch Host Active Subscription
app.get('/api/payment/subscription', async (req, res) => {
  try {
    const hostId = (typeof req.query.hostId === 'string' && req.query.hostId.length <= 100)
      ? req.query.hostId.trim()
      : 'default-host';
    const sub = await getHostSubscription(hostId);
    res.json({ success: true, subscription: sub });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// 5. Fetch Payment Logs for Host
app.get('/api/payment/history', async (req, res) => {
  try {
    const hostId = (typeof req.query.hostId === 'string' && req.query.hostId.length <= 100)
      ? req.query.hostId.trim()
      : 'default-host';
    const history = await getHostPayments(hostId);
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// 6. Hosted Mobile & Web Razorpay Checkout Page
app.get('/checkout', (req, res) => {
  const { orderId, planId, planName, amount, billingCycle, hostId } = req.query;
  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_live_TYztip7UZ116H1';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Budcast Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 20px;
      background: #090A0F; color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center; min-height: 100vh;
    }
    .card {
      background: #0F172A; border-radius: 24px; padding: 28px;
      border: 1px solid rgba(255, 255, 255, 0.1); width: 100%; max-width: 400px;
      text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .badge {
      display: inline-block; background: rgba(56, 189, 248, 0.15);
      color: #38BDF8; padding: 4px 12px; border-radius: 20px;
      font-size: 11px; font-weight: 800; margin-bottom: 12px;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    h2 { margin: 0 0 6px 0; font-size: 22px; font-weight: 900; }
    .price { font-size: 32px; font-weight: 900; color: #38BDF8; margin: 16px 0; }
    .btn {
      width: 100%; padding: 16px; border-radius: 14px;
      background: #38BDF8; color: #090A0F; font-size: 15px; font-weight: 900;
      border: none; cursor: pointer; transition: transform 0.1s; margin-top: 10px;
    }
    .btn:active { transform: scale(0.98); }
    .status { margin-top: 16px; font-size: 13px; color: #94A3B8; }
  </style>
</head>
<body>
  <div class="card" id="mainCard">
    <div class="badge">SECURE RAZORPAY CHECKOUT</div>
    <h2>${escapeHtml(planName || 'Budcast Upgrade')}</h2>
    <div class="price">₹${Math.round((Number(amount) || 79900) / 100)}</div>
    <p style="color:#94A3B8; font-size:12px; margin:0 0 16px 0;">${escapeHtml((billingCycle || 'yearly')).toUpperCase()} BILLING • INSTANT ACTIVATION</p>
    
    <button class="btn" id="payBtn" onclick="launchCheckout()">Pay with UPI / Card / QR</button>
    <div class="status" id="statusText">Tap above if payment window does not open automatically.</div>
  </div>

  <script>
    function launchCheckout() {
      const options = {
        key: '${keyId}',
        amount: '${amount || 79900}',
        currency: 'INR',
        name: 'Budcast',
        description: '${escapeHtml(planName || 'Pro Plan')} Subscription',
        order_id: '${orderId || ''}',
        handler: async function(response) {
          document.getElementById('statusText').innerText = 'Verifying payment with Budcast server...';
          try {
            const res = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: response.razorpay_order_id || '${orderId}',
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                hostId: '${hostId || 'default-host'}',
                planId: '${planId || 'pro'}',
                billingCycle: '${billingCycle || 'yearly'}'
              })
            });
            const data = await res.json();
            if (res.ok) {
              document.getElementById('mainCard').innerHTML = '<h2 style="color:#10B981;">🎉 Payment Verified!</h2><p style="color:#CBD5E1; margin: 12px 0 20px 0;">Your plan is now active!</p><button class="btn" style="background:#10B981; color:#FFF;" onclick="finishAndClose()">Return to App</button>';
              setTimeout(finishAndClose, 1800);
            } else {
              document.getElementById('statusText').innerText = data.error || 'Verification failed. Please retry.';
            }
          } catch (e) {
            document.getElementById('statusText').innerText = 'Network error verifying payment.';
          }
        },
        prefill: { name: 'Budcast User', email: 'host@budcast.live', contact: '9999999999' },
        theme: { color: '#38BDF8' },
        modal: {
          ondismiss: function() {
            document.getElementById('statusText').innerText = 'Payment window was closed.';
          }
        }
      };

      if (window.Razorpay) {
        const rzp = new Razorpay(options);
        rzp.open();
      }
    }

    function finishAndClose() {
      window.location.href = 'budcast://payment-success?planId=${planId || 'pro'}&status=success';
    }

    window.onload = function() {
      setTimeout(launchCheckout, 400);
    };
  </script>
</body>
</html>`;
  res.send(html);
});

// ==========================================
// Prelaunch Waitlist & Registration Endpoints
// ==========================================

// 1. Prelaunch Lead Registration Route
app.post('/api/prelaunch/register', prelaunchLimiter, async (req, res) => {
  try {
    const { email, name, role, platform, ref } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address format.' });
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const ipHash = crypto.createHash('sha256').update(String(ip)).digest('hex').substring(0, 16);

    const safeRole = (['Host', 'DJ', 'Cinema', 'Tester'].includes(role)) ? role : 'Host';
    const safePlatform = (['All', 'iOS', 'Android', 'Web'].includes(platform)) ? platform : 'All';
    const safeName = (typeof name === 'string' && name.length <= 80) ? name.trim() : null;
    const safeRef = (typeof ref === 'string' && ref.length <= 30) ? ref.trim() : null;

    const result = await addPrelaunchSubscriber({
      email: email.trim(),
      name: safeName,
      role: safeRole,
      platform: safePlatform,
      referredBy: safeRef,
      ipHash
    });

    // Send VIP early access pass confirmation asynchronously
    sendWelcomeEmail({
      email: result.subscriber.email,
      queueNumber: result.subscriber.queue_number,
      referralCode: result.subscriber.referral_code,
      role: result.subscriber.role
    }).catch(err => console.error('[Prelaunch Email Background Error]:', err.message));

    res.json({
      success: true,
      isExisting: result.isExisting,
      message: result.isExisting 
        ? "You're already on our VIP early access list! We resent your VIP pass."
        : "🎉 You've successfully claimed your VIP Early Access Pass!",
      subscriber: {
        email: result.subscriber.email,
        name: result.subscriber.name,
        queue_number: result.subscriber.queue_number,
        referral_code: result.subscriber.referral_code,
        role: result.subscriber.role,
        platform: result.subscriber.platform
      }
    });
  } catch (err) {
    console.error('[Prelaunch Register Error]:', err.message);
    res.status(500).json({ error: 'Failed to process registration. Please try again.' });
  }
});

// 2. Prelaunch Live Stats Route
app.get('/api/prelaunch/stats', async (req, res) => {
  try {
    const stats = await getPrelaunchStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prelaunch stats' });
  }
});

// 3. Prelaunch In-App VIP Code Redemption Endpoint
app.post('/api/prelaunch/verify-vip', vipVerifyLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Please enter a valid VIP Pass Code' });
    }

    const verification = await verifyVipCode(code);
    if (!verification.valid) {
      return res.status(400).json({ success: false, error: verification.error || 'Invalid VIP Pass Code' });
    }

    res.json({
      success: true,
      message: '🎉 VIP Pass Verified! Welcome, Founder!',
      subscriber: verification.subscriber,
      badge: verification.badge || 'Founder Gold',
      perks: [
        'Verified Gold Founder Badge in-app',
        '3-Channel Silent Disco Stage Access',
        'Up to 50 Simultaneous Listeners in Beta',
        'Zero-Latency Phase Lock Engine',
        'Direct Feature Request Channel'
      ]
    });
  } catch (err) {
    console.error('[VIP Verify Error]:', err.message);
    res.status(500).json({ success: false, error: 'Failed to verify VIP Pass' });
  }
});

// Upload media file with strict upload rate limiter & validation
app.post('/api/upload', uploadLimiter, (req, res, next) => {
  upload.single('media')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large! Maximum allowed size is 500MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message || 'File upload rejected for security reasons.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No valid media file provided' });
    }

    const safeTitle = (req.body.title && typeof req.body.title === 'string')
      ? req.body.title.substring(0, 120).trim()
      : path.parse(req.file.originalname).name;

    const fileUrl = `http://${localIp}:${PORT}/uploads/${req.file.filename}`;
    const isVideo = req.file.mimetype.startsWith('video');

    const mediaItem = {
      id: 'upload-' + Date.now(),
      title: safeTitle,
      type: isVideo ? 'video' : 'audio',
      url: fileUrl,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    };

    res.json(mediaItem);
  });
});

// Real-time Socket.IO Engine
io.on('connection', (socket) => {
  let currentRoomId = null;
  let isHost = false;

  // 1. NTP Sub-millisecond Time Synchronization Protocol
  socket.on('ntp_ping', (data) => {
    const serverReceiveTime = Date.now();
    socket.emit('ntp_pong', {
      clientSendTime: data?.clientSendTime || 0,
      serverReceiveTime,
      serverSendTime: Date.now()
    });
  });

  // 2. Create Room (Host)
  socket.on('create_room', (options, callback) => {
    const roomId = (options && options.pin) ? options.pin.toString() : generateRoomPin();
    const mode = options?.mode || 'video'; // 'video' or 'audio'
    const initialMedia = options?.media || DEMO_PRESETS[0];

    const room = {
      id: roomId,
      title: options?.title || (mode === 'video' ? 'Movie Room' : 'Silent Disco'),
      mode,
      hostSocketId: socket.id,
      media: initialMedia,
      playbackState: {
        isPlaying: false,
        currentTime: 0,
        playbackRate: 1,
        lastUpdatedServerTime: Date.now()
      },
      channel: 'red',
      channels: {
        red: options?.channels?.red || DEMO_PRESETS[2],
        blue: options?.channels?.blue || DEMO_PRESETS[3],
        green: options?.channels?.green || DEMO_PRESETS[4]
      },
      listeners: new Map(),
      hostId: options?.hostId || '',
      createdAt: Date.now()
    };

    activeRooms.set(roomId, room);
    currentRoomId = roomId;
    isHost = true;
    socket.join(roomId);

    saveRoomRecord(room);
    logEvent(roomId, 'ROOM_CREATED', { mode, title: room.title });

    console.log(`[Host] Created room ${roomId} (Mode: ${mode})`);

    const hostPayload = {
      roomId,
      localIp,
      port: PORT,
      roomUrl: `http://${localIp}:8081/room/${roomId}`,
      room: {
        ...room,
        listeners: []
      }
    };

    if (callback) callback({ success: true, ...hostPayload });
  });

  // 3. Join Room (Guest)
  socket.on('join_room', ({ roomId, name, device }, callback) => {
    const room = activeRooms.get(roomId);
    if (!room) {
      if (callback) callback({ success: false, error: 'Room not found. Check the 4-digit PIN.' });
      return;
    }

    currentRoomId = roomId;
    isHost = false;
    socket.join(roomId);

    const listenerInfo = {
      socketId: socket.id,
      name: name || `Guest #${Math.floor(100 + Math.random() * 900)}`,
      device: device || 'Mobile Device',
      joinedAt: Date.now()
    };

    room.listeners.set(socket.id, listenerInfo);

    // Calculate current live position if playing
    let calculatedTime = room.playbackState.currentTime;
    if (room.playbackState.isPlaying) {
      const elapsedSec = (Date.now() - room.playbackState.lastUpdatedServerTime) / 1000;
      calculatedTime += elapsedSec * room.playbackState.playbackRate;
    }

    // Notify room of updated listener count
    io.to(roomId).emit('listener_count_update', {
      count: room.listeners.size,
      listeners: Array.from(room.listeners.values())
    });

    logEvent(roomId, 'GUEST_JOINED', listenerInfo);
    saveUserJoin(roomId, listenerInfo, room);
    saveRoomRecord(room);
    console.log(`[Guest] Joined room ${roomId} (Total: ${room.listeners.size})`);

    if (callback) {
      callback({
        success: true,
        roomId,
        serverTime: Date.now(),
        mode: room.mode,
        title: room.title,
        media: room.media,
        channel: room.channel,
        channels: room.channels,
        playbackState: {
          ...room.playbackState,
          currentTime: calculatedTime
        },
        listenerCount: room.listeners.size
      });
    }
  });

  // 4. Host Action (Play, Pause, Seek, Change Media, Change Channel)
  socket.on('host_action', (data) => {
    const roomId = data?.roomId ? data.roomId.toString() : currentRoomId;
    const room = activeRooms.get(roomId);
    if (!room || room.hostSocketId !== socket.id) return;

    const action = data.action; // 'PLAY', 'PAUSE', 'SEEK', 'SET_MEDIA', 'CHANGE_CHANNEL', 'SET_RATE'
    const now = Date.now();

    if (action === 'PLAY') {
      // Buffer window of 250ms so all devices start at the EXACT same scheduled timestamp
      const scheduledStartServerTime = now + (data.delay || 250);
      room.playbackState.isPlaying = true;
      room.playbackState.currentTime = data.currentTime || room.playbackState.currentTime;
      room.playbackState.lastUpdatedServerTime = scheduledStartServerTime;

      io.to(room.id).emit('sync_event', {
        action: 'PLAY',
        scheduledStartServerTime,
        currentTime: room.playbackState.currentTime,
        serverTime: now,
        playbackRate: room.playbackState.playbackRate
      });
    } else if (action === 'PAUSE') {
      room.playbackState.isPlaying = false;
      room.playbackState.currentTime = data.currentTime || room.playbackState.currentTime;
      room.playbackState.lastUpdatedServerTime = now;

      io.to(room.id).emit('sync_event', {
        action: 'PAUSE',
        currentTime: room.playbackState.currentTime,
        serverTime: now
      });
    } else if (action === 'SEEK') {
      const scheduledStartServerTime = room.playbackState.isPlaying ? now + (data.delay || 250) : now;
      room.playbackState.currentTime = data.currentTime;
      room.playbackState.lastUpdatedServerTime = scheduledStartServerTime;

      io.to(room.id).emit('sync_event', {
        action: 'SEEK',
        currentTime: data.currentTime,
        scheduledStartServerTime,
        isPlaying: room.playbackState.isPlaying,
        serverTime: now
      });
    } else if (action === 'SET_MEDIA') {
      room.media = data.media;
      room.playbackState.currentTime = 0;
      room.playbackState.isPlaying = false;
      room.playbackState.lastUpdatedServerTime = now;

      io.to(room.id).emit('sync_event', {
        action: 'SET_MEDIA',
        media: data.media,
        serverTime: now
      });
    } else if (action === 'CHANGE_CHANNEL') {
      room.channel = data.channel;
      io.to(room.id).emit('sync_event', {
        action: 'CHANGE_CHANNEL',
        channel: data.channel,
        media: room.channels[data.channel],
        serverTime: now
      });
    }

    saveRoomRecord(room);
  });

  // 5. Floating Reaction Emojis
  socket.on('send_reaction', ({ roomId, emoji, senderName }) => {
    if (!roomId) return;
    io.to(roomId).emit('reaction_broadcast', {
      id: Math.random().toString(36).substring(2, 9),
      emoji: emoji || '❤️',
      senderName: senderName || 'Listener',
      timestamp: Date.now()
    });
  });

  // 6. Live Mic Voice Broadcast (Tour guide / Walkie-talkie mode)
  socket.on('live_mic_data', ({ roomId, audioData }) => {
    if (!roomId) return;
    socket.to(roomId).emit('live_mic_broadcast', { audioData });
  });

  // 7. Disconnection handler
  socket.on('disconnect', () => {
    if (currentRoomId) {
      const room = activeRooms.get(currentRoomId);
      if (room) {
        if (isHost) {
          console.log(`[Host] Host left room ${currentRoomId}`);
          io.to(currentRoomId).emit('host_disconnected');
        } else {
          room.listeners.delete(socket.id);
          io.to(currentRoomId).emit('listener_count_update', {
            count: room.listeners.size,
            listeners: Array.from(room.listeners.values())
          });
          console.log(`[Guest] Listener left room ${currentRoomId} (Remaining: ${room.listeners.size})`);
        }
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`🚀 SYNC BACKEND RUNNING ON PORT ${PORT}`);
  console.log(`📡 Local Wi-Fi Network URL: http://${localIp}:${PORT}`);
  console.log(`🔗 Health Check: http://${localIp}:${PORT}/api/info`);
  console.log('====================================================');
});
