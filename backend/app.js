const express = require("express");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");
require("dotenv").config();
require("./config/passport");

const authRoutes = require("./routes/auth.routes");
const leaveRoutes = require("./routes/leave.routes");
const userRoutes = require("./routes/user.routes");


const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

app.use(
  session({
    secret: "supersecret",
    resave: false,
    saveUninitialized: false
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRoutes);
app.use("/leave", leaveRoutes);
app.use("/users", userRoutes);

module.exports = app;