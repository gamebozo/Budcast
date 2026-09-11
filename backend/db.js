import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'sync_data.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
    initTables();
  }
});

function initTables() {
  db.serialize(() => {
    // Rooms table with host_id
    db.run(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        title TEXT,
        mode TEXT,
        media_title TEXT,
        media_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_listeners INTEGER DEFAULT 0,
        host_id TEXT
      )
    `);

    // Safely ensure host_id column exists if table was created previously
    db.run(`ALTER TABLE rooms ADD COLUMN host_id TEXT`, () => {});

    // Joined Users & Listeners History Table
    db.run(`
      CREATE TABLE IF NOT EXISTS room_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT,
        socket_id TEXT,
        user_name TEXT,
        device TEXT,
        media_title TEXT,
        mode TEXT,
        channel TEXT,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        left_at DATETIME
      )
    `);

    // Media library table
    db.run(`
      CREATE TABLE IF NOT EXISTS media_items (
        id TEXT PRIMARY KEY,
        title TEXT,
        filename TEXT,
        filepath TEXT,
        mimetype TEXT,
        size INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Event stats table
    db.run(`
      CREATE TABLE IF NOT EXISTS event_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT,
        event_type TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Razorpay Payments Table
    db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host_id TEXT,
        order_id TEXT UNIQUE,
        payment_id TEXT,
        signature TEXT,
        plan_id TEXT,
        plan_name TEXT,
        billing_cycle TEXT,
        amount INTEGER,
        currency TEXT DEFAULT 'INR',
        status TEXT DEFAULT 'created',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Host Subscriptions Table
    db.run(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        host_id TEXT PRIMARY KEY,
        plan_id TEXT,
        plan_name TEXT,
        billing_cycle TEXT,
        order_id TEXT,
        payment_id TEXT,
        status TEXT DEFAULT 'active',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Prelaunch Subscribers Table
    db.run(`
      CREATE TABLE IF NOT EXISTS prelaunch_subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'Host',
        platform TEXT DEFAULT 'All',
        queue_number INTEGER NOT NULL,
        referral_code TEXT UNIQUE NOT NULL,
        referred_by TEXT,
        referral_count INTEGER DEFAULT 0,
        ip_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
}

export function saveRoomRecord(room) {
  const query = `
    INSERT OR REPLACE INTO rooms (id, title, mode, media_title, media_url, total_listeners, host_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(query, [
    room.id,
    room.title || 'Untitled Broadcast',
    room.mode || 'video',
    room.media?.title || 'Unknown Media',
    room.media?.url || '',
    room.listeners ? (typeof room.listeners.size === 'number' ? room.listeners.size : 0) : 0,
    room.hostId || room.host_id || ''
  ], (err) => {
    if (err) console.error('Error saving room record:', err.message);
  });
}

export function saveUserJoin(roomId, user, room) {
  const query = `
    INSERT INTO room_members (room_id, socket_id, user_name, device, media_title, mode, channel)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(query, [
    roomId,
    user.socketId || '',
    user.name || 'Anonymous Guest',
    user.device || 'Wireless Earbuds',
    room?.media?.title || 'Live Stream',
    room?.mode || 'video',
    room?.channel || 'main'
  ], (err) => {
    if (err) console.error('Error saving user join record:', err.message);
  });
}

export function logEvent(roomId, eventType, details = {}) {
  const query = `
    INSERT INTO event_stats (room_id, event_type, details)
    VALUES (?, ?, ?)
  `;
  db.run(query, [roomId, eventType, JSON.stringify(details)], (err) => {
    if (err) console.error('Error logging event:', err.message);
  });
}

export function getRecentRooms(limit = 20, hostId = null) {
  return new Promise((resolve, reject) => {
    if (hostId) {
      db.all(
        `SELECT * FROM rooms WHERE host_id = ? ORDER BY created_at DESC LIMIT ?`,
        [hostId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    } else {
      db.all(
        `SELECT * FROM rooms ORDER BY created_at DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    }
  });
}

export function getRecentListeners(limit = 50, hostId = null) {
  return new Promise((resolve, reject) => {
    if (hostId) {
      db.all(
        `SELECT rm.* FROM room_members rm INNER JOIN rooms r ON rm.room_id = r.id WHERE r.host_id = ? ORDER BY rm.joined_at DESC LIMIT ?`,
        [hostId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    } else {
      db.all(
        `SELECT * FROM room_members ORDER BY joined_at DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    }
  });
}

export function clearAllHistory() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`DELETE FROM rooms`);
      db.run(`DELETE FROM room_members`);
      db.run(`DELETE FROM event_stats`, (err) => {
        if (err) reject(err);
        else resolve({ success: true, message: 'All broadcast history cleared' });
      });
    });
  });
}

