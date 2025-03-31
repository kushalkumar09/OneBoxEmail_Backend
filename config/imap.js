const Imap = require("imap");
const { getAccessToken } = require("../services/authServices.js");
const moment = require("moment");
const Email = require("../models/email.js");
const { simpleParser } = require("mailparser");
const { chatSession } = require("../services/aiReply.js");
async function connectIMAP(email, refreshToken, userId) {
  try {
    const accessToken = await getAccessToken(refreshToken);
    const imapConfig = {
      user: email,
      xoauth2: Buffer.from(
        `user=${email}\x01auth=Bearer ${accessToken}\x01\x01`
      ).toString("base64"),
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 30000,
    };

    const imap = new Imap(imapConfig);

    imap.once("ready", () => {
      console.log("✅ IMAP Connection Ready");
      openInbox(imap, userId);
    });

    imap.once("error", (error) =>
      console.error("❌ IMAP Connection Error:", error.message)
    );
    imap.once("end", () => console.log("📴 IMAP Connection Ended"));

    imap.connect();
  } catch (error) {
    console.error("❌ Error connecting to IMAP:", error.message);
  }
}

function openInbox(imap, userId) {
  imap.openBox("INBOX", false, (err, box) => {
    if (err) {
      console.error("❌ Error opening INBOX:", err);
      imap.end();
      return;
    }

    const sinceDate = moment().subtract(2, "days").format("DD-MMM-YYYY");
    console.log(`📆 Searching for emails SINCE: ${sinceDate}`);

    imap.search([["SINCE", new Date(sinceDate)]], (err, results) => {
      if (err) {
        console.error("❌ IMAP Search Error:", err);
        imap.end();
        return;
      }

      if (!results || results.length === 0) {
        console.log("📭 No new emails in the last 2 days.");
        imap.end();
        return;
      }

      console.log(`📩 Found ${results.length} emails.`);
      fetchAndSaveEmails(imap, results, userId);
    });
  });
}

async function classifyEmail(bodyText) {
  const validCategories = [
    "Interested",
    "Meeting Booked",
    "Not Interested",
    "Spam",
    "Out of Office",
  ];

  try {
    const response = await chatSession.sendMessage(`
      Classify this email (ONLY respond with one word):
      "${bodyText.substring(0, 300)}"
      Options: ${validCategories.join(", ")}
    `);

    // Extract the category from the response);
    const category = (
      response?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "Inbox"
    )
      .trim()
      .replace(/["'.]/g, "");
    // Validate the response
    return validCategories.includes(category) ? category : "Inbox";
  } catch (error) {
    console.error("Classification error:", error.message);
    return "Inbox";
  }
}

function fetchAndSaveEmails(imap, messageIds, userId) {
  const fetchOptions = { bodies: "", struct: true };
  const fetch = imap.fetch(messageIds, fetchOptions);

  fetch.on("message", (msg, seqno) => {
    let emailData = "";
    let messageId = "";

    msg.on("body", (stream) => {
      stream.on("data", (chunk) => {
        emailData += chunk.toString();
      });
    });

    msg.once("attributes", (attrs) => {
      messageId = attrs.uid; // ✅ Use UID as a unique identifier
    });

    msg.once("end", async () => {
      try {
        if (!messageId) {
          console.warn("⚠️ Skipping email: No message ID found.");
          return;
        }

        // ✅ Check if the email already exists in the database
        const existingEmail = await Email.findOne({
          messageId,
          account: userId,
        });
        if (existingEmail) {
          return;
        }

        const parsed = await simpleParser(emailData);
        // Example usage:

        const bodyText =
          parsed.html || parsed.text || "No email body available.";

        const catagory = await classifyEmail(bodyText);
        console.log(`📩 Classifying email: ${catagory}`);
        const emailRecord = {
          messageId, // ✅ Store messageId to prevent duplicates
          subject: parsed.subject || "No Subject",
          sender: parsed.from?.text || "Unknown Sender",
          senderName: parsed.from?.value?.[0]?.name || "",
          to: parsed.to?.text || "unknown@domain.com",
          preview: parsed.text
            ? parsed.text.substring(0, 100) + "..."
            : "No preview available",
          date: parsed.date || new Date(),
          read: false,
          category: catagory || "Inbox",
          account: userId,
          folder: "Inbox",
          body: bodyText,
        };

        console.log(`✅ Saving email: ${emailRecord.subject}`);
        await Email.create(emailRecord);
        console.log(`📩 Email saved successfully: ${emailRecord.subject}`);
      } catch (err) {
        console.error("❌ Error parsing email:", err);
      }
    });
  });

  fetch.once("error", (err) => console.error("❌ Fetch Error:", err));
  fetch.once("end", () => {
    console.log("📩 Email fetching complete.");
    imap.end();
  });
}

module.exports = { connectIMAP };
