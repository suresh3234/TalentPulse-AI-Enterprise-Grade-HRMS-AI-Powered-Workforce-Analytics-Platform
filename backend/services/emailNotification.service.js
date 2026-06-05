const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

class EmailNotificationService {
  constructor() {
    this.enabled = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      logger.warn("SMTP credentials not configured. Email notifications will be simulated in console logs.");
    }
  }

  /**
   * Send mail wrapper that logs outcomes
   */
  async sendMail({ to, subject, text, html }) {
    const from = process.env.SMTP_USER || "no-reply@hiremind.ai";
    if (this.enabled) {
      try {
        await this.transporter.sendMail({
          from,
          to,
          subject,
          text,
          html,
        });
        logger.info(`Email successfully sent to ${to}`, { subject });
        return true;
      } catch (err) {
        logger.error(`Failed to send email to ${to}`, { error: err.message });
        return false;
      }
    } else {
      logger.info(`[SIMULATED EMAIL]
TO: ${to}
FROM: ${from}
SUBJECT: ${subject}
BODY:
${text}
      `);
      return true;
    }
  }

  /**
   * Notify candidate when live video interview room is scheduled
   */
  async sendInterviewScheduledEmail({ candidateEmail, candidateName, jobTitle, inviteLink, scheduledAt }) {
    const formattedDate = new Date(scheduledAt).toLocaleString();
    const subject = `Scheduled Interview: ${jobTitle} at HireMind AI`;
    const text = `Hello ${candidateName},

Your live video interview for the position of ${jobTitle} has been scheduled.
Time: ${formattedDate}
Join link: ${inviteLink}

Please ensure you have a working camera and microphone before joining.

Best regards,
Hiring Team`;

    const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #2563eb;">Live Video Interview Scheduled</h2>
      <p>Hello <strong>${candidateName}</strong>,</p>
      <p>Your live video interview for the position of <strong>${jobTitle}</strong> has been scheduled.</p>
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Time:</strong> ${formattedDate}</p>
        <p style="margin: 10px 0 0 0;"><strong>Room Access:</strong> <a href="${inviteLink}" style="color: #2563eb; font-weight: bold; text-decoration: none;">Join Live Interview Room</a></p>
      </div>
      <p>Please make sure you test your camera and microphone using the link before the scheduled time.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #64748b;">This is an automated notification from HireMind AI.</p>
    </div>`;

    return this.sendMail({ to: candidateEmail, subject, text, html });
  }

  /**
   * Notify candidate when feedback/analysis report is ready
   */
  async sendFeedbackReadyEmail({ candidateEmail, candidateName, jobTitle }) {
    const subject = `Interview Feedback Ready: ${jobTitle}`;
    const text = `Hello ${candidateName},

Your interview assessment for the position of ${jobTitle} has been reviewed and analyzed by our AI evaluation team.
Your hiring dashboard is updated with the results.

Best regards,
Hiring Team`;

    const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #10b981;">Evaluation Report Ready</h2>
      <p>Hello <strong>${candidateName}</strong>,</p>
      <p>Your interview assessment for the position of <strong>${jobTitle}</strong> has been evaluated and reviewed by our AI system.</p>
      <p>The recruiters have received your visual telemetry, fluency scorecards, and competence matching indicators.</p>
      <p>Our team will contact you shortly regarding the next pipeline milestones.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #64748b;">Thank you for participating in our automated screening process.</p>
    </div>`;

    return this.sendMail({ to: candidateEmail, subject, text, html });
  }

  /**
   * Notify candidate of hiring pipeline decision
   */
  async sendDecisionEmail({ candidateEmail, candidateName, jobTitle, decision }) {
    const subject = `Update on your Application for ${jobTitle}`;
    const text = `Hello ${candidateName},

Thank you for interviewing with us. We have updated your application status to: ${decision}.
We will keep you posted on any next steps.

Best regards,
Hiring Team`;

    const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2>Application Status Update</h2>
      <p>Hello <strong>${candidateName}</strong>,</p>
      <p>Thank you for taking the time to interview with us for the <strong>${jobTitle}</strong> position.</p>
      <p>Your application status is now updated to: <span style="font-weight: bold; color: ${decision === "Rejected" ? "#ef4444" : "#10b981"};">${decision}</span>.</p>
      <p>We appreciate your interest in joining our team and wish you all the best in your career pursuits.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #64748b;">Best regards, <br/>HireMind HR Team</p>
    </div>`;

    return this.sendMail({ to: candidateEmail, subject, text, html });
  }
}

module.exports = new EmailNotificationService();
