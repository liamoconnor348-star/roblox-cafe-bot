const express = require("express");
const noblox = require("noblox.js");

const app = express();
const PORT = process.env.PORT || 3000;

// CONFIGURATION — everything else stays in Render’s dashboard
const COOKIE = process.env.COOKIE;           // set in Render Environment tab
const GROUP_ID = 16419863;                   // your Roblox group ID
const OWNER_USERNAME = "singletomingleFR";   // only you can use commands

let lastPostId = null;

// ---------------- LOGIN ----------------
async function login() {
  if (!COOKIE) {
    console.error("❌ COOKIE variable missing in Render! Go to Environment → add COOKIE.");
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
    // use latest noblox.js function
    const wall = await noblox.getWall(GROUP_ID, 1);
    if (!wall.data || wall.data.length === 0) return;

    const latest = wall.data[0];
    if (latest.id === lastPostId) return; // skip repeats
    lastPostId = latest.id;

    const username = latest.poster.username;
    const msg = latest.body.trim();

    if (username.toLowerCase() !== OWNER_USERNAME.toLowerCase()) return;

    console.log(`📩 Command from ${username}: ${msg}`);
    const args = msg.split(" ");
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
      if (isNaN(rank)) {
        await noblox.postOnGroupWall(GROUP_ID, "⚠️ Invalid rank number!");
        return;
      }
      const id = await noblox.getIdFromUsername(target);
      await noblox.setRank(GROUP_ID, id, rank);
      await noblox.postOnGroupWall(GROUP_ID, `✅ Set ${target}'s rank to ${rank}`);
    }

  } catch (err) {
    console.error("⚠️ Error checking wall:", err);
  }
}

// ---------------- WEB SERVER ----------------
app.get("/", (req, res) => res.send("Roblox Group Command Bot is running ✅"));

app.listen(PORT, async () => {
  console.log(`🌐 Running on port ${PORT}`);
  console.log("COOKIE present?", !!process.env.COOKIE);
  await login();
  setInterval(checkWall, 10000); // every 10 s
});
