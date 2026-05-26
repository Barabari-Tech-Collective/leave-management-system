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
    await resend.emails.send({
      from: "leaves@barabaricollective.org",

      // Main receiver
      to: adminEmails,

      // CC founder + managers
      cc: [...managerEmails, founderEmail].filter(Boolean),

      subject: `Leave Request - ${leave.reason}`,

      text: `
Hi,

${employee.name} wants leave from ${leave.fromDate} to ${leave.toDate}.

Reason: ${leave.reason}

Regards,
${employee.name}
`
    });

    console.log("Leave email sent successfully");
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
    await resend.emails.send({
      from: "onboarding@resend.dev",

      to: employeeEmail,

      subject: `Leave ${status.toUpperCase()}`,

      text: `
Hi ${employeeName},

Your leave request from ${leave.fromDate} to ${leave.toDate} has been ${status}.

Reason: ${leave.reason}

Regards,
Team
`
    });

    console.log("Approval email sent successfully");
  } catch (err) {
    console.error("Approval email failed:", err);
  }
};

module.exports = { sendLeaveEmail, sendApprovalEmail };