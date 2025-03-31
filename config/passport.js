const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user.js");
require("dotenv").config();

/*Google OAuth Strategy*/

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/api/auth/google/callback",
      passReqToCallback: true, // Allows passing req to callback
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        if (!profile.id) {
          return done(new Error("Google authentication failed: Missing Profile ID"), null);
        }

        const email = profile.emails?.[0]?.value; // Get user's email
        if (!email) {
          return done(new Error("Google authentication failed: Email is missing"), null);
        }

        let user = await User.findOne({ googleId: profile.id });
        console.log(user);

        if (!user) {
          // ✅ New User: Create and store first Gmail account
          user = new User({
            googleId: profile.id,
            name: profile.displayName || "Unnamed User",
            email,
            avatar: profile.photos?.[0]?.value || "",
            connectedEmails: [{ email, refreshToken }],
          });
        } else {
          // ✅ Existing User: Check if this Gmail is already linked
          const isEmailLinked = user.connectedEmails.some((acc) => acc.email === email);

          if (!isEmailLinked) {
            // If Gmail is not linked, add it
            user.connectedEmails.push({ email, refreshToken });
          }
        }

        await user.save(); // Save user data
        return done(null, user); // Success ✅
      } catch (error) {
        console.error("❌ Error in Google OAuth:", error.message);
        return done(error, null);
      }
    }
  )
);

/**
 * Serialize User (Save user ID to session)
 */
passport.serializeUser((user, done) => {
  try {
    if (!user.id) throw new Error("Serialization failed: User ID is missing.");
    done(null, user.id);
  } catch (error) {
    console.error("❌ Error in serializeUser:", error.message);
    done(error, null);
  }
});

/**
 * Deserialize User (Retrieve user from session)
 */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (!user) throw new Error("User not found during deserialization.");
    done(null, user);
  } catch (error) {
    console.error("❌ Error in deserializeUser:", error.message);
    done(error, null);
  }
});

module.exports = passport;
