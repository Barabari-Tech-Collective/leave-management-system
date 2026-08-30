const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// Barabari Collective HTML Template Layout Wrapper
const wrapBarabariTemplate = ({ title, subtitle, content }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #E2E8F0; shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
    .header { background-color: #FACC15; padding: 32px 24px; text-align: center; border-bottom: 4px solid #1E3A8A; }
    .header-badge { background-color: #1E3A8A; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 12px; letter-spacing: 1px; text-transform: uppercase; display: inline-block; }
    .header-title { color: #1E3A8A; font-size: 24px; font-weight: 900; margin: 12px 0 4px 0; text-transform: uppercase; tracking-tight; }
    .header-subtitle { color: #1E40AF; font-size: 14px; font-weight: 600; margin: 0; }
    .body-content { padding: 32px 28px; color: #334155; line-height: 1.6; font-size: 15px; }
    .info-box { background-color: #EFF6FF; border-left: 4px solid #1D4ED8; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .footer { background-color: #0F172A; color: #94A3B8; padding: 24px; text-align: center; font-size: 12px; }
    .footer strong { color: #FACC15; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="header-badge">The Barabari Collective</span>
      <h1 class="header-title">${title}</h1>
      <p class="header-subtitle">${subtitle}</p>
    </div>
    <div class="body-content">
      ${content}
    </div>
    <div class="footer">
      <p style="margin:0;">Building an India where underserved talent drives innovation.</p>
      <p style="margin: 6px 0 0 0;"><strong>© 2026 The Barabari Collective</strong> • Leave Management Portal</p>
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

module.exports = { sendLeaveEmail, sendApprovalEmail, sendNationalHolidayEmail };