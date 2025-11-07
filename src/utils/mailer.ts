// src/utils/mailer.ts
import nodemailer from "nodemailer";
import axios from "axios";
import qs from "qs";

const provider = process.env.EMAIL_PROVIDER || "mailtrap";

function createSmtpTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });
}

async function sendViaMailgunApi(to: string, subject: string, html: string) {
  const domain = process.env.MAILGUN_DOMAIN!;
  const apiKey = process.env.MAILGUN_API_KEY!;
  const url = `https://api.mailgun.net/v3/${domain}/messages`;
  const data = qs.stringify({
    from: process.env.SMTP_EMAIL || `no-reply@${domain}`,
    to,
    subject,
    html,
  });
  const auth = { username: "api", password: apiKey };
  const res = await axios.post(url, data, {
    auth,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return res.data;
}

export async function sendMail(to: string, subject: string, html: string) {
  if (
    provider === "mailgun_api" &&
    process.env.MAILGUN_API_KEY &&
    process.env.MAILGUN_DOMAIN
  ) {
    return sendViaMailgunApi(to, subject, html);
  }

  // fallback SMTP (Mailtrap or Mailgun SMTP)
  const transporter = createSmtpTransport();
  const info = await transporter.sendMail({
    from: process.env.SMTP_EMAIL || "no-reply@example.com",
    to,
    subject,
    html,
  });
  return info;
}
