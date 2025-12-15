-- ======================================
-- Migration 013: Create email_templates table
-- STORY-023B: E-Mail Templates & Queue
-- ======================================
-- Creates tables for:
--   - email_templates: Database-stored email templates
--   - email_queue: Queue for async email processing
-- ======================================

-- UP
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables TEXT[] DEFAULT '{}',
    description VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create email queue table for async processing
CREATE TABLE IF NOT EXISTS email_queue (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    variables JSONB NOT NULL DEFAULT '{}',
    priority INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    message_id VARCHAR(100),
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for email_templates
CREATE INDEX idx_email_templates_name ON email_templates(name);
CREATE INDEX idx_email_templates_is_active ON email_templates(is_active);

-- Indexes for email_queue (optimized for queue processing)
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_priority_status ON email_queue(priority DESC, status, created_at ASC);
CREATE INDEX idx_email_queue_next_retry ON email_queue(next_retry_at) WHERE status = 'pending' AND retry_count > 0;
CREATE INDEX idx_email_queue_scheduled ON email_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_email_queue_recipient ON email_queue(recipient);
CREATE INDEX idx_email_queue_template ON email_queue(template_name);

-- Insert default templates (matching existing file-based templates)
INSERT INTO email_templates (name, subject, html_content, text_content, variables, description) VALUES
(
    'welcome',
    'Welcome to {{companyName}}!',
    '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to {{companyName}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #2563eb;
    }
    h1 {
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      margin-bottom: 16px;
      color: #4b5563;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .cta-container {
      text-align: center;
      margin: 30px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
    .feature-list {
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
    }
    .feature-list li {
      margin-bottom: 8px;
      color: #4b5563;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">{{companyName}}</div>
    </div>
    <h1>Welcome, {{name}}!</h1>
    <p>Thank you for joining {{companyName}}! We''re excited to have you on board.</p>
    <p>Your account has been successfully created and you''re ready to get started.</p>
    {{#if verificationLink}}
    <div class="cta-container">
      <p>Please verify your email address to activate all features:</p>
      <a href="{{verificationLink}}" class="button">Verify Email Address</a>
    </div>
    <p style="font-size: 12px; color: #6b7280;">
      If the button doesn''t work, copy and paste this link into your browser:<br>
      <a href="{{verificationLink}}" style="color: #2563eb;">{{verificationLink}}</a>
    </p>
    {{/if}}
    <div class="feature-list">
      <p><strong>Here''s what you can do:</strong></p>
      <ul>
        <li>Explore all features of your new account</li>
        <li>Customize your profile settings</li>
        <li>Connect with our support team if you need help</li>
      </ul>
    </div>
    <p>If you have any questions, don''t hesitate to reach out to our support team.</p>
    <p>Best regards,<br>The {{companyName}} Team</p>
    <div class="footer">
      <p>&copy; {{year}} {{companyName}}. All rights reserved.</p>
      <p>This email was sent to you because you created an account with {{companyName}}.</p>
    </div>
  </div>
</body>
</html>',
    'Welcome to {{companyName}}, {{name}}!
========================================

Thank you for joining {{companyName}}! We''re excited to have you on board.

Your account has been successfully created and you''re ready to get started.

{{#if verificationLink}}
VERIFY YOUR EMAIL ADDRESS
-------------------------
Please verify your email address to activate all features:
{{verificationLink}}

{{/if}}
HERE''S WHAT YOU CAN DO:
-----------------------
- Explore all features of your new account
- Customize your profile settings
- Connect with our support team if you need help

If you have any questions, don''t hesitate to reach out to our support team.

Best regards,
The {{companyName}} Team

---
(c) {{year}} {{companyName}}. All rights reserved.
This email was sent to you because you created an account with {{companyName}}.',
    ARRAY['name', 'companyName', 'verificationLink', 'year', 'supportEmail'],
    'Welcome email sent to new users upon registration'
),
(
    'password-reset',
    'Reset Your Password',
    '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - {{companyName}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #2563eb;
    }
    h1 {
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      margin-bottom: 16px;
      color: #4b5563;
    }
    .button {
      display: inline-block;
      background-color: #dc2626;
      color: #ffffff !important;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .cta-container {
      text-align: center;
      margin: 30px 0;
    }
    .warning-box {
      background-color: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
    }
    .warning-box p {
      color: #92400e;
      margin: 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
    .security-notice {
      background-color: #f3f4f6;
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">{{companyName}}</div>
    </div>
    <h1>Reset Your Password</h1>
    <p>Hello {{name}},</p>
    <p>We received a request to reset the password for your account. If you made this request, click the button below to set a new password:</p>
    <div class="cta-container">
      <a href="{{resetLink}}" class="button">Reset Password</a>
    </div>
    <p style="font-size: 12px; color: #6b7280;">
      If the button doesn''t work, copy and paste this link into your browser:<br>
      <a href="{{resetLink}}" style="color: #2563eb;">{{resetLink}}</a>
    </p>
    <div class="warning-box">
      <p><strong>Important:</strong> This link will expire in {{expiresIn}}.</p>
    </div>
    <div class="security-notice">
      <p><strong>Didn''t request this?</strong></p>
      <p>If you didn''t request a password reset, please ignore this email. Your password will remain unchanged and your account is secure.</p>
      <p>If you''re concerned about your account security, you can always change your password from your account settings.</p>
    </div>
    <p>Best regards,<br>The {{companyName}} Team</p>
    <div class="footer">
      <p>&copy; {{year}} {{companyName}}. All rights reserved.</p>
      <p>This email was sent because a password reset was requested for your account.</p>
      <p>If you didn''t make this request, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>',
    'Reset Your Password - {{companyName}}
========================================

Hello {{name}},

We received a request to reset the password for your account. If you made this request, use the link below to set a new password:

{{resetLink}}

IMPORTANT: This link will expire in {{expiresIn}}.

DIDN''T REQUEST THIS?
---------------------
If you didn''t request a password reset, please ignore this email. Your password will remain unchanged and your account is secure.

If you''re concerned about your account security, you can always change your password from your account settings.

Best regards,
The {{companyName}} Team

---
(c) {{year}} {{companyName}}. All rights reserved.
This email was sent because a password reset was requested for your account.',
    ARRAY['name', 'companyName', 'resetLink', 'expiresIn', 'year', 'supportEmail'],
    'Password reset email with secure link and expiry information'
),
(
    'verification',
    'Verify Your Email Address',
    '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - {{companyName}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #2563eb;
    }
    h1 {
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      margin-bottom: 16px;
      color: #4b5563;
    }
    .button {
      display: inline-block;
      background-color: #10b981;
      color: #ffffff !important;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .cta-container {
      text-align: center;
      margin: 30px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
    .info-box {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">{{companyName}}</div>
    </div>
    <h1>Verify Your Email Address</h1>
    <p>Hello {{name}},</p>
    <p>Thank you for signing up! Please verify your email address to complete your registration and unlock all features.</p>
    <div class="cta-container">
      <a href="{{verificationLink}}" class="button">Verify Email Address</a>
    </div>
    <p style="font-size: 12px; color: #6b7280;">
      If the button doesn''t work, copy and paste this link into your browser:<br>
      <a href="{{verificationLink}}" style="color: #2563eb;">{{verificationLink}}</a>
    </p>
    <div class="info-box">
      <p><strong>Why verify?</strong></p>
      <p style="margin: 0;">Verifying your email helps us keep your account secure and ensures you receive important notifications.</p>
    </div>
    <p>If you didn''t create an account, you can safely ignore this email.</p>
    <p>Best regards,<br>The {{companyName}} Team</p>
    <div class="footer">
      <p>&copy; {{year}} {{companyName}}. All rights reserved.</p>
      <p>This email was sent to verify your email address.</p>
    </div>
  </div>
</body>
</html>',
    'Verify Your Email Address - {{companyName}}
============================================

Hello {{name}},

Thank you for signing up! Please verify your email address to complete your registration and unlock all features.

VERIFICATION LINK:
{{verificationLink}}

WHY VERIFY?
-----------
Verifying your email helps us keep your account secure and ensures you receive important notifications.

If you didn''t create an account, you can safely ignore this email.

Best regards,
The {{companyName}} Team

---
(c) {{year}} {{companyName}}. All rights reserved.
This email was sent to verify your email address.',
    ARRAY['name', 'companyName', 'verificationLink', 'year', 'supportEmail'],
    'Email verification with clear instructions for the user'
),
(
    'feedback-confirmation',
    'We Received Your Feedback',
    '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Received - {{companyName}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #2563eb;
    }
    h1 {
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      margin-bottom: 16px;
      color: #4b5563;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
    .feedback-summary {
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
      border-left: 4px solid #2563eb;
    }
    .check-icon {
      color: #10b981;
      font-size: 48px;
      text-align: center;
      display: block;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">{{companyName}}</div>
    </div>
    <div class="check-icon">&#10003;</div>
    <h1>Thank You for Your Feedback!</h1>
    <p>Hello {{name}},</p>
    <p>We''ve received your feedback and truly appreciate you taking the time to share your thoughts with us.</p>
    {{#if feedbackSubject}}
    <div class="feedback-summary">
      <p><strong>Your feedback subject:</strong></p>
      <p style="margin: 0;">{{feedbackSubject}}</p>
    </div>
    {{/if}}
    {{#if ticketNumber}}
    <p><strong>Reference Number:</strong> {{ticketNumber}}</p>
    {{/if}}
    <p>Our team reviews all feedback carefully. While we may not be able to respond to every message individually, please know that your input helps us improve our products and services.</p>
    <p>If you have any urgent concerns, please contact our support team at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.</p>
    <p>Best regards,<br>The {{companyName}} Team</p>
    <div class="footer">
      <p>&copy; {{year}} {{companyName}}. All rights reserved.</p>
      <p>This email confirms we received your feedback.</p>
    </div>
  </div>
</body>
</html>',
    'Thank You for Your Feedback! - {{companyName}}
==============================================

Hello {{name}},

We''ve received your feedback and truly appreciate you taking the time to share your thoughts with us.

{{#if feedbackSubject}}
YOUR FEEDBACK SUBJECT:
----------------------
{{feedbackSubject}}

{{/if}}
{{#if ticketNumber}}
Reference Number: {{ticketNumber}}

{{/if}}
Our team reviews all feedback carefully. While we may not be able to respond to every message individually, please know that your input helps us improve our products and services.

If you have any urgent concerns, please contact our support team at {{supportEmail}}.

Best regards,
The {{companyName}} Team

---
(c) {{year}} {{companyName}}. All rights reserved.
This email confirms we received your feedback.',
    ARRAY['name', 'companyName', 'feedbackSubject', 'ticketNumber', 'year', 'supportEmail'],
    'Confirmation email sent after receiving user feedback with summary'
),
(
    'support-request',
    'Support Request: {{subject}}',
    '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Request - {{companyName}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #2563eb;
    }
    h1 {
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      margin-bottom: 16px;
      color: #4b5563;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
    .ticket-box {
      background-color: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
      text-align: center;
    }
    .ticket-number {
      font-size: 24px;
      font-weight: bold;
      color: #92400e;
    }
    .request-details {
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      margin-bottom: 12px;
    }
    .detail-label {
      font-weight: 600;
      color: #374151;
    }
    .message-box {
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 16px;
      margin-top: 12px;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">{{companyName}}</div>
    </div>
    <h1>New Support Request</h1>
    {{#if ticketNumber}}
    <div class="ticket-box">
      <p style="margin: 0; color: #92400e;">Ticket Number</p>
      <p class="ticket-number">{{ticketNumber}}</p>
    </div>
    {{/if}}
    <div class="request-details">
      <div class="detail-row">
        <span class="detail-label">From:</span> {{userName}} ({{userEmail}})
      </div>
      {{#if userId}}
      <div class="detail-row">
        <span class="detail-label">User ID:</span> {{userId}}
      </div>
      {{/if}}
      <div class="detail-row">
        <span class="detail-label">Subject:</span> {{subject}}
      </div>
      <div class="detail-row">
        <span class="detail-label">Message:</span>
        <div class="message-box">{{message}}</div>
      </div>
    </div>
    <p><strong>Expected Response Time:</strong> Within 24-48 business hours</p>
    <p>This is an internal notification for the support team.</p>
    <div class="footer">
      <p>&copy; {{year}} {{companyName}}. All rights reserved.</p>
      <p>Internal support notification - Do not forward.</p>
    </div>
  </div>
</body>
</html>',
    'New Support Request - {{companyName}}
=====================================

TICKET: {{ticketNumber}}

FROM: {{userName}} ({{userEmail}})
{{#if userId}}
USER ID: {{userId}}
{{/if}}
SUBJECT: {{subject}}

MESSAGE:
--------
{{message}}

--------

Expected Response Time: Within 24-48 business hours

This is an internal notification for the support team.

---
(c) {{year}} {{companyName}}. All rights reserved.
Internal support notification - Do not forward.',
    ARRAY['userName', 'userEmail', 'userId', 'subject', 'message', 'ticketNumber', 'companyName', 'year', 'supportEmail'],
    'Internal support request notification with ticket number and expected response time'
);

-- DOWN
DROP INDEX IF EXISTS idx_email_queue_template;
DROP INDEX IF EXISTS idx_email_queue_recipient;
DROP INDEX IF EXISTS idx_email_queue_scheduled;
DROP INDEX IF EXISTS idx_email_queue_next_retry;
DROP INDEX IF EXISTS idx_email_queue_priority_status;
DROP INDEX IF EXISTS idx_email_queue_status;
DROP INDEX IF EXISTS idx_email_templates_is_active;
DROP INDEX IF EXISTS idx_email_templates_name;
DROP TABLE IF EXISTS email_queue;
DROP TABLE IF EXISTS email_templates;
