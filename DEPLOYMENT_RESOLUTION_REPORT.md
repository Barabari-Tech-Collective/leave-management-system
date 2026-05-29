# Deployment Resolution Report: Authentication & Session Loop Fixes

## Overview
This document details the step-by-step troubleshooting, challenges, and solutions implemented to resolve the infinite login redirect loop and subsequent session authentication issues in the Leave Management System. 

This guide is intended for the development and DevOps team to understand what went wrong, what was changed, and how to prevent or troubleshoot similar issues in the future.

---

## Phase 1: Hardcoded URLs & CORS Configuration

### The Problem
The initial problem was an infinite redirect loop during login. Upon code inspection, we found:
1. **Hardcoded URLs:** The Google OAuth callback (`authRoutes.js`), Passport configuration (`passport.js`), and frontend API calls (`Login.jsx`) contained hardcoded URLs like `http://localhost:5173` and `https://main...amplifyapp.com` instead of relying on environment variables.
2. **Duplicate CORS Headers:** The backend (`app.js`) had manual `Access-Control-Allow-Origin` middleware *in addition to* the `cors()` package, causing browsers to reject the duplicate headers.

### The Solution
- **Dynamic Variables:** Replaced all hardcoded URLs with `process.env.FRONTEND_URL`, `process.env.BACKEND_URL`, and `import.meta.env.VITE_API_URL`.
- **CORS Cleanup:** Removed the manual CORS middleware and relied entirely on the `cors` package with `credentials: true` and the correct origin.
- **Commands Used:** 
  - Standard `git add`, `git commit`, `git push`
  - SSH to EC2: `ssh -i leave-portal.pem ubuntu@3.110.136.43`
  - Pulled changes and restarted: `git pull origin main`, `pm2 restart leave-backend`

---

## Phase 2: Server Crash on Restart (`connect-mongo`)

### The Problem
When the backend restarted via PM2, it crashed immediately with the error:
`TypeError: MongoStore.create is not a function`

### The Solution
This occurred because the syntax `MongoStore.create()` is used in newer versions of `connect-mongo` (v4+), but an older version was installed on the EC2 server.
- **Commands Used (on EC2):**
  - `npm uninstall connect-mongo`
  - `npm install connect-mongo@latest`
  - `pm2 restart leave-backend`

---

## Phase 3: Google OAuth `redirect_uri_mismatch`

### The Problem
After fixing the crash, attempting to log in threw a Google Error 400: `redirect_uri_mismatch`. 
This happened because we updated `BACKEND_URL` to point to the production API, changing the callback URL dynamically passed to Google.

### The Solution
We instructed the team to update the Google Cloud Console settings to ensure the Authorized Redirect URI matched EXACTLY:
`https://leave-portal-api.barabaricollective.org/auth/google/callback`

---

## Phase 4: The 401 Unauthorized & Missing Session Cookie (The Toughest Challenge)

### The Problem
After Google OAuth succeeded, the browser redirected the user to the frontend dashboard, but the dashboard immediately failed to fetch `/auth/me` and threw a `401 Unauthorized` error. 

The `connect.sid` (session cookie) was entirely missing from the browser. 

### Troubleshooting & Struggles
1. **Adding a Debug Route:** We injected a temporary `/auth/debug` endpoint to dump the environment variables and `req` properties.
2. **Finding the Culprit:** The debug route revealed `req.secure` was `false`. Because our session cookie config had `secure: process.env.NODE_ENV === "production"` (which evaluated to `true`), Express was **silently dropping the cookie** because it thought the connection was an insecure HTTP connection.
3. **Why was it insecure?** Nginx handles the HTTPS SSL certificate, but forwards traffic to Node.js (port 3000) over plain HTTP. Nginx wasn't telling Node.js that the original connection was secure.

### The Solution
We needed to update Nginx to forward the original protocol and IP. 
*Struggle:* Modifying Nginx via single-line SSH commands using `sed` or `cat << EOF` failed multiple times because local terminals strip or evaluate bash variables (like `$scheme`) before sending them to the server.

**Final Fix:**
1. Created the Nginx config locally on the desktop as `leaves.conf` with the following critical headers added:
   ```nginx
   proxy_set_header X-Forwarded-Proto $scheme;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   ```
2. **Commands Used to Deploy Nginx Config:**
   - SCP transfer: `scp -i "leave-portal.pem" leaves.conf ubuntu@3.110.136.43:/tmp/leaves.conf`
   - Move & Reload: `ssh -i "leave-portal.pem" ubuntu@3.110.136.43 "sudo mv /tmp/leaves.conf /etc/nginx/sites-enabled/leaves && sudo nginx -t && sudo systemctl reload nginx"`

---

## Phase 5: Cross-Subdomain Cookies

### The Problem
Even with `req.secure = true`, the cookie needed to be shared between `leave-portal-api.barabaricollective.org` (backend) and `leaveportal.barabaricollective.org` (frontend).

### The Solution
We updated `app.js` to explicitly set the cookie domain to the parent domain so both subdomains could access it.

**Final Cookie Config in `app.js`:**
```javascript
cookie: {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // Now works because Nginx passes X-Forwarded-Proto
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  domain: process.env.NODE_ENV === "production" ? ".barabaricollective.org" : undefined
}
```

## Summary Checklist for Future Deployments
1. **Always use Environment Variables** for URLs. Never hardcode `localhost` or specific domains in code.
2. **Nginx Proxy Headers:** Any Node.js app using cookies behind an Nginx reverse proxy MUST have `proxy_set_header X-Forwarded-Proto $scheme;` in the Nginx config, and `app.enable("trust proxy");` in Express.
3. **Cross-Subdomain Authentication:** Ensure the `domain` property in the cookie config is set to the root domain (e.g., `.barabaricollective.org`) with `sameSite: "none"` and `secure: true`. 
4. **Google Cloud Console:** Keep redirect URIs strictly synchronized with production `BACKEND_URL` endpoints.
