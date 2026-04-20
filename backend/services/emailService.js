const nodemailer = require("nodemailer");

const sendLeaveEmail = async ({
  leave,
  employee,
  managerEmails = [],
  founderEmail,
  adminEmail
}) => {
  // const managerEmail = "syedmateen1623@gmail.com";
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });


  console.log("EMAIL:", process.env.EMAIL_USER);
  console.log("PASS:", process.env.EMAIL_PASS);

  await transporter.sendMail({
    from: process.env.EMAIL_USER,

    // Main receiver
    to: adminEmail,

    // CC founder + reporting manager
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
};


const sendApprovalEmail = async ({
  employeeEmail,
  employeeName,
  status,
  leave
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
};

module.exports = { sendLeaveEmail, sendApprovalEmail };
