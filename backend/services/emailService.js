const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendLeaveEmail = async ({
  leave,
  employee,
  recipients = [],
  founderEmail
}) => {
  try {
    // Combine all recipient emails into a single deduplicated array
    const allEmails = Array.from(
      new Set([...recipients, founderEmail].filter(Boolean))
    );

    // Guard Clause: Prevent API call if array is empty
    if (allEmails.length === 0) {
      console.warn("[Email Warning]: No recipient emails found. Skipping email dispatch.");
      return;
    }

    const fromStr = new Date(leave.fromDate).toLocaleDateString("en-GB");
    const toStr = new Date(leave.toDate).toLocaleDateString("en-GB");

    // Call Resend
    const { data, error } = await resend.emails.send({
      from: "Leave Portal <leaves@barabaricollective.org>",
      to: allEmails, // Always guaranteed to have at least 1 valid email
      subject: `Leave Request (${employee.vertical || "General"} Vertical) - ${employee.name}`,
      text: `
Hi Team,

${employee.name} from the ${employee.vertical || "General"} vertical has requested leave.

Details:
- Duration: ${leave.days} day(s) (${fromStr} to ${toStr})
- Leave Type: ${leave.type}
- Reason: ${leave.reason}

Regards,
Leave Portal Automated Notification
`
    });

    // Explicitly catch Resend API errors (HTTP 422, invalid domain, missing field, etc.)
    if (error) {
      console.error("[Resend Error]: Failed to send leave email:", error);
      return;
    }

    console.log("[Resend Success]: Leave email sent to:", allEmails, "ID:", data.id);
  } catch (err) {
    console.error("[Server Error]: Failed to trigger sendLeaveEmail:", err);
  }
};

const sendApprovalEmail = async ({
  employeeEmail,
  employeeName,
  status,
  leave
}) => {
  try {
    if (!employeeEmail) {
      console.warn("[Email Warning]: Missing employee email for approval notification.");
      return;
    }

    const fromStr = new Date(leave.fromDate).toLocaleDateString("en-GB");
    const toStr = new Date(leave.toDate).toLocaleDateString("en-GB");

    const { data, error } = await resend.emails.send({
      from: "Leave Portal <leaves@barabaricollective.org>",
      to: [employeeEmail],
      subject: `Leave Request ${status.toUpperCase()} - ${employeeName}`,
      text: `
Hi ${employeeName},

Your ${leave.type} leave request from ${fromStr} to ${toStr} (${leave.days} day(s)) has been ${status.toUpperCase()}.

Reason: ${leave.reason}

Regards,
Team Barabari Collective
`
    });

    if (error) {
      console.error("[Resend Error]: Failed to send approval email:", error);
      return;
    }

    console.log(`[Resend Success]: Approval email (${status}) sent to: ${employeeEmail}`);
  } catch (err) {
    console.error("[Server Error]: Failed to trigger sendApprovalEmail:", err);
  }
};

module.exports = { sendLeaveEmail, sendApprovalEmail };