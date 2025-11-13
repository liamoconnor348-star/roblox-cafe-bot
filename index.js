const express = require("express");
const noblox = require("noblox.js");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Configuration
const COOKIE = process.env.COOKIE;
const GROUP_ID = 16419863; // your Roblox group ID
const OWNER_USERNAME = "singletomingleFR";

let lastPostId = null;

// ---------------------- LOGIN ----------------------
async function login() {
  if (!COOKIE) {
    console.error("❌ Missing COOKIE environment variable!");
    return;
  }

  try {
    await noblox.setCookie(COOKIE);
    const currentUser = await noblox.getCurrentUser();
    console.log(`✅ Logged in as ${currentUser.UserName}`);
  } catch (err) {
    console.error("❌ Login failed:", err);
  }
}

// ---------------------- COMMAND HANDLER ----------------------
async function checkGroupWall() {
  try {
    // 🆕 getWall replaces the old getGroupWall
    const wall = await noblox.getWall(GROUP_ID, 1);
    if (!wall.data || wall.data.length === 0) return;

    const latest = wall.data[0];
    if (latest.id === lastPostId) return;
    lastPostId = latest.id;

    const username = latest.poster.username;
    const message = latest.body.trim();

    // only owner can run commands
    if (username.toLowerCase() !== OWNER_USERNAME.toLowerCase()) return;

    console.log(`📩 Command from ${username}: ${message}`);

    const args = message.split(" ");
    const command = args.shift().toLowerCase();

    if (command === "!promote" && args[0]) {
      const target = args[0];
      const id = await noblox.getIdFromUsername(target);
      await noblox.promote(GROUP_ID, id);
      await noblox.postOnGroupWall(GROUP_ID, `✅ Promoted ${target}`);
      console.log(`✅ Promoted ${target}`);
    }

    else if (command === "!demote" && args[0]) {
      const target = args[0];
      const id = await noblox.getIdFromUsername(target);
      await noblox.demote(GROUP_ID, id);
      await noblox.postOnGroupWall(GROUP_ID, `✅ Demoted ${target}`);
      console.log(`✅ Demoted ${target}`);
    }

    else if (command === "!setrank" && args[0] && args[1]) {
      const target = args[0];
      const rank = parseInt(args[1]);
      if (isNaN(rank)) {
        await noblox.postOnGroupWall(GROUP_ID, "⚠️ Invalid rank number!");
        return;
      }
      const id = await noblox.getIdFromUsername(target);
      await noblox.setRank(GROUP_ID, id, rank);
      await noblox.postOnGroupWall(GROUP_ID, `✅ Set ${target}'s rank to ${rank}`);
      console.log(`✅ Set ${target}'s rank to ${rank}`);
    }

  } catch (err) {
    console.error("⚠️ Error checking wall:", err);
  }
}

// ---------------------- EXPRESS SERVER ----------------------
app.get("/", (req, res) => {
  res.send("Roblox Group Command Bot is running ✅");
});

app.listen(PORT, async () => {
  console.log(`🌐 Server running on port ${PORT}`);
  console.log("COOKIE present?", !!process.env.COOKIE); // shows if cookie exists
  await login();
  setInterval(checkGroupWall, 10000); // every 10 seconds
});
