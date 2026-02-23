const nodemailer = require("nodemailer");

const sendLeaveEmail = async ({
  leave,
  employee,
  managerEmail,
  founderEmail,
  adminEmail
}) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,

    // Main receiver
    to: adminEmail,

    // CC founder + reporting manager
    cc: [managerEmail, founderEmail].filter(Boolean),

    subject: `Leave Request - ${leave.reason}`,

    text: `
Hi,

${employee.name} wants leave from ${leave.fromDate} to ${leave.toDate}.
Reason: ${leave.reason}

Regards,
${employee.name}
`
  });
};

module.exports = sendLeaveEmail;