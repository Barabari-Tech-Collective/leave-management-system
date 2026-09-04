const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User.js");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Step - 1 PROFILE:", profile);

        const email = profile.emails[0].value.toLowerCase();

        // Parse admin emails from .env
        const adminList = (process.env.ADMIN_EMAILS || "")
          .split(",")
          .map((e) => e.trim().toLowerCase());

        const isAllowlistedAdmin = adminList.includes(email);

        // Check if user exists by email or googleId
        let user = await User.findOne({ email });

        // Reject if user account has not been provisioned by Admin
        if (!user) {
          return done(null, false, {
            message: "Account not found. Please ask your Admin or Vertical Lead to create your account first."
          });
        }

        // Elevate role if allowlisted admin
        if (isAllowlistedAdmin && user.role !== "admin") {
          user.role = "admin";
        }

        // Save googleId if logging in via Google for the first time
        if (!user.googleId) {
          user.googleId = profile.id;
        }

        await user.save();
        return done(null, user);
      } catch (error) {
        console.log("PASSPORT ERROR:", error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  console.log("Deserialize ID", id);
  const user = await User.findById(id);
  console.log("Deserialize User", user);
  done(null, user);
});