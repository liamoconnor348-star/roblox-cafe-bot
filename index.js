const express = require("express");
const noblox = require("noblox.js");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const COOKIE = process.env.COOKIE; // from Render env var
const GROUP_ID = 16419863; // your Roblox group ID
const OWNER_USERNAME = "singletomingleFR";

let lastPostId = null;

async function login() {
  try {
    await noblox.setCookie(COOKIE);
    const user = await noblox.getCurrentUser();
    console.log(`✅ Logged in as ${user.UserName}`);
  } catch (err) {
    console.error("❌ Login failed:", err);
  }
}

async function checkGroupWall() {
  try {
    const posts = await noblox.getGroupWall(GROUP_ID, 1);
    if (!posts.length) return;

    const latest = posts[0];
    if (latest.id === lastPostId) return;
    lastPostId = latest.id;

    const username = latest.poster.username;
    const msg = latest.body.trim();

    if (username !== OWNER_USERNAME) return;

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
      const id = await noblox.getIdFromUsername(target);
      await noblox.setRank(GROUP_ID, id, rank);
      await noblox.postOnGroupWall(GROUP_ID, `✅ Set ${target}'s rank to ${rank}`);
    }

  } catch (err) {
    console.error("⚠️ Error checking wall:", err);
  }
}

app.get("/", (req, res) => res.send("Roblox Group Command Bot is running ✅"));

app.listen(PORT, async () => {
  console.log(`🌐 Server running on port ${PORT}`);
  await login();
  setInterval(checkGroupWall, 10000); // every 10 seconds
});
