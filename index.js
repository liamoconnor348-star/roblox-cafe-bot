const express = require("express");
const noblox = require("noblox.js");

const app = express();
const PORT = process.env.PORT || 3000;

// CONFIGURATION
const COOKIE = process.env.ROBLOX_COOKIE;
const GROUP_ID = 16419863;
const OWNER_USERNAME = "singletomingleFR";

let lastPostId = null;

// ---------------- LOGIN ----------------
async function login() {
  if (!COOKIE) {
    console.error("❌ ROBLOX_COOKIE variable missing in Render! Add it in Environment → ROBLOX_COOKIE.");
    return;
  }

  try {
    await noblox.setCookie(COOKIE);
    const user = await noblox.getCurrentUser();
    console.log(`✅ Logged in as ${user.UserName}`);
  } catch (err) {
    console.error("❌ Login failed:", err);
  }
}

// ---------------- GROUP COMMANDS ----------------
async function checkWall() {
  try {
    const wall = await noblox.getWall(GROUP_ID, 1);
    if (!wall || !wall.data || wall.data.length === 0) return;

    const latest = wall.data[0];
    if (!latest || !latest.poster || !latest.poster.username) return;
    if (latest.id === lastPostId) return;

    lastPostId = latest.id;

    const username = latest.poster.username;
    const msg = latest.body;
    if (!msg) return;

    // only respond to your account
    if (username.toLowerCase() !== OWNER_USERNAME.toLowerCase()) return;

    console.log(`📩 Command from ${username}: ${msg.trim()}`);
    const args = msg.trim().split(" ");
    const cmd = args.shift().toLowerCase();

    if (cmd === "!promote" && args[0]) {
      const target = args[0];
      const id = await noblox.getIdFromUsername(target);
      await noblox.promote(GROUP_ID, id);
      await noblox.postOnGroupWall(GROUP_ID, `✅ Promoted ${target}`);
    }
    else if (cmd === "!demote" && args[0]) {
      const target = args[0];
      const id = await noblox.getIdFromUsername(target);
      await noblox.demote(GROUP_ID, id);
      await noblox.postOnGroupWall(GROUP_ID, `✅ Demoted ${target}`);
    }
    else if (cmd === "!setrank" && args[0] && args[1]) {
      const target = args[0];
      const rank = parseInt(args[1]);
      if (isNaN(rank)) return;
      const id = await noblox.getIdFromUsername(target);
      await noblox.setRank(GROUP_ID, id, rank);
      await noblox.postOnGroupWall(GROUP_ID, `✅ Set ${target}'s rank to ${rank}`);
    }

  } catch (err) {
    if (err.message && err.message.includes("Too many requests")) {
      console.warn("⚠️ Hit Roblox rate limit, waiting 2 minutes before retrying...");
      lastPostId = null; // reset so the next check will attempt again
    } else {
      console.error("⚠️ Error checking wall:", err);
    }
  }
}

// ---------------- WEB SERVER ----------------
app.get("/", function(req, res) {
  res.send("Roblox Group Command Bot is running ✅");
});

app.listen(PORT, async function() {
  console.log("🌐 Running on port " + PORT);
  console.log("ROBLOX_COOKIE present?", !!process.env.ROBLOX_COOKIE);
  await login();
  setInterval(checkWall, 120000); // check group wall every 2 minutes
});
