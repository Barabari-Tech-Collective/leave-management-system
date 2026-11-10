// Helper to escape HTML characters in dynamic user content (XSS protection)
const escapeHtml = (str) => {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Fallback frontend URL in case process.env.FRONTEND_URL is missing
const getFrontendUrl = () => process.env.FRONTEND_URL || "https://leaveportal.barabaricollective.org";

// Shared Barabari Collective Brand Layout Wrapper
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
        <a href="${getFrontendUrl()}" class="btn">Open Leave Portal</a>
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

// 1. Leave Application Notification (Standard & Past Emergency Leaves & Extra Leaves)
const buildLeaveRequestEmail = ({ leave, employee }) => {
  const fromStr = new Date(leave.fromDate).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
  const toStr = new Date(leave.toDate).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
  const isPastLeave = Boolean(leave.isPastLeave);
  const isExtraLeave = Boolean(leave.isExtraLeave || leave.type === "extra");
  const safeEmpName = escapeHtml(employee?.name || "Team Member");
  const safeVertical = escapeHtml(employee?.vertical || "General");
  const safeReason = escapeHtml(leave.reason || "N/A");

  const extraPrefix = isExtraLeave ? "[EXTRA LEAVE] " : "";
  const emailTitle = isExtraLeave
    ? (isPastLeave ? "Extra Leave Recorded" : "Extra Leave Request")
    : (isPastLeave ? "Past Leave Record" : "Leave Request");
  const emailSubtitle = isPastLeave
    ? `${safeVertical} Vertical • Past Leave Record`
    : `${safeVertical} Vertical`;
  const emailSubject = `${extraPrefix}${isPastLeave ? "Past Leave Record" : "Leave Request"} (${safeVertical} Vertical) - ${safeEmpName}`;

  const extraNoticeBox = isExtraLeave
    ? `
      <div style="background-color: #FEF3C7; border-left: 4px solid #D97706; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; font-weight: 800; color: #92400E; font-size: 14px;">⚠️ EXTRA LEAVE NOTICE</p>
        <p style="margin: 4px 0 0 0; color: #78350F; font-size: 13px;">
          This employee has exhausted their 26 annual paid leaves. This request is treated as an <strong>Extra Leave</strong> and forwarded to the <strong>Finance Team</strong> for payroll processing.
        </p>
      </div>
    `
    : "";

  const contentHtml = isPastLeave
    ? `
      <p style="font-size: 16px;">Hi Team,</p>
      <p><strong>${safeEmpName}</strong> has recorded a past leave taken.</p>
      ${extraNoticeBox}
      <div class="info-box">
        <p style="margin: 0 0 8px 0; font-weight: 700; color: #1E3A8A;">Leave Details:</p>
        <ul style="margin: 0; padding-left: 20px; color: #334155;">
          <li><strong>Leave Type:</strong> ${isExtraLeave ? "EXTRA LEAVE" : escapeHtml(leave.type.toUpperCase())}</li>
          <li><strong>Duration:</strong> ${leave.days} Day(s) (${fromStr} to ${toStr})</li>
          <li><strong>Reason:</strong> ${safeReason}</li>
          <li><strong>Status:</strong> <span style="color: #16A34A; font-weight: 700;">RECORDED</span></li>
        </ul>
      </div>
      
      <p style="color: #64748B; font-size: 14px;">Note: This leave was already taken in the past and has been automatically recorded in the system. No approval action is required.</p>
    `
    : `
      <p style="font-size: 16px;">Hi Team,</p>
      <p><strong>${safeEmpName}</strong> has submitted a new leave application.</p>
      ${extraNoticeBox}
      <div class="info-box">
        <p style="margin: 0 0 8px 0; font-weight: 700; color: #1E3A8A;">Application Details:</p>
        <ul style="margin: 0; padding-left: 20px; color: #334155;">
          <li><strong>Leave Type:</strong> ${isExtraLeave ? "EXTRA LEAVE" : escapeHtml(leave.type.toUpperCase())}</li>
          <li><strong>Duration:</strong> ${leave.days} Day(s) (${fromStr} to ${toStr})</li>
          <li><strong>Reason:</strong> ${safeReason}</li>
        </ul>
      </div>
      
      <p>Please log in to the portal to review or approve this request.</p>
    `;

  return {
    subject: emailSubject,
    html: wrapBarabariTemplate({
      title: emailTitle,
      subtitle: emailSubtitle,
      content: contentHtml
    })
  };
};

// 2. Decision Notification (Approved / Declined)
const buildLeaveDecisionEmail = ({
  employeeName,
  status,
  leave,
  rejectionReason = ""
}) => {
  const fromStr = new Date(leave.fromDate).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
  const toStr = new Date(leave.toDate).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
  const isApproved = status === "approved";
  const isExtraLeave = Boolean(leave.isExtraLeave || leave.type === "extra");
  const safeEmpName = escapeHtml(employeeName);
  const safeReason = escapeHtml(leave.reason || "N/A");
  const safeRejectionReason = escapeHtml(rejectionReason);

  const extraPrefix = isExtraLeave ? "[EXTRA LEAVE] " : "";
  const subject = `${extraPrefix}Leave Request ${status.toUpperCase()} - ${safeEmpName}`;

  const extraNoticeBox = isExtraLeave
    ? `
      <div style="background-color: #FEF3C7; border-left: 4px solid #D97706; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; font-weight: 800; color: #92400E; font-size: 14px;">⚠️ EXTRA LEAVE RECORD</p>
        <p style="margin: 4px 0 0 0; color: #78350F; font-size: 13px;">
          This decision applies to an <strong>Extra Leave</strong> (granted beyond the 26 annual paid leaves). Forwarded to the <strong>Finance Team</strong> for payroll processing.
        </p>
      </div>
    `
    : "";

  const html = wrapBarabariTemplate({
    title: isApproved
      ? (isExtraLeave ? "Extra Leave Approved ✅" : "Leave Request Approved ✅")
      : (isExtraLeave ? "Extra Leave Declined ❌" : "Leave Request Declined ❌"),
    subtitle: "Status Update Notification",
    content: `
      <p style="font-size: 16px;">Hi <strong>${safeEmpName}</strong>,</p>
      <p>Your ${isExtraLeave ? "<strong>Extra Leave</strong>" : "leave"} application for <strong>${leave.days} day(s)</strong> (${fromStr} to ${toStr}) has been <strong style="color: ${isApproved ? '#16A34A' : '#DC2626'};">${status.toUpperCase()}</strong>.</p>
      ${extraNoticeBox}
      <div class="info-box" style="border-left-color: ${isApproved ? '#16A34A' : '#DC2626'}; background-color: ${isApproved ? '#F0FDF4' : '#FEF2F2'};">
        <p style="margin: 0; color: #334155;"><strong>Your Applied Reason:</strong> ${safeReason}</p>
        ${
          !isApproved && safeRejectionReason
            ? `<p style="margin: 8px 0 0 0; color: #DC2626; font-weight: 700;"><strong>Rejection Remark from Lead/Admin:</strong> ${safeRejectionReason}</p>`
            : ""
        }
      </div>

      <p>Warm regards,<br/><strong>Team Barabari Collective</strong></p>
    `
  });

  return { subject, html };
};

// 3. Leave Cancellation Notification (Self-service & Admin Revoke)
const buildLeaveCancellationEmail = ({
  leave,
  employee,
  cancelledBy = null,
  previousStatus = "pending"
}) => {
  const fromStr = new Date(leave.fromDate).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
  const toStr = new Date(leave.toDate).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });

  const safeEmpName = escapeHtml(employee?.name || "Team Member");
  const safeEmpVertical = escapeHtml(employee?.vertical || leave?.vertical || "General");
  const safeReason = escapeHtml(leave.reason || "N/A");

  const isPrivilegedAdmin = cancelledBy && (cancelledBy.role === "admin" || cancelledBy.role === "founder");
  const isAdminOverride = isPrivilegedAdmin && (
    previousStatus === "approved" ||
    (cancelledBy._id && employee?._id && cancelledBy._id.toString() !== employee._id.toString())
  );
  const isApprovedCancellation = previousStatus === "approved";

  let emailTitle = "Leave Cancelled";
  let emailSubtitle = `${safeEmpVertical} Vertical • Request Cancelled`;
  let emailSubject = `Cancelled Leave Request (${safeEmpVertical} Vertical) - ${safeEmpName}`;
  let introParagraph = `<p><strong>${safeEmpName}</strong> has cancelled their pending leave request.</p>`;
  let footerNote = `<p style="color: #64748B; font-size: 14px;">Note: This request has been withdrawn by the employee. No approval action is required from your side.</p>`;

  if (isApprovedCancellation && isAdminOverride) {
    const adminRoleLabel = cancelledBy?.role === "founder" ? "Founder" : "Administrator";
    const adminName = escapeHtml(cancelledBy?.name || adminRoleLabel);
    emailTitle = "Approved Leave Cancelled";
    emailSubtitle = `${safeEmpVertical} Vertical • Approved Leave Cancelled by ${adminRoleLabel}`;
    emailSubject = `Approved Leave Cancelled (${safeEmpVertical} Vertical) - ${safeEmpName}`;
    introParagraph = `<p>An approved leave request for <strong>${safeEmpName}</strong> has been cancelled by an <strong>${adminRoleLabel} (${adminName})</strong>.</p>`;
    footerNote = `<p style="color: #64748B; font-size: 14px;">Note: This approved leave has been revoked by ${adminRoleLabel}. The deducted <strong>${leave.days} day(s)</strong> have been automatically restored to the employee's balance.</p>`;
  } else if (isAdminOverride) {
    const adminRoleLabel = cancelledBy?.role === "founder" ? "Founder" : "Administrator";
    const adminName = escapeHtml(cancelledBy?.name || adminRoleLabel);
    emailTitle = `Leave Cancelled by ${adminRoleLabel}`;
    emailSubtitle = `${safeEmpVertical} Vertical • Request Cancelled by ${adminRoleLabel}`;
    emailSubject = `Leave Request Cancelled by ${adminRoleLabel} (${safeEmpVertical} Vertical) - ${safeEmpName}`;
    introParagraph = `<p>A pending leave request for <strong>${safeEmpName}</strong> has been cancelled by an <strong>${adminRoleLabel} (${adminName})</strong>.</p>`;
    footerNote = `<p style="color: #64748B; font-size: 14px;">Note: This pending leave request was withdrawn by ${adminRoleLabel}. No further approval action is required.</p>`;
  }

  const html = wrapBarabariTemplate({
    title: emailTitle,
    subtitle: emailSubtitle,
    content: `
      <p style="font-size: 16px;">Hi Team,</p>
      ${introParagraph}
      
      <div class="info-box">
        <p style="margin: 0 0 8px 0; font-weight: 700; color: #1E3A8A;">Cancelled Request Details:</p>
        <ul style="margin: 0; padding-left: 20px; color: #334155;">
          <li><strong>Leave Type:</strong> ${leave.type === "extra" || leave.isExtraLeave ? "EXTRA LEAVE" : escapeHtml(leave.type.toUpperCase())}</li>
          <li><strong>Duration:</strong> ${leave.days} Day(s) (${fromStr} to ${toStr})</li>
          <li><strong>Reason:</strong> ${safeReason}</li>
          <li><strong>Status:</strong> <span style="color: #64748B; font-weight: 700;">CANCELLED</span></li>
        </ul>
      </div>
      
      ${footerNote}
    `
  });

  return { subject: emailSubject, html };
};