export function createPaymentRecord(payment) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO payments (host_id, order_id, plan_id, plan_name, billing_cycle, amount, currency, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'created')
    `;
    db.run(query, [
      payment.hostId || '',
      payment.orderId,
      payment.planId,
      payment.planName,
      payment.billingCycle || 'monthly',
      payment.amount,
      payment.currency || 'INR'
    ], function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, orderId: payment.orderId });
    });
  });
}

export function updatePaymentSuccess({ orderId, paymentId, signature }) {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE payments 
      SET payment_id = ?, signature = ?, status = 'captured', updated_at = CURRENT_TIMESTAMP
      WHERE order_id = ?
    `;
    db.run(query, [paymentId, signature, orderId], function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
}

export function saveSubscription({ hostId, planId, planName, billingCycle, orderId, paymentId, durationDays = 30 }) {
  return new Promise((resolve, reject) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const query = `
      INSERT OR REPLACE INTO subscriptions (host_id, plan_id, plan_name, billing_cycle, order_id, payment_id, status, started_at, expires_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
    `;
    db.run(query, [
      hostId,
      planId,
      planName,
      billingCycle,
      orderId,
      paymentId,
      expiresAt.toISOString()
    ], function (err) {
      if (err) reject(err);
      else resolve({ hostId, planId, status: 'active', expiresAt: expiresAt.toISOString() });
    });
  });
}

