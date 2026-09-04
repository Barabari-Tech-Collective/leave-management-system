const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// Barabari Collective HTML Template Layout Wrapper
const wrapBarabariTemplate = ({ title, subtitle, content }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
    .header { background-color: #FACC15; padding: 28px 24px; text-align: center; border-bottom: 4px solid #1E3A8A; }
    .logo-img { height: 48px; width: auto; margin-bottom: 8px; border-radius: 8px; }
    .header-badge { background-color: #1E3A8A; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 12px; letter-spacing: 1px; text-transform: uppercase; display: inline-block; }
    .header-title { color: #1E3A8A; font-size: 22px; font-weight: 900; margin: 10px 0 2px 0; text-transform: uppercase; }
    .header-subtitle { color: #1E40AF; font-size: 13px; font-weight: 600; margin: 0; }
    .body-content { padding: 28px; color: #334155; line-height: 1.6; font-size: 15px; }
    .info-box { background-color: #EFF6FF; border-left: 4px solid #1D4ED8; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .footer { background-color: #0F172A; color: #94A3B8; padding: 24px; text-align: center; font-size: 12px; border-top: 1px solid #1E293B; }
    .footer strong { color: #FACC15; }
    .btn { display: inline-block; background-color: #1E3A8A; color: #FFFFFF !important; padding: 12px 24px; border-radius: 10px; font-weight: 700; text-decoration: none; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <!-- Public image link for logo -->
      <img src="https://leaveportal.barabaricollective.org/favicon.png" alt="Barabari Collective Logo" class="logo-img" />
      <br/>
      <span class="header-badge">The Barabari Collective</span>
      <h1 class="header-title">${title}</h1>
      <p class="header-subtitle">${subtitle}</p>
    </div>
    
    <div class="body-content">
      ${content}
      
      <div style="text-align: center; margin-top: 24px;">
        <a href="https://leaveportal.barabaricollective.org" class="btn">Open Leave Portal</a>
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0; font-size: 13px; font-weight: 600; color: #F1F5F9;">The Barabari Collective</p>
      <p style="margin: 4px 0 12px 0;">Building an India where underserved talent drives innovation.</p>
      <hr style="border: 0; border-top: 1px solid #334155; margin: 12px 0;" />
      <p style="margin: 0;"><strong>© 2026 The Barabari Collective</strong> • All Rights Reserved</p>
    </div>
  </div>
</body>
</html>
`;

// 1. Leave Application Notification
const sendLeaveEmail = async ({
  leave,
  employee,
  recipients = [],
  founderEmail
}) => {
  try {
    const allEmails = Array.from(
      new Set([...recipients, founderEmail].filter(Boolean))
    );

    if (allEmails.length === 0) {
      console.warn("[Email Warning]: No recipient emails found.");
      return;
    }

    const fromStr = new Date(leave.fromDate).toLocaleDateString("en-GB");
    const toStr = new Date(leave.toDate).toLocaleDateString("en-GB");

    const htmlBody = wrapBarabariTemplate({
      title: "Leave Request",
      subtitle: `${employee.vertical || "General"} Vertical`,
      content: `
        <p style="font-size: 16px;">Hi Team,</p>
        <p><strong>${employee.name}</strong> has submitted a new leave application.</p>
        
        <div class="info-box">
          <p style="margin: 0 0 8px 0; font-weight: 700; color: #1E3A8A;">Application Details:</p>
          <ul style="margin: 0; padding-left: 20px; color: #334155;">
            <li><strong>Leave Type:</strong> ${leave.type.toUpperCase()}</li>
            <li><strong>Duration:</strong> ${leave.days} Day(s) (${fromStr} to ${toStr})</li>
            <li><strong>Reason:</strong> ${leave.reason}</li>
          </ul>
        </div>
        
        <p>Please log in to the portal to review or approve this request.</p>
      `
    });

    const { data, error } = await resend.emails.send({
      from: "Leave Portal <leaves@barabaricollective.org>",
      to: allEmails,
      subject: `Leave Request (${employee.vertical} Vertical) - ${employee.name}`,
      html: htmlBody
    });

    if (error) {
      console.error("[Resend Error]:", error);
      return;
    }

    console.log("[Resend Success]: Leave email dispatched ID:", data.id);
  } catch (err) {
    console.error("[Server Error]:", err);
  }
};

// 2. Approval / Rejection Notification
const sendApprovalEmail = async ({
  employeeEmail,
  employeeName,
  status,
  leave
}) => {
  try {
    if (!employeeEmail) return;

    const fromStr = new Date(leave.fromDate).toLocaleDateString("en-GB");
    const toStr = new Date(leave.toDate).toLocaleDateString("en-GB");
    const isApproved = status === "approved";

    const htmlBody = wrapBarabariTemplate({
      title: `Leave ${status.toUpperCase()}`,
      subtitle: `Status Update Notification`,
      content: `
        <p style="font-size: 16px;">Hi <strong>${employeeName}</strong>,</p>
        <p>Your leave application from <strong>${fromStr}</strong> to <strong>${toStr}</strong> (${leave.days} days) has been <strong style="color: ${isApproved ? '#16A34A' : '#DC2626'};">${status.toUpperCase()}</strong>.</p>
        
        <div class="info-box" style="border-left-color: ${isApproved ? '#16A34A' : '#DC2626'}; bg-color: ${isApproved ? '#F0FDF4' : '#FEF2F2'};">
          <p style="margin: 0;"><strong>Reason provided:</strong> ${leave.reason}</p>
        </div>

        <p>Warm regards,<br/><strong>Team Barabari Collective</strong></p>
      `
    });

    const { data, error } = await resend.emails.send({
      from: "Leave Portal <leaves@barabaricollective.org>",
      to: [employeeEmail],
      subject: `Leave Request ${status.toUpperCase()} - ${employeeName}`,
      html: htmlBody
    });

    if (error) {
      console.error("[Resend Error]:", error);
      return;
    }

    console.log(`[Resend Success]: Approval email sent to ${employeeEmail}`);
  } catch (err) {
    console.error("[Server Error]:", err);
  }
};

// 3. Automated National Holiday Email
const sendNationalHolidayEmail = async (holidayName, dateStr, allEmployeeEmails) => {
  try {
    const htmlBody = wrapBarabariTemplate({
      title: "National Holiday Notice",
      subtitle: "Organization Holiday Announcement",
      content: `
        <p style="font-size: 16px;">Hi Everyone,</p>
        <p>This is a reminder that <strong>The Barabari Collective</strong> will remain closed on <strong>${dateStr}</strong> on account of <strong>${holidayName}</strong>.</p>
        
        <div class="info-box">
          <p style="margin:0 0 6px 0; font-weight:700; color:#1E3A8A;">Holiday Details:</p>
          <p style="margin:0;">• <strong>Occasion:</strong> ${holidayName}</p>
          <p style="margin:4px 0 0 0;">• <strong>Date:</strong> ${dateStr}</p>
          <p style="margin:4px 0 0 0;">• <strong>Type:</strong> Fixed Paid Holiday</p>
        </div>

        <p>Wishing you all a wonderful and restful day off!</p>
        <p>Warm regards,<br/><strong>The Barabari Collective</strong></p>
      `
    });

    const { data, error } = await resend.emails.send({
      from: "Leave Portal <leaves@barabaricollective.org>",
      to: allEmployeeEmails,
      subject: `📢 Holiday Reminder: ${holidayName} (${dateStr})`,
      html: htmlBody
    });

    if (error) {
      console.error("[Resend Error]: Failed to send holiday email:", error);
      return;
    }

    console.log(`[Resend Success]: National Holiday email sent to org! ID:`, data.id);
  } catch (err) {
    console.error("[Server Error]: Failed to trigger holiday email:", err);
  }
};

// Send Welcome Email with Credentials
const sendWelcomeEmail = async ({ name, email, password, vertical, jobRole }) => {
  const portalUrl = process.env.FRONTEND_URL || "https://leaveportal.barabaricollective.org";

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-radius: 12px;">
      <h2 style="color: #4f46e5; text-align: center;">Welcome to The Barabari Collective! 🎉</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your official account for <strong>The Barabari Collective Leave Portal</strong> has been provisioned.</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #334155;">Your Account Details:</h4>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${password}</code></p>
        <p style="margin: 5px 0;"><strong>Assigned Vertical:</strong> ${vertical} Vertical</p>
        ${jobRole ? `<p style="margin: 5px 0;"><strong>Designation:</strong> ${jobRole}</p>` : ''}
      </div>

      <h4 style="color: #334155;">What you can do on the portal:</h4>
      <ul>
        <li><strong>Apply for Leaves:</strong> Submit Casual, Sick, or Flexible Cultural leave requests with automated calculations.</li>
        <li><strong>Track Balances:</strong> View real-time available leave counts on your personal dashboard.</li>
        <li><strong>Zero Setup Notifications:</strong> Requests automatically alert your Vertical Lead, teammates, Founders, and Admins.</li>
      </ul>

      <div style="text-align: center; margin-top: 25px;">
        <a href="${portalUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; inline-block;">Access Leave Portal</a>
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 30px; text-align: center;">
        You can log in directly using your Google Workspace account or use your email and temporary password (with the option to update your password on first login).
      </p>
    </div>
  `;

  // Use your existing email dispatch mechanism (e.g., Resend / Nodemailer)
  return await sendEmail({
    to: email,
    subject: "Welcome to The Barabari Collective - Your Leave Portal Account",
    html: htmlContent
  });
};

module.exports = { sendLeaveEmail, sendApprovalEmail, sendNationalHolidayEmail, sendWelcomeEmail };