const axios = require("axios");
require("dotenv").config();

async function getAccessToken(refreshToken) {
  const { data } = await axios.post("https://oauth2.googleapis.com/token", {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  return data.access_token;
}

module.exports = { getAccessToken };
