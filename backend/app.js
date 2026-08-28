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


const app = express();

app.use(cors({
  origin: [
    "https://leaveportal.barabaricollective.org",
    "https://leave-management-system-frontend-7r85.onrender.com",
    "http://localhost:5173"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.enable("trust proxy"); // Trust all proxies in AWS
app.use(
  session({
    secret: process.env.SESSION_SECRET,
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
      domain: process.env.NODE_ENV === "production" ? ".barabaricollective.org" : undefined
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());


app.use("/auth", authRoutes);
app.use("/leave", leaveRoutes);
app.use("/users", userRoutes);
app.get("/health", (req, res) => {
  res.status(200).send("leave portal Server is awake!");
});

module.exports = app;