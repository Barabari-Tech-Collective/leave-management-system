# 🐛 Leave Portal — Production Bug Report & Fix Summary

**Date:** 29 May 2026  
**Reported by:** Rohit  
**Status:** ✅ Fix is Ready — Needs Deployment

---

## 📌 What Was the Problem?

After logging in with Google on the production site (`leaveportal.barabaricollective.org`), the user was being **redirected back to the login page** in an infinite loop.

The browser console showed:
```
Failed to load resource: the server responded with a status of 401 (Unauthorized)
Error fetching user: AxiosError: Request failed with status code 401
  at /auth/me
```

### Root Cause Analysis

The backend logs confirmed the Google OAuth flow itself was **working perfectly**:
- ✅ Google profile received
- ✅ User found in MongoDB
- ✅ Session saved successfully
- ✅ User redirected to `/admin` or `/employee`

**But immediately after the redirect**, the frontend calls `/auth/me` to confirm the user is logged in — and this was returning `401 Unauthorized`. This caused the app to think the user is not logged in and redirect back to the login page.

---

## ❌ Three Bugs Found in the Code

### Bug 1 — Duplicate CORS Header (Main Culprit 🔴)

In `backend/app.js`, two things were both setting the same `Access-Control-Allow-Credentials` header:

```js
// Thing 1: cors() middleware already sets this header
app.use(cors({ credentials: true }));

// Thing 2: This manually set it AGAIN — causing a duplicate!
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true"); // ❌ DUPLICATE
  next();
});
```

**Why this breaks it:** Browsers strictly reject any CORS response where `Access-Control-Allow-Credentials` appears more than once. So the browser was silently blocking the `/auth/me` response, causing the `401` error.

---

### Bug 2 — AWS Proxy Not Fully Trusted (Medium 🟡)

```js
// OLD CODE
app.set("trust proxy", 1); // only trusts 1 proxy hop
```

AWS infrastructure (CloudFront → ALB → EC2) can have multiple proxy layers. When Express doesn't fully trust the proxy chain, it may not correctly recognize that the connection is HTTPS — and silently **drops the secure session cookie**, preventing it from being sent.

---

### Bug 3 — All URLs Were Hardcoded (Low 🟢)

The Google callback URL, redirect URLs, and CORS origin were all hardcoded to production URLs:
```js
callbackURL: "https://leave-portal-api.barabaricollective.org/auth/google/callback"
origin: "https://leaveportal.barabaricollective.org"
res.redirect("https://leaveportal.barabaricollective.org/admin")
```

This made it impossible to run or test the app locally without manually changing code each time.

---

## ✅ What Was Fixed (Changes Already in the Code)

All fixes have been committed to the local repository. Here is a summary of each change:

### Fix 1 — Removed Duplicate CORS Header (`backend/app.js`)
```diff
- app.use((req, res, next) => {
-   res.header("Access-Control-Allow-Credentials", "true");
-   next();
- });
```
The `cors({ credentials: true })` middleware already handles this correctly on its own.

---

### Fix 2 — Fixed AWS Proxy Trust (`backend/app.js`)
```diff
- app.set("trust proxy", 1);
+ app.enable("trust proxy"); // Trust all proxies in AWS
```

---

### Fix 3 — Made Cookie Config Environment-Aware (`backend/app.js`)
```diff
  cookie: {
    httpOnly: true,
-   secure: true,
-   sameSite: "none",
-   domain: ".barabaricollective.org"
+   secure: process.env.NODE_ENV === "production",
+   sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
+   // domain removed — browser handles it automatically
  }
```

---

### Fix 4 — Made All URLs Dynamic via Environment Variables

**`backend/config/passport.js`**
```diff
- callbackURL: "https://leave-portal-api.barabaricollective.org/auth/google/callback"
+ callbackURL: "/auth/google/callback"
```

**`backend/routes/authRoutes.js`**
```diff
- res.redirect("https://leaveportal.barabaricollective.org/admin")
+ res.redirect(`${process.env.FRONTEND_URL}/admin`)
```

**`backend/app.js`**
```diff
- origin: "https://leaveportal.barabaricollective.org"
+ origin: process.env.FRONTEND_URL
```

**`frontend/src/pages/auth/Login.jsx`**
```diff
- window.open("https://leave-portal-api.barabaricollective.org/auth/google", "_self")
+ window.open(`${import.meta.env.VITE_API_URL}/auth/google`, "_self")
```

---

## 🚀 What Needs to Be Done Now

### Step 1 — Grant GitHub Write Access
Please add `rohitpm2004` as a collaborator on:  
`github.com/Barabari-Tech-Collective/leave-management-system`  
→ **Settings → Collaborators → Add people → rohitpm2004**

This is needed so we can push the fixed code to GitHub.

---

### Step 2 — Share the EC2 PEM Key
Please share the `leave-portal.pem` file (the SSH key for the EC2 instance at `3.110.136.43`).  
This is needed to SSH into the server and deploy the changes.

**OR** — You can run these commands yourself on the EC2 server:

```bash
cd leave-management-system
git pull origin main
grep -q 'NODE_ENV' backend/.env || echo "NODE_ENV=production" >> backend/.env
pm2 restart leave-backend
pm2 logs leave-backend
```

---

### Step 3 — Verify Environment Variables on EC2

Please make sure the following are present in `backend/.env` on the server:

```env
NODE_ENV=production
FRONTEND_URL=https://leaveportal.barabaricollective.org
```

---

### Step 4 — Frontend will Auto-Deploy ✅

The frontend fix (Login.jsx) is already committed. Since the frontend auto-deploys (Amplify), this change will go live automatically once the code is pushed to GitHub.

---

## 📂 Files Changed

| File | What Changed |
|------|-------------|
| `backend/app.js` | Removed duplicate CORS header, fixed proxy trust, made cookie config dynamic, made CORS origin dynamic |
| `backend/config/passport.js` | Changed hardcoded callback URL to relative path |
| `backend/routes/authRoutes.js` | Changed hardcoded redirect URLs to use `FRONTEND_URL` env variable |
| `frontend/src/pages/auth/Login.jsx` | Changed hardcoded Google login URL to use `VITE_API_URL` env variable |
| `frontend/.env` | Added `VITE_API_URL=http://localhost:3000` for local testing |
| `backend/.env` | Updated `FRONTEND_URL` to `http://localhost:5173` for local testing |

> ⚠️ **Important:** The `.env` files were updated for local testing. On the EC2 server, `backend/.env` should have `FRONTEND_URL=https://leaveportal.barabaricollective.org` and `NODE_ENV=production`.

---

## 🧪 How to Verify After Deployment

1. Go to `https://leaveportal.barabaricollective.org`
2. Click **"Continue with Google"**
3. Select your Google account
4. You should land on `/admin` or `/employee` — **not loop back to login**
5. If still failing, check: `pm2 logs leave-backend` and look for `SESSION USER:` log in `/auth/me`

---

*Report prepared by Rohit with AI assistance — 29 May 2026*
