const express = require("express");
const noblox = require("noblox.js");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- CONFIG ----------------
const COOKIE = process.env.ROBLOX_COOKIE; // must match Render env
const GROUP_ID = 16419863;                 // your Roblox group ID
const OWNER_USERNAME = "singletomingleFR"; // only this account can run commands

let lastPostId = null;

// ---------------- LOGIN ----------------
async function login() {
  if (!COOKIE) {
    console.error("❌ ROBLOX_COOKIE variable missing in Render!");
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

// ---------------- COMMAND HANDLER ----------------
async function handleCommand(message) {
  const args = message.split(" ");
  const cmd = args.shift().toLowerCase();

  try {
    if (cmd === "!promote" && args[0]) {
      const target = args[0];
      const id = await noblox.getIdFromUsername(target);
      await noblox.promote(GROUP_ID, id);
      await noblox.postOnGroupWall(GROUP_ID, `✅ Promoted ${target}`);
      console.log(`✅ Promoted ${target}`);
    }

    else if (cmd === "!demote" && args[0]) {
      const target = args[0];
      const id = await noblox.getIdFromUsername(target);
      await noblox.demote(GROUP_ID, id);
      await noblox.postOnGroupWall(GROUP_ID, `✅ Demoted ${target}`);
      console.log(`✅ Demoted ${target}`);
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
      console.log(`✅ Set ${target}'s rank to ${rank}`);
    }
  } catch (err) {
    console.error("⚠️ Error executing command:", err);
  }
}

// ---------------- CHECK WALL ----------------
async function checkWall() {
  try {
    const wall = await noblox.getWall(GROUP_ID, 5); // last 5 posts
    if (!wall.data || wall.data.length === 0) return;

    for (const post of wall.data.reverse()) {
      if (!post.poster || !post.poster.username) continue;
      if (post.id <= lastPostId) continue;

      lastPostId = post.id;

      if (post.poster.username.toLowerCase() !== OWNER_USERNAME.toLowerCase()) continue;

      await handleCommand(post.body.trim());
    }
  } catch (err) {
    console.error("⚠️ Error checking wall:", err);
  }
}

// ---------------- EXPRESS SERVER ----------------
app.get("/", (req, res) => res.send("Roblox Group Command Bot is running ✅"));

app.listen(PORT, async () => {
  console.log(`🌐 Running on port ${PORT}`);
  console.log("ROBLOX_COOKIE present?", !!process.env.ROBLOX_COOKIE);
  await login();
  setInterval(checkWall, 2000);
});
