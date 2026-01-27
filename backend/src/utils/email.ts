/**
 * Email service utility using Nodemailer
 */

import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Create email transporter
 */
const createTransporter = () => {
  const emailAddress = process.env.EMAIL_ADDRESS;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailAddress || !emailPassword) {
    console.warn("⚠️  Email credentials not configured. Emails will be logged to console only.");
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail", // Using Gmail service
    auth: {
      user: emailAddress,
      pass: emailPassword,
    },
  });
};

/**
 * Send email
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const transporter = createTransporter();

  // If no transporter (missing credentials), log to console
  if (!transporter) {
    console.log("=".repeat(50));
    console.log("📧 EMAIL (Development Mode - No Credentials)");
    console.log("=".repeat(50));
    console.log("To:", options.to);
    console.log("Subject:", options.subject);
    console.log("Body:", options.text || options.html);
    console.log("=".repeat(50));
    return;
  }

  try {
    await transporter.sendMail({
      from: `"CORE-Community Platform" <${process.env.EMAIL_ADDRESS}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    
    console.log(`✅ Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    // Log email details for debugging
    console.log("Failed email details:");
    console.log("To:", options.to);
    console.log("Subject:", options.subject);
    throw new Error("Failed to send email");
  }
};

/**
 * Send OTP email
 */
export const sendOTPEmail = async (
  email: string,
  name: string,
  otp: string,
  purpose: 'signup' | 'login' = 'login'
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP Code</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border: 1px solid #ddd;">
        <h2 style="color: #333; margin-bottom: 20px;">Your OTP Code</h2>
        <p>Hi ${name},</p>
        <p>Your ${purpose === 'signup' ? 'signup' : 'login'} verification code is:</p>
        <div style="margin: 20px 0;">
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 5px; margin: 10px 0;">
            ${otp}
          </p>
        </div>
        <p style="color: #666; font-size: 14px;">
          This code will expire in 10 minutes.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">
          If you didn't ${purpose === 'signup' ? 'sign up' : 'request this code'}, please ignore this email.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Your OTP Code
    
    Hi ${name},
    
    Your ${purpose === 'signup' ? 'signup' : 'login'} verification code is: ${otp}
    
    This code will expire in 10 minutes.
    
    If you didn't ${purpose === 'signup' ? 'sign up' : 'request this code'}, please ignore this email.
  `;

  await sendEmail({
    to: email,
    subject: `Your ${purpose === 'signup' ? 'Signup' : 'Login'} Verification Code`,
    html,
    text,
  });
};

/**
 * Send document rejection email
 */
export const sendDocumentRejectionEmail = async (
  email: string,
  studentName: string,
  documentName: string,
  rejectionMessage: string,
  rejectedBy: string = 'OPS',
  registrationId?: string
): Promise<void> => {
  const detailsUrl = registrationId 
    ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-details?registrationId=${registrationId}`
    : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
    
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document Rejected</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border: 1px solid #ddd;">
        <h2>Document Rejected</h2>
        <p>Hi ${studentName},</p>
        <p>Your uploaded document "${documentName}" has been rejected by your ${rejectedBy}.</p>
        
        <p><strong>Reason for rejection:</strong></p>
        <p>${rejectionMessage}</p>
        
        <p><strong>What you need to do:</strong></p>
        <ol>
          <li>Review the rejection reason above</li>
          <li>Prepare a corrected version of the document</li>
          <li>Log in to your account and re-upload the document</li>
        </ol>
        
        <p><a href="${detailsUrl}">Upload Document Again</a></p>
        
        <p>If you have any questions, please contact your ${rejectedBy}.</p>
        
        <p style="color: #999; font-size: 12px; margin-top: 20px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Document Rejected
    
    Hi ${studentName},
    
    Your uploaded document "${documentName}" has been rejected by your ${rejectedBy}.
    
    Reason for rejection:
    ${rejectionMessage}
    
    What you need to do:
    1. Review the rejection reason above
    2. Prepare a corrected version of the document
    3. Log in to your account and re-upload the document
    
    If you have any questions, please contact your ${rejectedBy}.
  `;

  await sendEmail({
    to: email,
    subject: `Document Rejected: ${documentName}`,
    html,
    text,
  });
};


