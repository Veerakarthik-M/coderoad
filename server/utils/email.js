// Email utility using nodemailer
// Configure via environment variables:
//   EMAIL_USER   — Gmail address (e.g. yourapp@gmail.com)
//   EMAIL_PASS   — Gmail App Password (NOT your Gmail password)
//                  Generate at: Google Account → Security → 2FA → App Passwords
//   EMAIL_FROM   — Sender name/address (optional, defaults to EMAIL_USER)
//
// If EMAIL_USER is not set, OTPs are printed to the server console only (demo mode).

import nodemailer from 'nodemailer';

function createTransporter() {
  if (!process.env.EMAIL_USER) {
    return null; // Demo mode — no transporter
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const transporter = createTransporter();

/**
 * Send a 6-digit OTP to the given email address.
 * @returns {string} The OTP (so it can be stored in DB for verification)
 */
export async function sendOTP(toEmail, purpose = 'registration') {
  const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits

  const subject = purpose === 'registration'
    ? 'ANAVANDI — Email Verification Code'
    : 'ANAVANDI — One-Time Password';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="background: #2563eb; color: white; width: 44px; height: 44px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 800;">A</div>
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 12px 0 4px; color: #0d1117;">ANAVANDI</h1>
        <p style="color: #5c6b82; font-size: 0.875rem; margin: 0;">Kerala Digital Student Concession Pass</p>
      </div>

      <div style="background: white; border-radius: 8px; padding: 28px 24px; border: 1px solid #e2e8f0;">
        <p style="color: #374151; margin-top: 0;">Your email verification code for ANAVANDI student registration:</p>
        
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; background: #f0f9ff; border: 2px dashed #2563eb; border-radius: 8px; padding: 16px 32px; font-size: 2rem; font-weight: 800; letter-spacing: 0.3em; color: #1e40af; font-family: monospace;">
            ${otp}
          </span>
        </div>
        
        <p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0;">
          This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
          If you did not request this, please ignore this email.
        </p>
      </div>

      <p style="text-align: center; color: #9ba8bb; font-size: 0.75rem; margin-top: 20px; margin-bottom: 0;">
        Kerala State Road Transport Corporation · ANAVANDI Platform
      </p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"ANAVANDI" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      html,
    });
    console.log(`📧 OTP sent to ${toEmail}`);
  } else {
    // Demo mode — print to console
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📧 DEMO MODE — OTP for ${toEmail}: ${otp}`);
    console.log(`${'='.repeat(50)}\n`);
  }

  return otp;
}
