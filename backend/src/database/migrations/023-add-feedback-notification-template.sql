-- ======================================
-- Migration 023: Add feedback-notification email template
-- STORY-038B: Feedback Rate Limiting & Email Queue
-- ======================================
-- Creates email template for sending feedback notifications to support team.
-- This template is used by the async email queue for feedback processing.
-- ======================================

-- UP
INSERT INTO email_templates (name, subject, html_content, text_content, variables, description) VALUES
(
    'feedback-notification',
    'Feedback from {{userName}} <{{userEmail}}>',
    '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Feedback - {{companyName}}</title>
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
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .badge {
      display: inline-block;
      background-color: #dbeafe;
      color: #1d4ed8;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 10px;
    }
    h1 {
      color: #1f2937;
      font-size: 22px;
      margin-bottom: 20px;
    }
    p {
      margin-bottom: 16px;
      color: #4b5563;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .info-table th {
      text-align: left;
      padding: 10px;
      background-color: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      color: #6b7280;
      font-weight: 500;
      width: 30%;
    }
    .info-table td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
      color: #1f2937;
      word-break: break-word;
    }
    .message-box {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
    }
    .message-box h3 {
      color: #374151;
      font-size: 14px;
      margin: 0 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .message-content {
      white-space: pre-wrap;
      color: #1f2937;
      font-size: 14px;
      line-height: 1.6;
    }
    .metadata-box {
      background-color: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
      font-size: 12px;
    }
    .metadata-box h4 {
      color: #713f12;
      margin: 0 0 8px 0;
      font-size: 12px;
      text-transform: uppercase;
    }
    .metadata-box p {
      color: #78716c;
      margin: 4px 0;
      font-size: 11px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
    .attachment-notice {
      background-color: #ecfdf5;
      border: 1px solid #6ee7b7;
      border-radius: 6px;
      padding: 12px;
      margin: 20px 0;
      color: #047857;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">{{companyName}}</div>
      <div class="badge">USER FEEDBACK</div>
    </div>
    <h1>New User Feedback Received</h1>
    <p>A user has submitted feedback through the application.</p>
    <table class="info-table">
      <tr>
        <th>From</th>
        <td>{{userName}} (<a href="mailto:{{userEmail}}">{{userEmail}}</a>)</td>
      </tr>
      <tr>
        <th>User ID</th>
        <td>{{userId}}</td>
      </tr>
      {{#if url}}
      <tr>
        <th>Page URL</th>
        <td><a href="{{url}}">{{url}}</a></td>
      </tr>
      {{/if}}
      {{#if route}}
      <tr>
        <th>Route</th>
        <td>{{route}}</td>
      </tr>
      {{/if}}
      <tr>
        <th>Submitted At</th>
        <td>{{submittedAt}}</td>
      </tr>
    </table>
    <div class="message-box">
      <h3>Feedback Message</h3>
      <div class="message-content">{{comment}}</div>
    </div>
    {{#if hasScreenshot}}
    <div class="attachment-notice">
      <strong>Note:</strong> A screenshot is attached to this email.
    </div>
    {{/if}}
    {{#if browserInfo}}
    <div class="metadata-box">
      <h4>Browser Information</h4>
      <p><strong>User Agent:</strong> {{userAgent}}</p>
      {{#if browserName}}
      <p><strong>Browser:</strong> {{browserName}} {{browserVersion}}</p>
      {{/if}}
      {{#if osName}}
      <p><strong>OS:</strong> {{osName}} {{osVersion}}</p>
      {{/if}}
      {{#if deviceType}}
      <p><strong>Device:</strong> {{deviceType}}</p>
      {{/if}}
      {{#if screenResolution}}
      <p><strong>Screen:</strong> {{screenResolution}}</p>
      {{/if}}
      {{#if language}}
      <p><strong>Language:</strong> {{language}}</p>
      {{/if}}
      {{#if timezone}}
      <p><strong>Timezone:</strong> {{timezone}}</p>
      {{/if}}
    </div>
    {{/if}}
    <div class="footer">
      <p>&copy; {{year}} {{companyName}}</p>
      <p>Internal feedback notification - Review and respond as needed.</p>
    </div>
  </div>
</body>
</html>',
    'New User Feedback - {{companyName}}
=====================================

USER FEEDBACK RECEIVED

From: {{userName}} ({{userEmail}})
User ID: {{userId}}
{{#if url}}
Page URL: {{url}}
{{/if}}
{{#if route}}
Route: {{route}}
{{/if}}
Submitted At: {{submittedAt}}

FEEDBACK MESSAGE:
-----------------
{{comment}}

{{#if hasScreenshot}}
NOTE: A screenshot is attached to this email.
{{/if}}

{{#if browserInfo}}
BROWSER INFORMATION:
--------------------
User Agent: {{userAgent}}
{{#if browserName}}
Browser: {{browserName}} {{browserVersion}}
{{/if}}
{{#if osName}}
OS: {{osName}} {{osVersion}}
{{/if}}
{{#if deviceType}}
Device: {{deviceType}}
{{/if}}
{{#if screenResolution}}
Screen: {{screenResolution}}
{{/if}}
{{#if language}}
Language: {{language}}
{{/if}}
{{#if timezone}}
Timezone: {{timezone}}
{{/if}}
{{/if}}

---
(c) {{year}} {{companyName}}
Internal feedback notification - Review and respond as needed.',
    ARRAY['userName', 'userEmail', 'userId', 'comment', 'url', 'route', 'submittedAt', 'hasScreenshot', 'browserInfo', 'userAgent', 'browserName', 'browserVersion', 'osName', 'osVersion', 'deviceType', 'screenResolution', 'language', 'timezone', 'companyName', 'year'],
    'Internal notification email sent to support team when user submits feedback'
);

-- DOWN
DELETE FROM email_templates WHERE name = 'feedback-notification';
