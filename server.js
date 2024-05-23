const express = require("express");
const axios = require("axios");
require("dotenv").config();
const basicAuth = require("express-basic-auth");
const cors = require("cors");

const app = express();

// Assuming client_id and client_secret are stored in environment variables
const client_id = process.env.SPOTIFY_ID;
const client_secret = process.env.SPOTIFY_SECRET;

let accessToken = "";
let tokenExpiryTime = null;

app.use(cors()); // Enable CORS for all routes

app.use(
  (req, res, next) => {
    console.log("Basic Auth Middleware Triggered");
    next();
  },
  basicAuth({
    users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASS },
    challenge: true,
    unauthorizedResponse: (req) => {
      return req.auth ? "Invalid credentials" : "No credentials provided";
    },
  })
);

/*app.use(
  basicAuth({
    users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASS },
    challenge: true,
  })
);*/

const getAccessToken = async () => {
  try {
    const authOptions = {
      method: "post",
      url: "https://accounts.spotify.com/api/token",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(client_id + ":" + client_secret).toString("base64"),
      },
      data: "grant_type=client_credentials",
    };

    const response = await axios(authOptions);

    if (response.status === 200) {
      accessToken = response.data.access_token;
      tokenExpiryTime = Date.now() + response.data.expires_in * 1000; // Calculate expiry time
      console.log("Access Token:", accessToken);
      console.log("Expires In:", response.data.expires_in, "seconds");

      return accessToken;
    } else {
      console.error("Failed to get access token:", response.data);
      return null;
    }
  } catch (err) {
    console.error("Error getting access token:", err.message);
    return null;
  }
};

// Middleware to ensure the access token is always fresh
const ensureFreshAccessToken = async (req, res, next) => {
  if (!accessToken || Date.now() >= tokenExpiryTime) {
    console.log("Fetching new access token...");
    await getAccessToken();
  }
  next();
};

// Endpoint to get the current access token
app.get("/get_access_token", ensureFreshAccessToken, (req, res) => {
  res.send({ access_token: accessToken });
});

// Automatically refresh the access token before it expires (every 55 minutes)
setInterval(async () => {
  await getAccessToken();
}, 55 * 60 * 1000);

// Start the Express server (adjust the port as needed)
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