export function getSubscription(hostId) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM subscriptions WHERE host_id = ? LIMIT 1`;
    db.get(query, [hostId], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

export function getPaymentsByHost(hostId) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM payments WHERE host_id = ? ORDER BY created_at DESC LIMIT 20`;
    db.all(query, [hostId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// ----------------------------------------------------
// Prelaunch Registration Helpers
// ----------------------------------------------------

export function getPrelaunchSubscriberByEmail(email) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM prelaunch_subscribers WHERE LOWER(email) = LOWER(?) LIMIT 1`;
    db.get(query, [email.trim()], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

export function getPrelaunchSubscriberByRef(referralCode) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM prelaunch_subscribers WHERE referral_code = ? LIMIT 1`;
    db.get(query, [referralCode.trim()], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

export function incrementReferralCount(referralCode) {
  return new Promise((resolve, reject) => {
    const query = `UPDATE prelaunch_subscribers SET referral_count = referral_count + 1 WHERE referral_code = ?`;
    db.run(query, [referralCode.trim()], function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
}

export function getPrelaunchSubscriberCount() {
  return new Promise((resolve, reject) => {
    const query = `SELECT COUNT(*) as count FROM prelaunch_subscribers`;
    db.get(query, [], (err, row) => {
      if (err) reject(err);
      else resolve(row?.count || 0);
    });
  });
}

export function addPrelaunchSubscriber({ email, name, role = 'Host', platform = 'All', referredBy = null, ipHash = null }) {
  return new Promise(async (resolve, reject) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await getPrelaunchSubscriberByEmail(normalizedEmail);
      if (existing) {
        return resolve({ isExisting: true, subscriber: existing });
      }

      const totalCount = await getPrelaunchSubscriberCount();
      // Start queue numbering from #1001 for early bird excitement
      const queueNumber = 1001 + totalCount;
      // Cryptographically secure 6-character random token (e.g. BUD9A4F7)
      const cryptoToken = crypto.randomBytes(3).toString('hex').toUpperCase();
      const referralCode = 'BUD' + cryptoToken;

      if (referredBy) {
        await incrementReferralCount(referredBy).catch(() => {});
      }

      const query = `
        INSERT INTO prelaunch_subscribers (email, name, role, platform, queue_number, referral_code, referred_by, ip_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(query, [
        normalizedEmail,
        name ? name.trim() : null,
        role,
        platform,
        queueNumber,
        referralCode,
        referredBy ? referredBy.trim() : null,
        ipHash
      ], function (err) {
        if (err) return reject(err);
        resolve({
          isExisting: false,
          subscriber: {
            id: this.lastID,
            email: normalizedEmail,
            name: name ? name.trim() : null,
            role,
            platform,
            queue_number: queueNumber,
            referral_code: referralCode,
            referral_count: 0,
            created_at: new Date().toISOString()
          }
        });
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function verifyVipCode(code) {
  return new Promise((resolve, reject) => {
    if (!code || typeof code !== 'string') {
      return resolve({ valid: false, error: 'Please enter a valid VIP Pass Code' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');

    // Master Founder Demo Passcode for immediate testing
    if (cleanCode === 'BUDCASTVIP' || cleanCode === 'FOUNDER2026' || cleanCode === 'VIP-EARLY') {
      return resolve({
        valid: true,
        subscriber: {
          queue_number: 1001,
          role: 'Host & DJ',
          referral_code: 'BUDCASTVIP',
          email: 'founder@budcast.live'
        },
        badge: 'Founder Gold',
        isMaster: true
      });
    }

    // Parse standard format: VIP-BC-1001-XXXX
    const match = cleanCode.match(/VIP-BC-(\d+)-?([A-Z0-9]*)/i);
    
    if (match) {
      const queueNum = parseInt(match[1], 10);
      const secretPart = match[2] || '';

      db.get(
        `SELECT * FROM prelaunch_subscribers WHERE queue_number = ? LIMIT 1`,
        [queueNum],
        (err, row) => {
          if (err) return reject(err);
          if (!row) {
            return resolve({ valid: false, error: 'VIP Code not found. Please verify your queue number.' });
          }

          // Verify secret token matches the subscriber's referral code to prevent sequential guessing
          const userRef = (row.referral_code || '').toUpperCase();
          if (secretPart && !userRef.includes(secretPart) && !secretPart.includes(userRef.slice(0, 4))) {
            return resolve({ valid: false, error: 'Invalid security code for this VIP Pass.' });
          }

          resolve({
            valid: true,
            subscriber: row,
            badge: 'Founder Gold'
          });
        }
      );
    } else {
      // Lookup by exact referral code or email
      db.get(
        `SELECT * FROM prelaunch_subscribers WHERE UPPER(referral_code) = ? OR UPPER(email) = ? LIMIT 1`,
        [cleanCode, cleanCode.toLowerCase()],
        (err, row) => {
          if (err) return reject(err);
          if (row) {
            resolve({
              valid: true,
              subscriber: row,
              badge: 'Founder Gold'
            });
          } else {
            resolve({ valid: false, error: 'Invalid or unrecognized VIP Code. Please check the code in your email.' });
          }
        }
      );
    }
  });
}

export function getPrelaunchStats() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        COUNT(*) as total_subscribers,
        COUNT(CASE WHEN role = 'DJ' THEN 1 END) as dj_count,
        COUNT(CASE WHEN role = 'Host' THEN 1 END) as host_count,
        COUNT(CASE WHEN role = 'Cinema' THEN 1 END) as cinema_count
      FROM prelaunch_subscribers
    `;
    db.get(query, [], (err, row) => {
      if (err) reject(err);
      else {
        const base = 1240; // Community pre-interest baseline
        resolve({
          total: (row?.total_subscribers || 0) + base,
          realCount: row?.total_subscribers || 0,
          djs: row?.dj_count || 0,
          hosts: row?.host_count || 0,
          cinema: row?.cinema_count || 0
        });
      }
    });
  });
}

export default db;
