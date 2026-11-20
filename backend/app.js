const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const passport = require("passport");
const cors = require("cors");
require("dotenv").config();
require("./config/passport");

const authRoutes = require("./routes/authRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const userRoutes = require("./routes/userRoutes");
const initHolidayCron = require("./cron/holidayCron");
const initAnnualResetCron = require("./cron/annualResetCron");


const app = express();

const defaultAllowedOrigins = [
  "https://leaveportal.barabaricollective.org",
  "http://localhost:5173",
];

if (process.env.FRONTEND_URL) {
  const customFrontend = process.env.FRONTEND_URL.replace(/\/+$/, "");
  if (!defaultAllowedOrigins.includes(customFrontend)) {
    defaultAllowedOrigins.push(customFrontend);
  }
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      defaultAllowedOrigins.includes(origin) ||
      origin.endsWith(".barabaricollective.org")
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.set("trust proxy", 1); // Trust first-hop reverse proxy (Render / AWS / Cloudflare)

// In production, refuse to boot if SESSION_SECRET is missing or left as default
const sessionSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === "production" && (!sessionSecret || sessionSecret === "default_session_secret")) {
  throw new Error("🚨 [FATAL SECURITY ERROR]: SESSION_SECRET must be set to a secure secret in production environments.");
} else if (!sessionSecret) {
  console.warn("⚠️ [SECURITY WARNING]: SESSION_SECRET is not set. Using temporary fallback in development mode only.");
}

app.use(
  session({
    secret: sessionSecret || "default_session_secret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true in prod
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain: process.env.COOKIE_DOMAIN || undefined
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());
initHolidayCron();
initAnnualResetCron();

app.use("/auth", authRoutes);
app.use("/leave", leaveRoutes);
app.use("/users", userRoutes);
app.get("/health", (req, res) => {
  res.status(200).send("leave portal Server is awake!");
});

module.exports = app;