import nodemailer from "nodemailer";
import { ENV } from "../config/env";

const transporter = nodemailer.createTransport({
  host: ENV.SMTP_HOST,
  port: ENV.SMTP_PORT,
  secure: false,
  auth: { user: ENV.SMTP_USER, pass: ENV.SMTP_PASS },
});

const logEmailDebug = (message: string, meta?: Record<string, unknown>) => {
  if (!ENV.EMAIL_DEBUG) {
    return;
  }

  console.log("[email]", message, meta ?? {});
};

const sendMailWithLogging = async (mailOptions: Parameters<typeof transporter.sendMail>[0]) => {
  logEmailDebug("sending", {
    to: mailOptions.to,
    subject: mailOptions.subject,
  });

  const info = await transporter.sendMail(mailOptions);

  logEmailDebug("sent", {
    to: mailOptions.to,
    subject: mailOptions.subject,
    messageId: info.messageId,
    response: info.response,
  });

  return info;
};

export const verifyEmailTransport = async () => {
  try {
    await transporter.verify();
    logEmailDebug("transport verified", {
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      user: ENV.SMTP_USER,
    });
  } catch (error) {
    console.error("[email] transport verify failed", error);
  }
};

// ─── Customer: booking created (PENDING) ─────────────────────────────────────
export const sendBookingConfirmation = async (
  to: string,
  data: {
    name: string;
    service: string;
    startTime: string;
    endTime: string;
    staff?: string;
    bookingId: string;
  }
) => {
  await sendMailWithLogging({
    from: ENV.EMAIL_FROM,
    to,
    subject: "✨ Your appointment is awaiting confirmation — King Nails Cardiff",
    html: `
      <div style="font-family:Georgia,serif;max-width:540px;margin:auto;padding:32px;background:#fdf8f4;border:1px solid #e8ddd8;border-radius:8px">
        <h2 style="color:#2c1f1a;margin-bottom:4px">Your appointment is awaiting confirmation!</h2>
        <p style="color:#6b4f44;margin-top:0">Hi <strong>${data.name}</strong>,We'll confirm your apointment shortly from our team.</p>
        <table style="width:100%;margin:24px 0;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#6b4f44;border-bottom:1px solid #e8ddd8;width:40%">Service</td><td style="color:#2c1f1a;border-bottom:1px solid #e8ddd8"><strong>${data.service}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#6b4f44;border-bottom:1px solid #e8ddd8">Starts</td><td style="color:#2c1f1a;border-bottom:1px solid #e8ddd8"><strong>${data.startTime}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#6b4f44;border-bottom:1px solid #e8ddd8">Ends</td><td style="color:#2c1f1a;border-bottom:1px solid #e8ddd8"><strong>${data.endTime}</strong></td></tr>
          ${data.staff ? `<tr><td style="padding:8px 0;color:#6b4f44">Nail Technician</td><td style="color:#2c1f1a"><strong>${data.staff}</strong></td></tr>` : ""}
        </table>
        <p style="color:#6b4f44;font-size:13px">Booking reference: <code>${data.bookingId}</code></p>
        <p style="color:#6b4f44;font-size:13px">King Nails Cardiff 💅</p>
      </div>
    `,
  });
};

// ─── Salon: new booking notification ─────────────────────────────────────────
export const sendSalonNotification = async (data: {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  service: string;
  startTime: string;
  staff?: string;
}) => {
  await sendMailWithLogging({
    from: ENV.EMAIL_FROM,
    to: ENV.SALON_EMAIL,
    subject: `📅 New Booking — ${data.customerName} (${data.service})`,
    html: `
      <div style="font-family:Georgia,serif;max-width:540px;margin:auto;padding:32px;background:#f4f8fd;border:1px solid #d8e2e8;border-radius:8px">
        <h2 style="color:#1a2c2c">New booking received</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#4f6b6b;border-bottom:1px solid #d8e2e8;width:40%">Customer</td><td style="border-bottom:1px solid #d8e2e8"><strong>${data.customerName}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#4f6b6b;border-bottom:1px solid #d8e2e8">Phone</td><td style="border-bottom:1px solid #d8e2e8">${data.customerPhone}</td></tr>
          ${data.customerEmail ? `<tr><td style="padding:8px 0;color:#4f6b6b;border-bottom:1px solid #d8e2e8">Email</td><td style="border-bottom:1px solid #d8e2e8">${data.customerEmail}</td></tr>` : ""}
          <tr><td style="padding:8px 0;color:#4f6b6b;border-bottom:1px solid #d8e2e8">Service</td><td style="border-bottom:1px solid #d8e2e8"><strong>${data.service}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#4f6b6b;border-bottom:1px solid #d8e2e8">Time</td><td style="border-bottom:1px solid #d8e2e8"><strong>${data.startTime}</strong></td></tr>
          ${data.staff ? `<tr><td style="padding:8px 0;color:#4f6b6b">Technician</td><td>${data.staff}</td></tr>` : ""}
        </table>
        <p style="color:#4f6b6b;font-size:13px;margin-top:16px">Ref: <code>${data.bookingId}</code> — Please log in to the admin panel to confirm or contact the customer.</p>
      </div>
    `,
  });
};

// ─── Customer: status changed (CONFIRMED or CANCELLED) ───────────────────────
export const sendBookingStatusUpdate = async (
  to: string,
  data: {
    name: string;
    service: string;
    startTime: string;
    staff?: string;
    status: "CONFIRMED" | "CANCELLED";
    bookingId: string;
  }
) => {
  const isConfirmed = data.status === "CONFIRMED";
  const subject = isConfirmed
    ? "✅ Booking Confirmed — King Nails Cardiff"
    : "❌ Booking Cancelled — King Nails Cardiff";
  const headline = isConfirmed ? "Your appointment is confirmed!" : "Your booking has been cancelled";
  const color = isConfirmed ? "#1a7a4a" : "#c0392b";
  const message = isConfirmed
    ? "We look forward to seeing you. If you need to reschedule, please contact us."
    : "We're sorry for any inconvenience. Please contact us to rebook at another time.";

  await sendMailWithLogging({
    from: ENV.EMAIL_FROM,
    to,
    subject,
    html: `
      <div style="font-family:Georgia,serif;max-width:540px;margin:auto;padding:32px;background:#fdf8f4;border:1px solid #e8ddd8;border-radius:8px">
        <h2 style="color:${color}">${headline}</h2>
        <p style="color:#6b4f44">Hi <strong>${data.name}</strong>, ${message}</p>
        <table style="width:100%;margin:24px 0;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#6b4f44;border-bottom:1px solid #e8ddd8;width:40%">Service</td><td style="color:#2c1f1a;border-bottom:1px solid #e8ddd8"><strong>${data.service}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#6b4f44;border-bottom:1px solid #e8ddd8">Date &amp; Time</td><td style="color:#2c1f1a;border-bottom:1px solid #e8ddd8"><strong>${data.startTime}</strong></td></tr>
          ${data.staff ? `<tr><td style="padding:8px 0;color:#6b4f44">Nail Technician</td><td style="color:#2c1f1a"><strong>${data.staff}</strong></td></tr>` : ""}
        </table>
        <p style="color:#6b4f44;font-size:13px">Ref: <code>${data.bookingId}</code></p>
        <p style="color:#6b4f44;font-size:13px">King Nails Cardiff 💅</p>
      </div>
    `,
  });
};