// 4. Welcome Email with Credentials
const buildWelcomeEmail = ({ name, email, password, vertical, jobRole }) => {
  const safeName = escapeHtml(name);
  const safeVertical = escapeHtml(vertical);
  const safeJobRole = escapeHtml(jobRole);

  const subject = "Welcome to The Barabari Collective - Account Credentials";

  const html = wrapBarabariTemplate({
    title: "Welcome! 🎉",
    subtitle: "Your Account Credentials",
    content: `
      <p style="font-size: 16px;">Hi <strong>${safeName}</strong>,</p>
      <p>Welcome to <strong>The Barabari Collective</strong>! Your account for the Leave Portal has been provisioned.</p>
      
      <div class="info-box">
        <p style="margin: 0 0 8px 0; font-weight: 700; color: #1E3A8A;">Your Portal Credentials:</p>
        <ul style="margin: 0; padding-left: 20px; color: #334155; line-height: 1.8;">
          <li><strong>Email:</strong> ${escapeHtml(email)}</li>
          <li><strong>Temporary Password:</strong> <code style="background: #DBEAFE; padding: 2px 8px; rounded: 6px; font-weight: bold; color: #1E3A8A;">${escapeHtml(password)}</code></li>
          <li><strong>Assigned Vertical:</strong> ${safeVertical} Vertical</li>
          ${safeJobRole ? `<li><strong>Designation:</strong> ${safeJobRole}</li>` : ""}
        </ul>
      </div>

      <p style="margin-top: 16px; font-weight: 600;">What you can do on the portal:</p>
      <ul style="color: #475569; padding-left: 20px;">
        <li><strong>Apply for Leaves:</strong> Casual, Sick, or Flexible Cultural leave</li>
        <li><strong>Real-time Balance Tracking:</strong> Check remaining leave balances instantly.</li>
        <li><strong>Zero-Setup Notifications:</strong> Automated email alerts to your Vertical Lead, teammates and Admins.</li>
      </ul>

      <p style="font-size: 13px; color: #64748B; margin-top: 20px;">
        *You can log in directly using your Google account or sign in with your email and temporary password (and change your password anytime on the login screen).*
      </p>
    `
  });

  return { subject, html };
};

