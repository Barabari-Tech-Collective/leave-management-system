const User = require("../models/User");

// Helper to retrieve finance team notification emails from environment variables
const getFinanceEmails = () => {
  const envFinance = process.env.FINANCE_EMAILS || process.env.FINANCE_EMAIL || "";
  return envFinance
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
};

// Fetch active team members, admins, and optionally finance team for leave notifications
const getNotificationRecipients = async (employee, { isExtraLeave = false } = {}) => {
  if (!employee) {
    const finance = isExtraLeave ? getFinanceEmails() : [];
    return {
      teamEmails: [],
      adminEmails: [],
      financeEmails: finance,
      recipients: finance,
      founderEmails: process.env.FOUNDER_EMAILS || process.env.FOUNDER_EMAIL || "harihar@barabaricollective.org"
    };
  }

  const applicantId = employee._id ? employee._id.toString() : null;
  const applicantEmail = (employee.email || "").trim().toLowerCase();

  // 1. Team members in the same vertical (excluding applicant and deactivated members)
  const teamMembers = employee.vertical
    ? await User.find({
        vertical: employee.vertical,
        _id: { $ne: employee._id },
        isDeleted: { $ne: true }
      }).select("email")
    : [];

  const teamEmails = Array.from(
    new Set(
      teamMembers
        .map((m) => (m.email || "").trim().toLowerCase())
        .filter((e) => e && e !== applicantEmail)
    )
  );

  // 2. Admins from database + environment variables (excluding applicant)
  const envAdmins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && e !== applicantEmail);

  const dbAdmins = await User.find({
    role: { $in: ["admin", "founder"] },
    isDeleted: { $ne: true },
    ...(applicantId ? { _id: { $ne: employee._id } } : {})
  }).select("email");

  const dbAdminEmails = dbAdmins
    .map((a) => (a.email || "").trim().toLowerCase())
    .filter((e) => e && e !== applicantEmail);

  const adminEmails = Array.from(new Set([...dbAdminEmails, ...envAdmins].filter(Boolean)));

  const founderEmails = process.env.FOUNDER_EMAILS || process.env.FOUNDER_EMAIL || "harihar@barabaricollective.org";

  // 3. Finance team emails (included if this is an Extra Leave)
  const financeEmails = isExtraLeave ? getFinanceEmails() : [];

  // Deduplicate all recipient emails so no member receives duplicate notifications
  const recipients = Array.from(new Set([...teamEmails, ...adminEmails, ...financeEmails]));

  return {
    teamEmails,
    adminEmails,
    financeEmails,
    recipients,
    founderEmails
  };
};

module.exports = { getNotificationRecipients, getFinanceEmails };
