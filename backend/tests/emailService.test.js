const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const sentCalls = [];

// Mock Resend before loading emailService so no real network requests are made
const resendPath = require.resolve("resend");
require.cache[resendPath] = {
  id: resendPath,
  filename: resendPath,
  loaded: true,
  exports: {
    Resend: class MockResend {
      constructor() {
        this.emails = {
          send: async (payload, options) => {
            sentCalls.push({ payload, options });
            return { data: { id: `mock-id-${sentCalls.length}` }, error: null };
          }
        };
      }
    }
  }
};

process.env.RESEND_API_KEY = "test_resend_key";
process.env.FRONTEND_URL = "https://leaveportal.barabaricollective.org";

const User = require("../models/User");
const { sendLeaveEmail } = require("../services/emailService");
const { getNotificationRecipients } = require("../utils/recipientUtils");

const baseLeave = {
  _id: "65f1a2b3c4d5e6f7a8b9c0d1",
  type: "casual",
  fromDate: "2026-12-01T00:00:00.000Z",
  toDate: "2026-12-02T00:00:00.000Z",
  days: 2,
  reason: "Family event",
  isPastLeave: false
};

describe("sendLeaveEmail — who gets the Review & Approve button", () => {
  beforeEach(() => {
    sentCalls.length = 0;
  });

  it("sends the Review & Approve button only to Vertical Lead(s) for a regular employee", async () => {
    const result = await sendLeaveEmail({
      leave: baseLeave,
      employee: {
        name: "Asha",
        email: "asha@barabaricollective.org",
        vertical: "Tech",
        isVerticalLead: false
      },
      verticalLeadEmails: ["lead@barabaricollective.org"],
      adminEmails: ["admin@barabaricollective.org"],
      founderEmails: "founder@barabaricollective.org",
      recipients: [
        "lead@barabaricollective.org",
        "teammate@barabaricollective.org",
        "admin@barabaricollective.org"
      ]
    });

    assert.equal(result.success, true);
    assert.equal(sentCalls.length, 2);

    const approverCall = sentCalls.find((c) => c.options?.idempotencyKey?.endsWith("-approver"));
    const visibilityCall = sentCalls.find((c) => c.options?.idempotencyKey?.endsWith("-visibility"));

    assert.ok(approverCall, "Expected an approver email call");
    assert.ok(visibilityCall, "Expected a visibility email call");

    assert.deepEqual(approverCall.payload.to, ["lead@barabaricollective.org"]);
    assert.match(approverCall.payload.subject, /^\[Action Needed\] /);
    assert.match(approverCall.payload.html, /\/review-leave\/65f1a2b3c4d5e6f7a8b9c0d1/);

    assert.deepEqual(visibilityCall.payload.to, [
      "teammate@barabaricollective.org",
      "admin@barabaricollective.org",
      "founder@barabaricollective.org"
    ]);
    assert.doesNotMatch(visibilityCall.payload.subject, /^\[Action Needed\] /);
    assert.match(visibilityCall.payload.html, /shared with you for visibility/i);
  });

  it("falls back to Admins & Founders when a vertical has no eligible Vertical Lead (e.g. Operations)", async () => {
    const result = await sendLeaveEmail({
      leave: baseLeave,
      employee: {
        name: "Rohan",
        email: "rohan@barabaricollective.org",
        vertical: "Operations",
        isVerticalLead: false
      },
      verticalLeadEmails: [],
      adminEmails: ["admin@barabaricollective.org"],
      founderEmails: "founder@barabaricollective.org",
      recipients: ["teammate@barabaricollective.org", "admin@barabaricollective.org"]
    });

    assert.equal(result.success, true);
    assert.equal(sentCalls.length, 2);

    const approverCall = sentCalls.find((c) => c.options?.idempotencyKey?.endsWith("-approver"));
    const visibilityCall = sentCalls.find((c) => c.options?.idempotencyKey?.endsWith("-visibility"));

    assert.deepEqual(approverCall.payload.to, [
      "admin@barabaricollective.org",
      "founder@barabaricollective.org"
    ]);
    assert.match(approverCall.payload.html, /\/review-leave\/65f1a2b3c4d5e6f7a8b9c0d1/);
    assert.deepEqual(visibilityCall.payload.to, ["teammate@barabaricollective.org"]);
  });

  it("sends the Review & Approve button only to Admins & Founders when a Vertical Lead applies", async () => {
    const result = await sendLeaveEmail({
      leave: baseLeave,
      employee: {
        name: "Priya",
        email: "priya@barabaricollective.org",
        vertical: "Program",
        isVerticalLead: true
      },
      verticalLeadEmails: ["otherlead@barabaricollective.org"],
      adminEmails: ["admin@barabaricollective.org"],
      founderEmails: "founder@barabaricollective.org",
      recipients: [
        "priya@barabaricollective.org",
        "teammate@barabaricollective.org",
        "admin@barabaricollective.org"
      ]
    });

    assert.equal(result.success, true);
    const approverCall = sentCalls.find((c) => c.options?.idempotencyKey?.endsWith("-approver"));
    const visibilityCall = sentCalls.find((c) => c.options?.idempotencyKey?.endsWith("-visibility"));

    assert.deepEqual(approverCall.payload.to, [
      "admin@barabaricollective.org",
      "founder@barabaricollective.org"
    ]);
    assert.deepEqual(visibilityCall.payload.to, ["teammate@barabaricollective.org"]);
  });

  it("excludes the applicant even if they are an admin or vertical lead", async () => {
    const result = await sendLeaveEmail({
      leave: baseLeave,
      employee: {
        name: "Admin User",
        email: "admin1@barabaricollective.org",
        vertical: "Operations",
        isVerticalLead: false
      },
      verticalLeadEmails: [],
      adminEmails: ["admin1@barabaricollective.org", "admin2@barabaricollective.org"],
      founderEmails: "founder@barabaricollective.org",
      recipients: ["admin1@barabaricollective.org", "admin2@barabaricollective.org"]
    });

    assert.equal(result.success, true);
    assert.equal(sentCalls.length, 1);
    assert.deepEqual(sentCalls[0].payload.to, [
      "admin2@barabaricollective.org",
      "founder@barabaricollective.org"
    ]);
    assert.ok(!sentCalls[0].payload.to.includes("admin1@barabaricollective.org"));
  });

  it("does not include a Review & Approve button for past leaves", async () => {
    const result = await sendLeaveEmail({
      leave: { ...baseLeave, isPastLeave: true },
      employee: {
        name: "Asha",
        email: "asha@barabaricollective.org",
        vertical: "Tech",
        isVerticalLead: false
      },
      verticalLeadEmails: ["lead@barabaricollective.org"],
      adminEmails: ["admin@barabaricollective.org"],
      founderEmails: "founder@barabaricollective.org",
      recipients: ["lead@barabaricollective.org", "admin@barabaricollective.org"]
    });

    assert.equal(result.success, true);
    assert.equal(sentCalls.length, 1);
    assert.equal(sentCalls[0].options?.idempotencyKey, "leave-65f1a2b3c4d5e6f7a8b9c0d1-past");
    assert.doesNotMatch(sentCalls[0].payload.html, /\/review-leave\//);
    assert.doesNotMatch(sentCalls[0].payload.subject, /^\[Action Needed\] /);
  });
});

describe("getNotificationRecipients — verticalLeadEmails filtering", () => {
  it("excludes admin/founder leads from verticalLeadEmails so sendLeaveEmail falls back to admins", async () => {
    const originalFind = User.find;
    User.find = (query) => ({
      select: async () => {
        if (query.vertical) {
          return [
            { email: "adminlead@barabaricollective.org", isVerticalLead: true, role: "admin" },
            { email: "member@barabaricollective.org", isVerticalLead: false, role: "employee" }
          ];
        }
        return [{ email: "adminlead@barabaricollective.org" }];
      }
    });

    try {
      const res = await getNotificationRecipients({
        _id: "65f1a2b3c4d5e6f7a8b9c0d2",
        email: "emp@barabaricollective.org",
        vertical: "Operations"
      });
      assert.deepEqual(res.verticalLeadEmails, []);
      assert.ok(res.adminEmails.includes("adminlead@barabaricollective.org"));
    } finally {
      User.find = originalFind;
    }
  });
});
