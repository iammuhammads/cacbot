import type { Env } from '../../config/env.js';
import type { SessionRecord } from '../../types/domain.js';
import { logger } from '../utils/logger.js';
import type { WhatsAppProvider } from '../whatsapp/provider.js';

export class NotificationService {
  constructor(
    private readonly env: Env,
    private readonly whatsapp: WhatsAppProvider
  ) {}

  /**
   * Notifies the client when their Remita payment is successfully verified.
   */
  async notifyPaymentConfirmed(session: SessionRecord): Promise<void> {
    const message = `Payment Verified! ✅\n\nMr. Chinedu has successfully confirmed your Remita payment. I am resuming your CAC registration now. 💼`;
    await this.sendWhatsApp(session.id, message);
  }

  /**
   * Notifies the client when the application has been submitted to the portal.
   */
  async notifySubmissionCompleted(session: SessionRecord): Promise<void> {
    const message = `Registration Submitted! 🚀\n\nYour application has been successfully submitted to the CAC portal. Our team will monitor it and I'll alert you the moment we have an update.`;
    await this.sendWhatsApp(session.id, message);
  }

  /**
   * Notifies the client when a query is received from the CAC.
   */
  async notifyQueryReceived(session: SessionRecord, reason: string): Promise<void> {
    const message = `Action Required: Query Received 🛑\n\nThe CAC has raised a query regarding your application:\n\n"${reason}"\n\nPlease reply here or log into your dashboard to address this.`;
    await this.sendWhatsApp(session.id, message);
  }

  /**
   * Notifies the client when the certificate is ready for download.
   */
  async notifyCertificateReady(session: SessionRecord): Promise<void> {
    const message = `Congratulations! 🎊\n\nYour business registration is complete. Your certificate is ready! You can log into your dashboard to download it now.`;
    await this.sendWhatsApp(session.id, message);
  }

  private async sendWhatsApp(to: string, text: string): Promise<void> {
    try {
      logger.info("Sending proactive notification", { to, text: text.slice(0, 50) + "..." });
      // If the ID looks like a phone number (not a Clerk ID)
      if (to.includes("+") || /^\d+$/.test(to)) {
         await this.whatsapp.sendTextMessage(to, text);
      } else {
         logger.warn("Skipping WhatsApp notification for non-phone ID (Web User)", { to });
         // In a real production app, we would send an Email here via Resend/Nodemailer
      }
    } catch (err) {
      logger.error("Failed to send notification", { error: err, to });
    }
  }
}
