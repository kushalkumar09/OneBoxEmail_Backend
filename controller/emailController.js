const Email = require("../models/email");

exports.syncEmails = async (req, res) => {
  res.json({ message: "Syncing emails..." });
};

exports.getEmails = async (req, res) => {
  try {
    const userId = req.params.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required to fetch emails." });
    }

    const emails = await Email.find({ account: userId }).sort({ date: -1 });

    return res.status(200).json({
      success: true,
      message: emails.length ? "Emails retrieved successfully." : "No emails found for this user.",
      data: emails,
    });
  } catch (err) {
    console.error("❌ Error fetching emails:", err.message);
    return res.status(500).json({
      success: false,
      error: "Something went wrong while retrieving emails. Please try again later.",
    });
  }
};

