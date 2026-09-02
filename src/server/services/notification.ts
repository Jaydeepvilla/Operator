import nodemailer from "nodemailer";
import { remindersRepository } from "../repositories/reminders";
import { appointmentsRepository } from "../repositories/appointments";

/* ─────────────────────────────────────────────────────────
 * Send Email via Resend (Primary), Postmark (Alt), or SMTP
 * ───────────────────────────────────────────────────────── */
async function sendEmailNotification(to: string, subject: string, html: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
  const fromEmail = process.env.EMAIL_FROM || "Operator <notifications@operator.so>";

  if (resendApiKey) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: fromEmail, to: [to], subject, html }),
      });
      return resp.ok;
    } catch (err) {
      console.error("[NotificationService] Resend email dispatch failed:", err);
    }
  }

  if (postmarkToken) {
    try {
      const resp = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "X-Postmark-Server-Token": postmarkToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ From: fromEmail, To: to, Subject: subject, HtmlBody: html }),
      });
      return resp.ok;
    } catch (err) {
      console.error("[NotificationService] Postmark email dispatch failed:", err);
    }
  }

  // Fallback to local SMTP if configured
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: { user, pass },
      });
      await transporter.sendMail({ from: fromEmail, to, subject, html });
      return true;
    } catch (err) {
      console.error("[NotificationService] SMTP email dispatch failed:", err);
    }
  }

  // Local zero-cost sandbox simulation
  console.log(`[NotificationService Sandbox] Email simulated to ${to}: "${subject}"`);
  return true;
}

/* ─────────────────────────────────────────────────────────
 * Send SMS via Vonage (Primary) or Sinch (Alternative)
 * ───────────────────────────────────────────────────────── */
async function sendSmsNotification(to: string, message: string): Promise<boolean> {
  const vonageApiKey = process.env.VONAGE_API_KEY;
  const vonageApiSecret = process.env.VONAGE_API_SECRET;
  const vonageFrom = process.env.VONAGE_FROM_NUMBER || "Operator";

  if (vonageApiKey && vonageApiSecret) {
    try {
      const cleanPhone = to.replace(/\D/g, "");
      const resp = await fetch("https://rest.nexmo.com/sms/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: vonageApiKey,
          api_secret: vonageApiSecret,
          from: vonageFrom,
          to: cleanPhone,
          text: message,
        }),
      });
      if (resp.ok) return true;
    } catch (err) {
      console.error("[NotificationService] Vonage SMS dispatch failed:", err);
    }
  }

  const sinchPlanId = process.env.SINCH_SERVICE_PLAN_ID;
  const sinchToken = process.env.SINCH_API_TOKEN;
  const sinchFrom = process.env.SINCH_FROM_NUMBER || "Operator";

  if (sinchPlanId && sinchToken) {
    try {
      const cleanPhone = to.replace(/\D/g, "");
      const resp = await fetch(`https://us.sms.api.sinch.com/xms/v1/${sinchPlanId}/batches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sinchToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: sinchFrom, to: [cleanPhone], body: message }),
      });
      if (resp.ok) return true;
    } catch (err) {
      console.error("[NotificationService] Sinch SMS dispatch failed:", err);
    }
  }

  // Local zero-cost sandbox simulation
  console.log(`[NotificationService Sandbox] SMS simulated to ${to}: "${message.substring(0, 50)}..."`);
  return true;
}


export const notificationService = {
  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    return sendEmailNotification(to, subject, html);
  },
  async sendSMS(to: string, message: string): Promise<boolean> {
    return sendSmsNotification(to, message);
  },
  async queueEmail(organizationId: string, to: string, subject: string, html: string, scheduledFor?: Date): Promise<string> {
    const { notificationQueueService } = await import("./jobs/notification-queue");
    return notificationQueueService.enqueue({
      organizationId,
      type: "send_email",
      payload: { to, subject, body: html },
      scheduledFor,
    });
  },
  async queueSMS(organizationId: string, to: string, message: string, scheduledFor?: Date): Promise<string> {
    const { notificationQueueService } = await import("./jobs/notification-queue");
    return notificationQueueService.enqueue({
      organizationId,
      type: "send_sms",
      payload: { to, body: message },
      scheduledFor,
    });
  },
  async sendReminder(reminderId: string): Promise<boolean> {
    try {
      const now = new Date();
      const list = await remindersRepository.listPending(now);
      const activeReminder = list.find((r) => r.id === reminderId);
      if (!activeReminder) {
        console.warn(`[NotificationService] Reminder ${reminderId} is not active or pending.`);
        return false;
      }

      const appointmentDetails = await appointmentsRepository.findById(activeReminder.appointmentId);
      if (!appointmentDetails) {
        await remindersRepository.update(reminderId, { status: "failed" });
        return false;
      }

      const { appointment, service } = appointmentDetails;
      const type = activeReminder.type;
      let sentSuccess = false;

      const dateStr = new Date(appointment.startTime).toLocaleString();
      const serviceName = service?.name || "Appointment";
      const messageBody = `Hi ${appointment.customerName || "Customer"}, this is a reminder for your upcoming appointment: ${serviceName} on ${dateStr}. Location: ${appointment.organizationId}.`;

      if (type === "email") {
        if (appointment.customerEmail) {
          const subject = `Reminder: ${serviceName} appointment`;
          const htmlContent = `
            <h2>Appointment Reminder</h2>
            <p>Hi ${appointment.customerName || "Customer"},</p>
            <p>This is a reminder for your upcoming appointment:</p>
            <ul>
              <li><strong>Service:</strong> ${serviceName}</li>
              <li><strong>Time:</strong> ${dateStr}</li>
            </ul>
            <p>We look forward to seeing you!</p>
          `;
          sentSuccess = await sendEmailNotification(appointment.customerEmail, subject, htmlContent);
        } else {
          console.warn(`[NotificationService] Customer email not found for email reminder.`);
        }
      } else if (type === "sms") {
        if (appointment.customerPhone) {
          sentSuccess = await sendSmsNotification(appointment.customerPhone, messageBody);
        } else {
          console.warn(`[NotificationService] Customer phone not found for SMS reminder.`);
        }
      }

      // Update status
      const finalStatus = sentSuccess ? "sent" : "failed";
      await remindersRepository.update(reminderId, { status: finalStatus });

      await appointmentsRepository.logEvent(appointment.organizationId, appointment.id, "reminder_sent", {
        reminderId,
        type,
        status: finalStatus,
        recipient: type === "email" ? appointment.customerEmail : appointment.customerPhone,
      });

      return sentSuccess;
    } catch (err) {
      console.error(`[NotificationService] Failed to dispatch reminder ${reminderId}:`, err);
      await remindersRepository.update(reminderId, { status: "failed" });
      return false;
    }
  },
};
