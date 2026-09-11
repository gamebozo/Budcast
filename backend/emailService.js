import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Configuration from environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Budcast Early Access <welcome@budcast.live>';

let resendClient = null;
if (RESEND_API_KEY) {
  resendClient = new Resend(RESEND_API_KEY);
}

let smtpTransporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  smtpTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

/**
 * Generate responsive dark-mode VIP pass HTML email template
 */
export function generateWelcomeEmailHtml({ email, queueNumber, referralCode, role = 'Host' }) {
  const shareUrl = `http://localhost:4000/landing/?ref=${referralCode}`;
  const vipPassCode = `VIP-BC-${queueNumber}-${referralCode.slice(0, 4).toUpperCase()}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Budcast VIP Early Access Pass</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #030712; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #0B1120; border: 1px solid #1E293B; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 242, 254, 0.15);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header with Neon Glow -->
          <tr>
            <td style="background: linear-gradient(135deg, #090D1A 0%, #1E1B4B 100%); padding: 36px 30px 28px; text-align: center; border-bottom: 1px solid rgba(56, 189, 248, 0.2);">
              <div style="display: inline-block; background: rgba(56, 189, 248, 0.12); border: 1px solid #00F2FE; color: #00F2FE; font-size: 11px; font-weight: 800; letter-spacing: 2px; padding: 6px 16px; border-radius: 999px; text-transform: uppercase; margin-bottom: 14px;">
                ★ Official VIP Early Pass ★
              </div>
              <h1 style="font-size: 32px; font-weight: 900; letter-spacing: -0.5px; color: #FFFFFF; margin: 0 0 6px;">
                🎧 Budcast
              </h1>
              <p style="color: #94A3B8; font-size: 14px; margin: 0; font-weight: 500;">
                Sub-Millisecond Multi-Earbud Audio & Silent Disco
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px 24px;">
              <p style="font-size: 16px; line-height: 1.6; color: #E2E8F0; margin: 0 0 20px;">
                Hey there! 👋<br>
                Welcome to the future of shared sound. Your VIP reservation for <strong>Budcast</strong> is confirmed.
              </p>

              <!-- VIP Boarding Pass Card -->
              <div style="background: linear-gradient(135deg, #0F172A 0%, #111827 100%); border: 2px dashed #00F2FE; border-radius: 16px; padding: 26px 20px; text-align: center; margin: 20px 0;">
                <div style="color: #94A3B8; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">
                  Your Reserved Queue Position
                </div>
                <div style="font-size: 48px; font-weight: 900; color: #00F2FE; letter-spacing: -1px; margin: 6px 0; text-shadow: 0 0 25px rgba(0, 242, 254, 0.5);">
                  #${queueNumber}
                </div>
                <div style="display: inline-block; background: rgba(245, 158, 11, 0.15); border: 1px solid #F59E0B; color: #FBBF24; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                  ${role.toUpperCase()} TIER PASS
                </div>

                <!-- Unique VIP Code Box -->
                <div style="background: #030712; border: 1px solid #38BDF8; border-radius: 10px; padding: 12px; margin: 0 auto; max-width: 320px;">
                  <div style="font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                    🔑 Your Unique VIP Pass Code
                  </div>
                  <div style="font-size: 20px; font-weight: 900; color: #FFFFFF; letter-spacing: 3px; font-family: monospace;">
                    ${vipPassCode}
                  </div>
                  <div style="font-size: 11px; color: #38BDF8; margin-top: 4px;">
                    Save this code to claim your Founder Status in-app
                  </div>
                </div>

                <div style="margin-top: 14px; font-size: 12px; color: #64748B;">
                  Registered to: <strong style="color: #CBD5E1;">${email}</strong>
                </div>
              </div>

              <!-- Why I Built Budcast Note -->
              <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%); border-left: 3px solid #00F2FE; border-radius: 8px 12px 12px 8px; padding: 16px 18px; margin-bottom: 22px;">
                <div style="font-size: 11px; font-weight: 800; color: #00F2FE; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                  💡 A Note from the Creator: Why I Built Budcast
                </div>
                <p style="font-size: 13px; color: #CBD5E1; line-height: 1.6; margin: 0;">
                  "I built Budcast because sharing audio with friends in the same room was broken. Whether watching a late-night movie or throwing a rooftop party without noise complaints, you shouldn't have to share dirty earbuds or rent \$3,000+ clunky gear. With Budcast, everyone uses their own earbuds in microsecond sync — 100% offline, zero hardware required."
                </p>
              </div>

              <!-- Target Release Schedule / Roadmap -->
              <div style="background: #0F172A; border: 1px solid #334155; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
                <h3 style="font-size: 13px; font-weight: 800; color: #F59E0B; text-transform: uppercase; letter-spacing: 1.2px; margin: 0 0 14px;">
                  🗓️ Expected Release Schedule
                </h3>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding: 6px 0; vertical-align: top; width: 30px;">
                      <span style="font-size: 16px;">🎯</span>
                    </td>
                    <td style="padding: 6px 0; font-size: 13px; color: #CBD5E1; line-height: 1.5;">
                      <strong style="color: #FFFFFF;">October 2026:</strong> Closed Beta Early Access rolling out in weekly VIP waves (#1001+).
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; vertical-align: top; width: 30px;">
                      <span style="font-size: 16px;">🌍</span>
                    </td>
                    <td style="padding: 6px 0; font-size: 13px; color: #CBD5E1; line-height: 1.5;">
                      <strong style="color: #FFFFFF;">Early 2027:</strong> Official Public Launch on iOS App Store, Google Play Store, and Desktop.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Unlocked Perks Section -->
              <div style="background: #090D1A; border: 1px solid #1E293B; border-radius: 14px; padding: 22px; margin-bottom: 24px;">
                <h3 style="font-size: 13px; font-weight: 800; color: #38BDF8; text-transform: uppercase; letter-spacing: 1.2px; margin: 0 0 14px;">
                  🚀 Your Early Adopter Perks
                </h3>
                
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding: 6px 0; vertical-align: top; width: 26px;">
                      <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span>
                    </td>
                    <td style="padding: 6px 0; font-size: 13px; color: #CBD5E1; line-height: 1.5;">
                      <strong style="color: #FFFFFF;">Priority Closed Beta Invite:</strong> Direct install link sent straight to your inbox before the public.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; vertical-align: top; width: 26px;">
                      <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span>
                    </td>
                    <td style="padding: 6px 0; font-size: 13px; color: #CBD5E1; line-height: 1.5;">
                      <strong style="color: #FFFFFF;">Permanent Custom Handle:</strong> Lock your DJ or host moniker before anyone else.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; vertical-align: top; width: 26px;">
                      <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span>
                    </td>
                    <td style="padding: 6px 0; font-size: 13px; color: #CBD5E1; line-height: 1.5;">
                      <strong style="color: #FFFFFF;">Founder Gold Badge:</strong> Verified Early Supporter badge visible in every broadcast channel.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; vertical-align: top; width: 26px;">
                      <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span>
                    </td>
                    <td style="padding: 6px 0; font-size: 13px; color: #CBD5E1; line-height: 1.5;">
                      <strong style="color: #FFFFFF;">VIP Engineering Channel:</strong> Direct line to our team to request custom features.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- How to Redeem on Launch Day -->
              <div style="background: linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 14px; padding: 20px; margin-bottom: 24px;">
                <h3 style="font-size: 13px; font-weight: 800; color: #818CF8; text-transform: uppercase; letter-spacing: 1.2px; margin: 0 0 12px;">
                  📲 How to Redeem on Launch Day
                </h3>
                <div style="font-size: 13px; color: #CBD5E1; line-height: 1.6;">
                  1. Open the <strong>Budcast</strong> app when your invitation email arrives.<br>
                  2. Enter your VIP Pass Code: <strong style="color: #00F2FE; font-family: monospace;">${vipPassCode}</strong><br>
                  3. Your account is automatically upgraded with Founder status!
                </div>
              </div>

              <!-- Referral / Skip Queue Callout -->
              <div style="background: rgba(0, 242, 254, 0.05); border: 1px solid rgba(0, 242, 254, 0.25); border-radius: 14px; padding: 22px; text-align: center;">
                <div style="font-size: 15px; font-weight: 800; color: #FFFFFF; margin-bottom: 6px;">
                  🔥 Want to Move Closer to Beta Wave 1?
                </div>
                <p style="font-size: 13px; color: #94A3B8; line-height: 1.5; margin: 0 0 14px;">
                  Every friend who joins using your VIP referral code moves you <strong style="color: #00F2FE;">10 positions closer</strong> to the front of the line!
                </p>
                <div style="background: #030712; border: 1px solid #1E293B; padding: 10px 14px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #00F2FE; margin-bottom: 14px; word-break: break-all;">
                  ${shareUrl}
                </div>
                <div>
                  <a href="${shareUrl}" style="display: inline-block; background: linear-gradient(135deg, #00F2FE 0%, #4FACFE 100%); color: #030712 !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 900; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(0, 242, 254, 0.3);">
                    Invite Friends & Boost Priority
                  </a>
                </div>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #080D1A; padding: 24px 28px; border-top: 1px solid #1E293B; text-align: center; color: #64748B; font-size: 12px; line-height: 1.6;">
              <strong style="color: #94A3B8;">Budcast Studio</strong> — Silent Disco & Multi-Earbud Broadcast<br>
              You received this email because you signed up for early access at <a href="http://localhost:4000/landing/" style="color: #00F2FE; text-decoration: none;">budcast.live</a>.<br>
              © ${new Date().getFullYear()} Budcast. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Send Early Access VIP Welcome Email
 */
export async function sendWelcomeEmail({ email, queueNumber, referralCode, role = 'Host' }) {
  const subject = `🎧 You're In! Your Budcast VIP Queue Pass (#${queueNumber})`;
  const html = generateWelcomeEmailHtml({ email, queueNumber, referralCode, role });

  // 1. Resend Provider
  if (resendClient) {
    try {
      const response = await resendClient.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject,
        html,
      });
      console.log(`[Resend] Welcome email dispatched to ${email}:`, response);
      return { success: true, provider: 'resend', response };
    } catch (err) {
      console.error('[Resend Error]:', err.message);
    }
  }

  // 2. Brevo Provider
  if (BREVO_API_KEY) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'Budcast', email: FROM_EMAIL.replace(/.*<(.+)>/, '$1') || 'welcome@budcast.live' },
          to: [{ email }],
          subject,
          htmlContent: html
        })
      });
      const data = await response.json();
      console.log(`[Brevo] Welcome email dispatched to ${email}:`, data);
      return { success: true, provider: 'brevo', response: data };
    } catch (err) {
      console.error('[Brevo Error]:', err.message);
    }
  }

  // 3. Custom SMTP / Nodemailer Provider
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: FROM_EMAIL,
        to: email,
        subject,
        html,
      });
      console.log(`[SMTP] Welcome email dispatched to ${email}:`, info.messageId);
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.error('[SMTP Error]:', err.message);
    }
  }

  // 4. Local Development Console Fallback
  console.log('====================================================');
  console.log(`📨 [DEV EMAIL SIMULATOR]`);
  console.log(`To: ${email}`);
  console.log(`Subject: ${subject}`);
  console.log(`VIP Queue: #${queueNumber} | Referral Code: ${referralCode}`);
  console.log(`Status: Successfully captured subscriber (Add RESEND_API_KEY to .env for live sending)`);
  console.log('====================================================');

  return {
    success: true,
    provider: 'dev_simulator',
    note: 'Email simulated in development mode. Add RESEND_API_KEY to .env for live inbox delivery.'
  };
}