// 5. Automated National Holiday Email
const buildNationalHolidayEmail = ({ holidayName, dateStr }) => {
  const subject = `Holiday Reminder: ${holidayName} (${dateStr})`;

  const html = wrapBarabariTemplate({
    title: "National Holiday Notice",
    subtitle: "Organization Holiday Announcement",
    content: `
      <p style="font-size: 16px;">Hi Everyone,</p>
      <p>This is a reminder that <strong>The Barabari Collective</strong> will remain closed on <strong>${dateStr}</strong> on account of <strong>${holidayName}</strong>.</p>
      
      <div class="info-box">
        <p style="margin:0 0 6px 0; font-weight:700; color:#1E3A8A;">Holiday Details:</p>
        <p style="margin:0;">• <strong>Occasion:</strong> ${escapeHtml(holidayName)}</p>
        <p style="margin:4px 0 0 0;">• <strong>Date:</strong> ${escapeHtml(dateStr)}</p>
        <p style="margin:4px 0 0 0;">• <strong>Type:</strong> Fixed Paid Holiday</p>
      </div>

      <p>Wishing you all a wonderful and restful day off!</p>
      <p>Warm regards,<br/><strong>The Barabari Collective</strong></p>
    `
  });

  return { subject, html };
};

module.exports = {
  escapeHtml,
  wrapBarabariTemplate,
  buildLeaveRequestEmail,
  buildLeaveDecisionEmail,
  buildLeaveCancellationEmail,
  buildWelcomeEmail,
  buildNationalHolidayEmail
};
