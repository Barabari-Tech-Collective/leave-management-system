const { Resend } = require("resend");
const {
  buildLeaveRequestEmail,
  buildLeaveDecisionEmail,
  buildLeaveCancellationEmail,
  buildWelcomeEmail,
  buildNationalHolidayEmail
} = require("../templates/emailTemplates");

let resendClient = null;
const getResendClient = () => {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY || "missing_resend_api_key";
    resendClient = new Resend(key);
  }
  return resendClient;
};

const getSenderEmail = () => process.env.EMAIL_FROM || "Leave Portal <leaves@barabaricollective.org>";

// Helper to clean and deduplicate emails
const sanitizeEmails = (emailInputs) => {
  const result = [];
  (emailInputs || []).forEach((item) => {
    if (!item) return;
    if (typeof item === "string") {
      item.split(",").forEach((email) => {
        const cleaned = email.trim().toLowerCase();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
          result.push(cleaned);
        }
      });
    }
  });
  return Array.from(new Set(result));
};

// 1. Leave Application Notification (Standard and Past Leaves)
const sendLeaveEmail = async ({
  leave,
  employee,
  recipients = [],
  founderEmails
}) => {
  const sender = getSenderEmail();
  const effectiveFounder = founderEmails || process.env.FOUNDER_EMAILS || process.env.FOUNDER_EMAIL || "harihar@barabaricollective.org";
  const allEmails = sanitizeEmails([...recipients, effectiveFounder]);

  try {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.trim() === "") {
      console.warn("⚠️ [Email Warning]: RESEND_API_KEY is not configured. Email will not be dispatched.");
      return { success: false, error: "RESEND_API_KEY is not configured in server environment." };
    }

    if (allEmails.length === 0) {
      console.warn("[Email Warning]: No valid recipient emails found.");
      return { success: false, error: "No valid recipient emails found." };
    }

    const { subject, html } = buildLeaveRequestEmail({ leave, employee });

    const { data, error } = await getResendClient().emails.send({
      from: sender,
      to: allEmails,
      subject,
      html
    });

    if (error) {
      console.error("==================================================");
      console.error("🚨 [Resend Email Dispatch Error]");
      console.error("Error Name   :", error.name);
      console.error("Error Message:", error.message);
      console.error("Status Code  :", error.statusCode);

      const errMsg = (error.message || "").toLowerCase();
      const errName = (error.name || "").toLowerCase();

      if (
        error.statusCode === 429 ||
        errName.includes("rate_limit") ||
        errMsg.includes("rate limit") ||
        errMsg.includes("quota") ||
        errMsg.includes("monthly limit") ||
        errMsg.includes("3000")
      ) {
        console.error("⚠️ DIAGNOSTIC: Resend rate limit or monthly quota (e.g., 3,000 monthly limit / 100 daily limit) reached.");
        console.error("👉 ACTION: Check account usage / plan at https://resend.com/overview");
      } else if (
        error.statusCode === 403 ||
        errMsg.includes("domain") ||
        errMsg.includes("not verified")
      ) {
        console.error(`⚠️ DIAGNOSTIC: Sender domain in '${sender}' is not verified on Resend for this API key.`);
        console.error("👉 ACTION: Verify 'barabaricollective.org' at https://resend.com/domains or configure verified EMAIL_FROM in .env");
      } else if (
        errName.includes("validation") ||
        errMsg.includes("invalid") ||
        error.statusCode === 422
      ) {
        console.error("⚠️ DIAGNOSTIC: Resend validation error. Check recipient email formats.");
      } else if (error.statusCode === 401 || errMsg.includes("api key")) {
        console.error("⚠️ DIAGNOSTIC: Invalid or missing RESEND_API_KEY. Verify backend/.env file.");
      }
      console.error("Attempted Recipients:", allEmails);
      console.error("==================================================");

      return {
        success: false,
        error: error.message || error.name || "Failed to dispatch email via Resend"
      };
    }

    console.log("[Resend Accepted]: Leave email accepted by provider. ID:", data?.id);
    return {
      success: true,
      messageId: data?.id
    };
  } catch (err) {
    console.error("==================================================");
    console.error("🚨 [Server Error in sendLeaveEmail]:", err.message);
    console.error("==================================================");
    return {
      success: false,
      error: err.message || "Internal server error during email dispatch"
    };
  }
};

