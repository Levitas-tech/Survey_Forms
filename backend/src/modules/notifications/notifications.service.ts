import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  async sendFormAssignmentNotification(userEmail: string, userName: string, formTitle: string): Promise<void> {
    const subject = 'New Survey Assigned';
    const html = `
      <h2>New Survey Assignment</h2>
      <p>Hello ${userName},</p>
      <p>A new survey "${formTitle}" has been assigned to you.</p>
      <p>Please log in to your account to complete the survey.</p>
      <p>Best regards,<br>SurveyFlow Team</p>
    `;

    await this.sendEmail(userEmail, subject, html);
  }

  async sendFormReminderNotification(userEmail: string, userName: string, formTitle: string): Promise<void> {
    const subject = 'Survey Reminder';
    const html = `
      <h2>Survey Reminder</h2>
      <p>Hello ${userName},</p>
      <p>This is a reminder that you have an incomplete survey "${formTitle}".</p>
      <p>Please log in to your account to complete the survey.</p>
      <p>Best regards,<br>SurveyFlow Team</p>
    `;

    await this.sendEmail(userEmail, subject, html);
  }

  async sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<void> {
    const subject = 'Password Reset Request';
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const html = `
      <h2>Password Reset Request</h2>
      <p>You have requested to reset your password.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>SurveyFlow Team</p>
    `;

    await this.sendEmail(userEmail, subject, html);
  }
}
