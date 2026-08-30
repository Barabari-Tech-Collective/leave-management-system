const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendLeaveEmail = async ({
  leave,
  employee,
  managerEmails = [],
  founderEmail,
  adminEmails = []
}) => {
  try {
    // 1. Combine all primary recipients and deduplicate
    const primaryRecipients = Array.from(
      new Set([...adminEmails, ...managerEmails, founderEmail].filter(Boolean))
    );

    // Fallback if no recipients are found
    if (primaryRecipients.length === 0) {
      console.warn("No recipients available to send leave email.");
      return;
    }

    // 2. Format dates for clean email display
    const fromStr = new Date(leave.fromDate).toLocaleDateString("en-GB");
    const toStr = new Date(leave.toDate).toLocaleDateString("en-GB");

    await resend.emails.send({
      // Use "onboarding@resend.dev" if your domain isn't verified in Resend yet
      from: "Leave Portal <leaves@barabaricollective.org>",
      to: primaryRecipients,
      subject: `Leave Request (${employee.vertical} Vertical) - ${employee.name}`,
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

    console.log("Leave email sent successfully to:", primaryRecipients);
  } catch (err) {
    console.error("Leave email failed:", err);
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
      console.warn("No employee email provided for status update.");
      return;
    }

    const fromStr = new Date(leave.fromDate).toLocaleDateString("en-GB");
    const toStr = new Date(leave.toDate).toLocaleDateString("en-GB");

    await resend.emails.send({
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

    console.log(`Approval email (${status}) sent successfully to: ${employeeEmail}`);
  } catch (err) {
    console.error("Approval email failed:", err);
  }
};

module.exports = { sendLeaveEmail, sendApprovalEmail };