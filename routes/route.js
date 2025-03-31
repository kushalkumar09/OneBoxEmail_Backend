const express = require("express");
const passport = require("passport");
const userController = require("../controller/userController.js");
const emailController = require("../controller/emailController.js");

const router = express.Router();

//secure routes
const isAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
};


// OAuth2 Authentication Routes
router.get(
    "/auth/google",
    passport.authenticate("google", { 
      scope: [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://mail.google.com/",  // ✅ Full Gmail access for IMAP
      ],
      accessType: "offline",
      prompt: "consent" // Forces Google to ask user for account selection
    })
  );
  

router.get("/auth/google/callback", userController.googleCallback);


router.post("/logout", userController.logoutUser);
router.get("/me",isAuthenticated, userController.getUserDetails);

// Email Management Routes
router.post("/syncemails",isAuthenticated, emailController.syncEmails);
router.get("/getemails",isAuthenticated, emailController.getEmails);

// User Email Management Route (Adding more accounts)
router.post("/addemail",isAuthenticated, userController.addEmailAccount);

module.exports = router;
