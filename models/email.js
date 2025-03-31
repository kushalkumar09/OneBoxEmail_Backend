const mongoose = require("mongoose");

const EmailSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  sender: { type: String, required: true },
  to: { type: String, required: true }, // Fixed typo
  senderName: { type: String },
  preview: { type: String },
  date: { type: Date, required: true },
  read: { type: Boolean, default: false },
  category: {
    type: String,
    enum: [
      "Inbox",
      "Sent",
      "Interested",
      "Meeting Booked",
      "Not Interested",
      "Spam",
      "Out of Office",
    ],
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // Relate to user accounts
  folder: {
    type: String,
    enum: ["Inbox", "Sent", "Drafts", "Spam", "Trash"],
    default: "Inbox",
  },
  body: { type: String, required: true },
});

module.exports = mongoose.model("Email", EmailSchema);
