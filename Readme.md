# 🚀 The Barabari Collective - Leave Management Portal

A full-stack, role-based Leave Management Portal built for **The Barabari Collective**. The portal streamlines employee leave applications, hierarchical approval workflows (Admin, Vertical Leads, Employees), automated national holiday announcements, and user lifecycle management.

---

## 🛠️ Tech Stack

### **Frontend**

* **Framework:** React.js (Vite)
* **Styling:** Tailwind CSS
* **Routing:** React Router DOM (`v6`)
* **State & Authentication:** React Context API (`AuthContext`)
* **HTTP Client:** Axios (Custom instance with credentials handling)
* **Icons & Notifications:** Lucide React Icons, React Hot Toast
* **UI Modals:** React Portals (`createPortal` for clean overlay rendering)

### **Backend**

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB Atlas with Mongoose ORM
* **Authentication:** Passport.js (Google OAuth 2.0 Strategy & Local Session Auth)
* **Email Service:** Resend API (Transactional HTML Emails)
* **Automation / Cron Jobs:** `node-cron` (Daily automated national holiday checks)

---

## 📂 Project Structure & File Descriptions

```text
leave-system/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB Atlas connection setup
│   │   └── passport.js        # Passport.js Google OAuth strategy & session serialization
│   ├── controllers/
│   │   └── leaveController.js # Core business logic (apply leave, deduct balance, approve/reject)
│   ├── cron/
│   │   └── holidayCron.js     # Scheduled cron job (runs daily at 00:01 AM for holiday emails)
│   ├── middleware/            # Auth protection middleware (ensureAuth)
│   ├── models/
│   │   ├── Leave.js           # Mongoose schema for leave requests
│   │   └── User.js            # Mongoose schema for user accounts & leave balance tracking
│   ├── routes/
│   │   ├── authRoutes.js      # Routes for Google OAuth & local login/logout
│   │   ├── leaveRoutes.js     # Endpoints for applying, fetching, & updating leave status
│   │   └── userRoutes.js      # Admin routes (all users, soft-delete, restore, role/vertical change)
│   ├── services/
│   │   └── emailService.js    # Resend API integration & custom HTML template wrappers
│   ├── .env                   # Environment variables (DB URI, Resend API key, Admin Emails)
│   ├── app.js                 # Express app setup, middlewares, and route declarations
│   └── server.js              # Server entry point & DB initialization
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axiosConfig.js # Centralized Axios instance with base URL & credentials
    │   ├── components/
    │   │   ├── CreateUserModal.jsx   # Admin/Lead modal to onboard new employees
    │   │   ├── LeaveApprovalActions.jsx # Action buttons (Approve/Reject) with remark prompts
    │   │   ├── LeaveCard.jsx         # Card UI for individual leave details
    │   │   ├── Loader.jsx            # Centered loading spinner
    │   │   ├── Navbar.jsx            # Top navigation bar for Employee/Lead layout
    │   │   ├── ProfileDropdown.jsx   # Profile avatar dropdown menu
    │   │   ├── RecycleBinModal.jsx   # Admin modal to restore soft-deleted users
    │   │   ├── Sidebar.jsx           # Fixed sidebar for Admin layout
    │   │   └── StatusBadge.jsx       # Styled pill badge (Pending, Approved, Rejected)
    │   ├── context/
    │   │   └── AuthContext.jsx       # Auth provider managing global user state & logout
    │   ├── layouts/
    │   │   ├── AdminLayout.jsx       # Desktop layout with fixed sidebar & independent scroll
    │   │   └── EmployeeLayout.jsx    # Standard layout with sticky header & natural document scroll
    │   ├── pages/
    │   │   ├── admin/
    │   │   │   ├── AdminDashboard.jsx     # Overview of org leaves, Ops vertical, & Lead requests
    │   │   │   ├── AdminVerticalLead.jsx  # Lead-specific management views
    │   │   │   ├── AllEmployee.jsx        # Organization-wide user directory
    │   │   │   ├── EmployeeDetail.jsx     # Individual member leave history & balance inspector
    │   │   │   └── ManageVerticals.jsx    # Interface to change verticals, delete, & restore members
    │   │   ├── auth/
    │   │   │   └── Login.jsx              # Dual login page (Google OAuth + Password auth)
    │   │   ├── employee/
    │   │   │   ├── ApplyLeave.jsx         # Leave application form with Sunday-exclusion logic
    │   │   │   ├── Dashboard.jsx          # Employee balance cards & status overview
    │   │   │   ├── History.jsx            # History log of past leave applications
    │   │   │   └── LeavePolicy.jsx        # Visual guide to org leave rules & entitlements
    │   │   └── verticalLead/
    │   │       └── VerticalLeadDashboard.jsx # Lead panel to review team requests & balances
    │   ├── routes/
    │   │   ├── AdminRoutes.jsx       # Protected route wrapper for Admin-only access
    │   │   ├── AppRoutes.jsx         # Main React Router setup
    │   │   └── protectedRoutes.jsx   # Protected route wrapper for authenticated users
    │   ├── App.jsx                   # Root application wrapper
    │   ├── main.jsx                  # Entry point rendering React DOM
    │   └── index.css                 # Global CSS styles & Tailwind directives

## 📧 Automated Email Notifications System

The system uses **Resend API** (`services/emailService.js`) wrapped in a branded HTML email layout.

### **Triggered Email Workflows**

1. **Welcome Email (`sendWelcomeEmail`):**
   - **Trigger:** When an Admin or Vertical Lead creates a user via `CreateUserModal`.
   - **Content:** Dispatches temporary credentials, assigned vertical/role, and portal link.

2. **Leave Application Alert (`sendLeaveEmail`):**
   - **Trigger:** When an employee submits a leave request.
   - **Recipients:** Vertical Lead, vertical teammates, and Admins.
   - **Policy Logic:** Sunday dates are automatically excluded from the calculated days count.

3. **Leave Status Update (`sendApprovalEmail`):**
   - **Trigger:** When a Lead or Admin Approves or Rejects a leave request.
   - **Content:** Confirms status change. Includes mandatory rejection remarks if declined.

4. **National Holiday Notice (`sendNationalHolidayEmail`):**
   - **Trigger:** Automated via `node-cron` (`cron/holidayCron.js`) running daily at 00:01 AM.
   - **Recipients:** All active (non-deleted) organization members.

---

## 🔐 Key Business & Policy Rules

1. **Sunday Policy:** Sundays falling within an applied leave date range are excluded from balance deduction.

2. **Soft Delete (Recycle Bin):** Deactivating a user (`isDeleted: true`) immediately revokes login permissions while retaining historical leave data for audits. Users can be restored via the **Recycle Bin**.

3. **Vertical Migration:** When an Admin changes a user's vertical (e.g., Program to EdTech), the user's historical leave data automatically migrates to the new vertical lead's view.

4. **Access Control:** Self-registration is disabled. Users can only log in if their email address was pre-provisioned by an Admin or Lead.

---


