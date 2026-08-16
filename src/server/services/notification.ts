import nodemailer from "nodemailer";
import { remindersRepository } from "../repositories/reminders";
import { appointmentsRepository } from "../repositories/appointments";

/* ─────────────────────────────────────────────────────────
 * Send Email via SMTP REST / Mail client (e.g. Hostinger SMTP)
 * ───────────────────────────────────────────────────────── */
async function sendSmtpEmail(to: string, subject: string, html: string): Promise<boolean> {
  const host = process.env.SMTP_HOST || "smtp.hostinger.com";
  const port = parseInt(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"Operator AI" <${user}>`;

  if (!user || !pass) {
    console.error("[NotificationService] SMTP credentials missing. Failing email dispatch.");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    return true;
  } catch (err) {
    console.error("[NotificationService] SMTP email dispatch failed:", err);
    return false;
  }
}


/* ─────────────────────────────────────────────────────────
 * Send SMS via MSG91 REST API
 * ───────────────────────────────────────────────────────── */
async function sendMsg91SMS(to: string, message: string): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID || "NXRECP";
  const flowId = process.env.MSG91_FLOW_ID;

  if (!authKey) {
    console.error("[NotificationService] MSG91 SMS credentials missing. Failing SMS dispatch.");
    return false;
  }

  // Clean the phone number (MSG91 expects country code without + prefix, e.g. '919999999999')
  const cleanPhone = to.replace(/\D/g, "");

  try {
    // If flowId is configured, use MSG91 Flow API
    if (flowId) {
      const response = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          authkey: authKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          flow_id: flowId,
          sender: senderId,
          recipients: [
            {
              mobiles: cleanPhone,
              message: message, // variable binding if flow accepts message var
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("[NotificationService] MSG91 Flow SMS failed:", err);
        return false;
      }
      return true;
    }

    // Fallback: Simple transactional API
    const response = await fetch("https://api.msg91.com/api/v2/sendsms", {
      method: "POST",
      headers: {
        authkey: authKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: senderId,
        route: "4", // Transactional route
        country: "91",
        sms: [
          {
            message: message,
            to: [cleanPhone],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[NotificationService] MSG91 sendsms failed:", err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[NotificationService] MSG91 dispatch failed:", err);
    return false;
  }
}

// Master router routing
async function dispatchSMS(to: string, message: string): Promise<boolean> {
  const isMsg91Sent = await sendMsg91SMS(to, message);
  if (isMsg91Sent) {
    console.log(`[NotificationService] SMS successfully dispatched to ${to} via MSG91.`);
    return true;
  }
  return false;
}


export const notificationService = {
  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    return sendSmtpEmail(to, subject, html);
  },
  async sendSMS(to: string, message: string): Promise<boolean> {
    return dispatchSMS(to, message);
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
          sentSuccess = await sendSmtpEmail(appointment.customerEmail, subject, htmlContent);
        } else {
          console.warn(`[NotificationService] Customer email not found for email reminder.`);
        }
      } else if (type === "sms") {
        if (appointment.customerPhone) {
          sentSuccess = await dispatchSMS(appointment.customerPhone, messageBody);
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
