import nodemailer from "nodemailer";
import { ENV } from "../config/env";

const transporter = nodemailer.createTransport({
  host: ENV.SMTP_HOST,
  port: ENV.SMTP_PORT,
  secure: false,
  auth: { user: ENV.SMTP_USER, pass: ENV.SMTP_PASS },
});

export const sendBookingConfirmation = async (to: string, booking: {
  name: string;
  service: string;
  date: string;
  staff?: string;
}) => {
  await transporter.sendMail({
    from: ENV.EMAIL_FROM,
    to,
    subject: "\u2728 Booking Confirmed \u2014 King Nails Cardiff",
    html: `
      <div style="font-family:serif;max-width:520px;margin:auto;padding:32px;background:#fdf8f4;border:1px solid #e8ddd8">
        <h2 style="color:#2c1f1a">Your appointment is confirmed!</h2>
        <p style="color:#6b4f44">Hi <strong>${booking.name}</strong>,</p>
        <table style="width:100%;margin:24px 0;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#6b4f44;border-bottom:1px solid #e8ddd8">Service</td><td style="color:#2c1f1a"><strong>${booking.service}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#6b4f44;border-bottom:1px solid #e8ddd8">Date &amp; Time</td><td style="color:#2c1f1a"><strong>${booking.date}</strong></td></tr>
          ${booking.staff ? `<tr><td style="padding:8px 0;color:#6b4f44">Nail Technician</td><td style="color:#2c1f1a"><strong>${booking.staff}</strong></td></tr>` : ""}
        </table>
        <p style="color:#6b4f44;font-size:13px">See you soon at King Nails Cardiff \ud83d\udc85</p>
      </div>
    `,
  });
};

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Email could not be sent');
    }
  }
}

export default new EmailService();