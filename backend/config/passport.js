const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User.js");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Step - 1 PROFILE:", profile); // 👈 ADD THIS

        // Restrict login to your org domain
        const email = profile.emails[0].value;

        // if (!email.endsWith("@yourorg.com")) {
        //   return done(null, false);
        // }

        // Check if user exists
        let user = await User.findOne({ googleId: profile.id });
        console.log("step - 2 Checking if user exists")

        if (!user) {
          // Create new user if not exists
          user = await User.create({
            name: profile.displayName,
            email,
            googleId: profile.id
          });
          console.log("Setp - 3 USER CREATED:", user);
        }

        return done(null, user);
      } catch (error) {
        console.log("🔥 PASSPORT ERROR:", err);
        return done(error, null);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});