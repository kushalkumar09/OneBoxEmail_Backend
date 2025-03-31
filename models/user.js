const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true }, // Primary email
    avatar: String,
    connectedEmails: [
      {
        email: { type: String, required: true },
        refreshToken: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);



module.exports = mongoose.model("User", UserSchema);