// 2. Approval / Rejection Notification
const sendApprovalEmail = async ({
  employeeEmail,
  employeeName,
  status,
  leave,
  rejectionReason = ""
}) => {
  try {
    const cleanedEmail = (employeeEmail || "").trim().toLowerCase();
    if (!cleanedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
      console.error("[sendApprovalEmail]: Invalid recipient employee email provided:", employeeEmail);
      return {
        success: false,
        error: "Employee email address is missing or invalid."
      };
    }

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.trim() === "") {
      console.warn("⚠️ [Email Warning]: RESEND_API_KEY is not configured. Approval email will not be dispatched.");
      return { success: false, error: "RESEND_API_KEY is not configured in server environment." };
    }

    const { subject, html } = buildLeaveDecisionEmail({
      employeeName,
      status,
      leave,
      rejectionReason
    });

    const sender = getSenderEmail();
    const { data, error } = await getResendClient().emails.send({
      from: sender,
      to: [cleanedEmail],
      subject,
      html
    });

    if (error) {
      console.error("==================================================");
      console.error(`🚨 [Resend Error in sendApprovalEmail (${status})]:`, error.message || error);
      console.error("Recipient:", employeeEmail);
      console.error("==================================================");
      return {
        success: false,
        error: error.message || error.name || "Failed to dispatch status email via Resend"
      };
    }

    console.log(`[Resend Success]: ${status.toUpperCase()} email sent to ${employeeEmail}. ID:`, data?.id);
    return {
      success: true,
      messageId: data?.id
    };
  } catch (err) {
    console.error("==================================================");
    console.error(`🚨 [Server Error in sendApprovalEmail (${status})]:`, err.message);
    console.error("==================================================");
    return {
      success: false,
      error: err.message || "Internal server error during approval email dispatch"
    };
  }
};

// 3. Automated National Holiday Email (Batched in chunks of <= 45 via BCC for privacy and Resend 50-recipient limit compliance)
const sendNationalHolidayEmail = async (holidayName, dateStr, allEmployeeEmails) => {
  try {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.trim() === "") {
      console.warn("⚠️ [Email Warning]: RESEND_API_KEY is not configured. Holiday email will not be dispatched.");
      return;
    }

    const cleanEmails = sanitizeEmails(allEmployeeEmails);
    if (cleanEmails.length === 0) {
      console.warn("[Holiday Email]: No valid recipient emails found.");
      return;
    }

    const sender = getSenderEmail();
    const { subject, html } = buildNationalHolidayEmail({ holidayName, dateStr });

    // Resend allows max 50 recipients per request. We batch in chunks of 40 using BCC for privacy.
    const BATCH_SIZE = 40;
    for (let i = 0; i < cleanEmails.length; i += BATCH_SIZE) {
      const batch = cleanEmails.slice(i, i + BATCH_SIZE);
      try {
        const { data, error } = await getResendClient().emails.send({
          from: sender,
          to: [sender], // Sender in To header ensures employee emails remain private
          bcc: batch,
          subject,
          html
        });

        if (error) {
          console.error(`[Resend Error]: Batch ${Math.floor(i / BATCH_SIZE) + 1} holiday email failed:`, error);
        } else {
          console.log(`[Resend Success]: Batch ${Math.floor(i / BATCH_SIZE) + 1} holiday email sent! ID:`, data?.id);
        }
      } catch (batchErr) {
        console.error(`[Resend Error]: Batch ${Math.floor(i / BATCH_SIZE) + 1} holiday email threw:`, batchErr.message);
      }
    }
  } catch (err) {
    console.error("[Server Error]: Failed to trigger holiday email:", err);
  }
};

// 4. Send Welcome Email with Credentials
const sendWelcomeEmail = async ({ name, email, password, vertical, jobRole }) => {
  try {
    if (!email) return false;

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.trim() === "") {
      console.warn("⚠️ [Email Warning]: RESEND_API_KEY is not configured. Welcome email will not be dispatched.");
      return false;
    }

    const { subject, html } = buildWelcomeEmail({
      name,
      email,
      password,
      vertical,
      jobRole
    });

    const { data, error } = await getResendClient().emails.send({
      from: getSenderEmail(),
      to: [email],
      subject,
      html
    });

    if (error) {
      console.error("[Resend Welcome Email Error]:", error);
      return false;
    }

    console.log(`[Resend Success]: Welcome email dispatched to ${email}. ID:`, data.id);
    return true;
  } catch (err) {
    console.error("[Server Welcome Email Error]:", err);
    return false;
  }
};

// 5. Send Leave Cancellation Email
const sendCancellationEmail = async ({
  leave,
  employee,
  cancelledBy = null,
  previousStatus = "pending",
  recipients = [],
  founderEmails = ""
}) => {
  try {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.trim() === "") {
      console.warn("⚠️ [Email Warning]: RESEND_API_KEY is not configured. Cancellation email will not be dispatched.");
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const { subject, html } = buildLeaveCancellationEmail({
      leave,
      employee,
      cancelledBy,
      previousStatus
    });

    const parsedFounders = (founderEmails || "").split(",").map((e) => e.trim());
    const allEmails = sanitizeEmails([...recipients, ...parsedFounders]);

    if (allEmails.length === 0) {
      return { success: false, error: "No valid recipient email addresses found." };
    }

    const { data, error } = await getResendClient().emails.send({
      from: getSenderEmail(),
      to: allEmails,
      subject,
      html
    });

    if (error) {
      console.error("[Resend Error in sendCancellationEmail]:", error);
      return { success: false, error: error.message };
    }

    console.log("[Resend Success]: Cancellation email dispatched. ID:", data?.id);
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error("[Server Error in sendCancellationEmail]:", err);
    return { success: false, error: err.message };
  }
};

module.exports = {
  sendLeaveEmail,
  sendApprovalEmail,
  sendNationalHolidayEmail,
  sendWelcomeEmail,
  sendCancellationEmail
};
