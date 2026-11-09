const User = require("../models/User");

// Fetch active team members and admins for leave notifications (excluding soft-deleted users and the applicant themselves)
const getNotificationRecipients = async (employee) => {
  if (!employee) {
    return {
      teamEmails: [],
      adminEmails: [],
      recipients: [],
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

  // Deduplicate all recipient emails so no member receives duplicate notifications
  const recipients = Array.from(new Set([...teamEmails, ...adminEmails]));

  return {
    teamEmails,
    adminEmails,
    recipients,
    founderEmails
  };
};

module.exports = { getNotificationRecipients };
