const User = require("../models/user.js");
const { connectIMAP } = require("../config/imap");

async function syncAllUsers() {
  try {
    const users = await User.find({ "connectedEmails.0": { $exists: true } });

    if (!users.length) {
      console.log("⚠️ No users found with connected emails.");
      return;
    }

    const imapConnections = users.map(async (user) => {
      if (!Array.isArray(user.connectedEmails) || user.connectedEmails.length === 0) {
        console.log(`⚠️ User ${user._id} has no connected emails.`);
        return;
      }

      return Promise.allSettled(
        user.connectedEmails.map(({ email, refreshToken }) =>
          connectIMAP(email, refreshToken, user._id).catch((err) => {
            console.error(`❌ IMAP Connection Failed for ${email}:`, err.message);
          })
        )
      );
    });

    await Promise.all(imapConnections);
    console.log("🔄 IMAP Sync Started for All Users...");

  } catch (error) {
    console.error("❌ Error in syncAllUsers:", error.message);
  }
}

module.exports = { syncAllUsers };
