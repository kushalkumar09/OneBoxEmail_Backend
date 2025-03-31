const passport = require("passport");
const User = require("../models/user.js");

// Initiates Google OAuth2 Login
exports.loginUser = passport.authenticate("google", {
  scope: ["profile", "email"],
});

// Handles OAuth2 Callback
exports.googleCallback = async (req, res, next) => {
  passport.authenticate("google", async (err, user, info) => {
    console.log("🔹 Google OAuth Callback Triggered");

    try {
      if (err) {
        console.error("❌ Google OAuth Error:", err);
        return res
          .status(500)
          .json({ error: "Authentication failed", details: err.message });
      }

      if (!user) {
        console.warn("⚠️ Google OAuth Failed: No user found");
        return res.status(401).json({ error: "User not authenticated" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("❌ Login Error:", loginErr);
          return res
            .status(500)
            .json({ error: "Login failed", details: loginErr.message });
        }

        console.log("✅ User Authenticated Successfully:", {
          id: user.id,
          name: user.name,
          email: user.email,
        });
        return res.redirect("http://localhost:5173/");
      });
    } catch (error) {
      console.error("🔥 Unexpected Error:", error);
      return res
        .status(500)
        .json({ error: "Something went wrong", details: error.message });
    }
  })(req, res, next);
};

// Logout User & Destroy Session
exports.logoutUser = (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });

    req.session.destroy(() => {
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
};

// Get Current User Details
exports.getUserDetails = async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.status(200).json(req.user);
};

// Allow Users to Add More Email Accounts for Syncing
exports.addEmailAccount = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { email, refreshToken } = req.body;

    if (!email || !refreshToken) {
      return res
        .status(400)
        .json({ error: "Email and refresh token are required" });
    }

    // Update user with new email
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $push: { connectedEmails: { email, refreshToken } } },
      { new: true }
    );

    res.status(200).json({ message: "Email added successfully", user });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to add email", details: error.message });
  }
};
