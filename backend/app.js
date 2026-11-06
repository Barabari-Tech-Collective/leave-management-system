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
      origin.endsWith(".onrender.com") ||
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
app.enable("trust proxy"); // Trust reverse proxies in Render / AWS
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_session_secret",
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

app.use("/auth", authRoutes);
app.use("/leave", leaveRoutes);
app.use("/users", userRoutes);
app.get("/health", (req, res) => {
  res.status(200).send("leave portal Server is awake!");
});

module.exports = app;