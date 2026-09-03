import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendEmail(to: string, subject: string, html: string) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) return;
  await transporter.sendMail({ from, to, subject, html });
}