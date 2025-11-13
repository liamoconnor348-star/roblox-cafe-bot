const express = require("express");
const noblox = require("noblox.js");

const app = express();
const PORT = process.env.PORT || 3000;

const COOKIE = process.env.ROBLOX_COOKIE;
const GROUP_ID = 16419863;
const OWNER_USERNAME = "singletomingleFR";

let lastProcessedId = 0;
let myRoleRank = 0; // store singletomingleFR's rank in the group

// ---------------- LOGIN ----------------
async function login() {
  if (!COOKIE) {
    console.error("❌ ROBLOX_COOKIE variable missing!");
    return;
  }

  try {
    await noblox.setCookie(COOKIE);
    const user = await noblox.getCurrentUser();
    console.log(`✅ Logged in as ${user.UserName} (ID: ${user.UserID})`);

    // get group role for permission checking
    const role = await noblox.getRankInGroup(GROUP_ID, user.UserID);
    myRoleRank = role;
    console.log(`📊 Current rank in group: ${myRoleRank}`);
  } catch (err) {
    console.error("❌ Login failed:", err);
  }
}

// ---------------- GROUP COMMANDS ----------------
async function checkWall() {
  try {
    const wall = await noblox.getWall(GROUP_ID, 10);
    if (!wall || !wall.data || wall.data.length === 0) return;

    const postsToProcess = wall.data
      .filter(post => post?.id > lastProcessedId && post?.poster?.username)
      .sort((a, b) => a.id - b.id);

    for (const post of postsToProcess) {
      const username = post.poster.username;
      const msg = post.body;
      if (!msg) continue;
      if (username.toLowerCase() !== OWNER_USERNAME.toLowerCase()) continue;

      console.log(`📩 Command from ${username}: ${msg.trim()}`);
      const args = msg.trim().split(" ");
      const cmd = args.shift().toLowerCase();

      // --- HELPER FUNCTION ---
      async function hasPermission(targetRank) {
        if (myRoleRank <= targetRank) {
          await noblox.postOnGroupWall(
            GROUP_ID,
            `❌ Cannot execute command; your rank (${myRoleRank}) is too low.`
          );
          console.warn(`⚠️ Permission denied. My rank: ${myRoleRank}, target rank: ${targetRank}`);
          return false;
        }
        return true;
      }

      // --- PROMOTE ---
      if (cmd === "!promote" && args[0]) {
        const target = args[0];
        try {
          const id = await noblox.getIdFromUsername(target);
          const targetRank = await noblox.getRankInGroup(GROUP_ID, id);
          if (!(await hasPermission(targetRank))) continue;

          console.log(`Attempting to promote ${target} (ID: ${id})`);
          await noblox.promote(GROUP_ID, id);
          await noblox.postOnGroupWall(GROUP_ID, `✅ Successfully promoted ${target}`);
          console.log(`✅ Promoted ${target}`);
        } catch (e) {
          console.error(`❌ Failed to promote ${target}:`, e.message || e);
          await noblox.postOnGroupWall(GROUP_ID, `❌ Failed to promote ${target}: ${e.message || e}`);
        }
      }

      // --- DEMOTE ---
      else if (cmd === "!demote" && args[0]) {
        const target = args[0];
        try {
          const id = await noblox.getIdFromUsername(target);
          const targetRank = await noblox.getRankInGroup(GROUP_ID, id);
          if (!(await hasPermission(targetRank))) continue;

          console.log(`Attempting to demote ${target} (ID: ${id})`);
          await noblox.demote(GROUP_ID, id);
          await noblox.postOnGroupWall(GROUP_ID, `✅ Successfully demoted ${target}`);
          console.log(`✅ Demoted ${target}`);
        } catch (e) {
          console.error(`❌ Failed to demote ${target}:`, e.message || e);
          await noblox.postOnGroupWall(GROUP_ID, `❌ Failed to demote ${target}: ${e.message || e}`);
        }
      }

      // --- SET RANK ---
      else if (cmd === "!setrank" && args[0] && args[1]) {
        const target = args[0];
        const rank = parseInt(args[1]);
        if (isNaN(rank)) {
          console.log(`❌ Invalid rank number: ${args[1]}`);
          await noblox.postOnGroupWall(GROUP_ID, `❌ Invalid rank number: ${args[1]}`);
          continue;
        }
        try {
          const id = await noblox.getIdFromUsername(target);
          if (!(await hasPermission(rank))) continue;

          console.log(`Attempting to set rank ${rank} for ${target} (ID: ${id})`);
          await noblox.setRank(GROUP_ID, id, rank);
          await noblox.postOnGroupWall(GROUP_ID, `✅ Successfully set ${target}'s rank to ${rank}`);
          console.log(`✅ Set ${target}'s rank to ${rank}`);
        } catch (e) {
          console.error(`❌ Failed to set rank for ${target}:`, e.message || e);
          await noblox.postOnGroupWall(GROUP_ID, `❌ Failed to set rank for ${target}: ${e.message || e}`);
        }
      }

      lastProcessedId = Math.max(lastProcessedId, post.id);
    }

  } catch (err) {
    if (err.message && err.message.includes("Too many requests")) {
      console.warn("⚠️ Hit Roblox rate limit, waiting 2 minutes before retrying...");
    } else {
      console.error("⚠️ Error checking wall:", err);
    }
  }
}

// ---------------- WEB SERVER ----------------
app.get("/", (req, res) => res.send("Roblox Group Command Bot is running ✅"));

app.listen(PORT, async () => {
  console.log(`🌐 Running on port ${PORT}`);
  console.log("ROBLOX_COOKIE present?", !!process.env.ROBLOX_COOKIE);
  await login();
  setInterval(checkWall, 10000); // check every 10 seconds.
});
