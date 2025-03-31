require("dotenv").config();
const imaps = require("imap-simple");
const { google } = require("google-auth-library");
const User = require("../models/user.js");
const Email = require("../models/email.js");
const moment = require("moment");
const mongoose = require("mongoose");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:5000/auth/callback";

/**
 * Get a new access token from a refresh token
 */
async function getAccessToken(refreshToken) {
  try {
    console.log("🔑 Using refresh token:", refreshToken);
    const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    auth.setCredentials({ refresh_token: refreshToken });

    const { token } = await auth.getAccessToken();
    console.log("✅ New access token:", token);
    
    if (!token) throw new Error("Access token retrieval failed");
    return token;
  } catch (error) {
    console.error("❌ Error getting access token:", error.message);
    throw error;
  }
}

/**
 * Generate XOAUTH2 Token
 */
function generateXOAuth2Token(email, accessToken) {
  return Buffer.from(`user=${email}\x01auth=Bearer ${accessToken}\x01\x01`).toString("base64");
}

async function connectAndFetchEmails(email, refreshToken, userId) {
  try {
    const accessToken = await getAccessToken(refreshToken);
    if (!accessToken) throw new Error("Invalid access token");

    const xoauth2Token = generateXOAuth2Token(email, accessToken);

    console.log("🔌 Connecting to IMAP...");
    const config = {
      imap: {
        user: email,
        xoauth2: xoauth2Token, // Correct way to pass XOAUTH2
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
      },
    };

    const connection = await imaps.connect(config);
    console.log("✅ IMAP connected");

    await connection.openBox("INBOX");

    const sinceDate = moment().subtract(2, "days").format("DD-MMM-YYYY");
    const searchCriteria = [["SINCE", sinceDate]];
    const fetchOptions = {
      bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"],
      struct: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    for (const message of messages) {
      const header = message.parts.find(
        (part) => part.which === "HEADER.FIELDS (FROM TO SUBJECT DATE)"
      ).body;
      const bodyPart = message.parts.find(
        (part) => part.which === "TEXT"
      )?.body;

      const bodyText = bodyPart ? bodyPart.trim() : "No email body available.";
      const preview = bodyText.substring(0, 100) + "...";

      const emailData = {
        subject: header.subject?.[0] || "No Subject",
        sender: header.from?.[0] || "Unknown Sender",
        senderName: header.from?.[0]?.split("<")[0]?.trim() || "",
        preview: preview,
        date: header.date?.[0] ? new Date(header.date[0]) : new Date(),
        read: false,
        category: "Inbox",
        account: userId,
        folder: "Inbox",
        body: bodyText,
        suggestedReply: "Not Available",
      };

      try {
        console.log("🔍 Saving email data:", emailData);
        await Email.create(emailData);
        console.log(`📩 Email saved successfully: ${emailData.subject}`);
      } catch (dbError) {
        console.error("❌ Error saving email to DB:", dbError.message);
      }
    }

    connection.end();
  } catch (error) {
    console.error(`❌ Error fetching emails for ${email}:`, error.message);
  }
}

/**
 * Connect multiple Gmail accounts and sync emails
 */
async function syncAllEmails() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const usersWithEmails = await User.find({
      connectedEmails: {
        $elemMatch: { refreshToken: { $exists: true } },
      },
    });
/**
 * Connect to IMAP and fetch emails
 */

    for (const user of usersWithEmails) {
      for (const emailAccount of user.connectedEmails) {
        await connectAndFetchEmails(
          emailAccount.email,
          emailAccount.refreshToken,
          user._id
        );
      }
    }

    console.log("✅ Email synchronization completed successfully.");
  } catch (error) {
    console.error("❌ Failed to sync emails:", error.message);
  }
}

module.exports = { syncAllEmails };
