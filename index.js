const express = require("express");
const noblox = require("noblox.js");

const app = express();
const PORT = process.env.PORT || 3000;

const COOKIE = process.env.ROBLOX_COOKIE;
const GROUP_ID = 16419863;
const OWNER_USERNAME = "singletomingleFR";

let lastProcessedId = 0;
let myRoleRank = 0; // singletomingleFR's rank in the group

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

    // get group rank for permission checking
    myRoleRank = await noblox.getRankInGroup(GROUP_ID, user.UserID);
    console.log(`📊 My rank in group: ${myRoleRank}`);
  } catch (err) {
    console.error("❌ Login failed:", err);
  }
}

// ---------------- GROUP COMMANDS ----------------
async function checkWall() {
  try {
    const wall = await noblox.getWall(GROUP_ID, "Desc"); // newest first
    if (!wall || !wall.data || wall.data.length === 0) return;

    const postsToProcess = wall.data
      .slice(0, 10) // check last 10 posts
      .filter(post => post?.id > lastProcessedId && post?.poster?.username)
      .sort((a, b) => a.id - b.id); // oldest first

    for (const post of postsToProcess) {
      const username = post.poster.username;
      const msg = post.body;
      console.log(`👀 Found post #${post.id} from ${username}: "${msg}"`);

      lastProcessedId = Math.max(lastProcessedId, post.id);

      if (username.toLowerCase() !== OWNER_USERNAME.toLowerCase()) {
        console.log(`➡️ Skipping post: not from ${OWNER_USERNAME}`);
        continue;
      }

      if (!msg) {
        console.log("➡️ Skipping empty message");
        continue;
      }

      const args = msg.trim().split(/\s+/); // handle extra spaces
      const cmd = args.shift().toLowerCase();

      // HELPER: check permission
      async function canActOn(targetRank) {
        if (myRoleRank <= targetRank) {
          console.log(`⚠️ Cannot act: my rank (${myRoleRank}) <= target rank (${targetRank})`);
          await noblox.postOnGroupWall(
            GROUP_ID,
            `❌ Cannot execute command; my rank (${myRoleRank}) <= target rank (${targetRank})`
          );
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
          console.log(`Promote command: target ${target} (ID: ${id}, rank: ${targetRank})`);
          if (!(await canActOn(targetRank))) continue;

          await noblox.promote(GROUP_ID, id);
          console.log(`✅ Promoted ${target}`);
          await noblox.postOnGroupWall(GROUP_ID, `✅ Successfully promoted ${target}`);
        } catch (e) {
          console.error(`❌ Promote failed for ${target}:`, e.message || e);
          await noblox.postOnGroupWall(GROUP_ID, `❌ Failed to promote ${target}: ${e.message || e}`);
        }
      }

      // --- DEMOTE ---
      else if (cmd === "!demote" && args[0]) {
        const target = args[0];
        try {
          const id = await noblox.getIdFromUsername(target);
          const targetRank = await noblox.getRankInGroup(GROUP_ID, id);
          console.log(`Demote command: target ${target} (ID: ${id}, rank: ${targetRank})`);
          if (!(await canActOn(targetRank))) continue;

          await noblox.demote(GROUP_ID, id);
          console.log(`✅ Demoted ${target}`);
          await noblox.postOnGroupWall(GROUP_ID, `✅ Successfully demoted ${target}`);
        } catch (e) {
          console.error(`❌ Demote failed for ${target}:`, e.message || e);
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
          console.log(`SetRank command: target ${target} (ID: ${id}, new rank: ${rank})`);
          if (!(await canActOn(rank))) continue;

          await noblox.setRank(GROUP_ID, id, rank);
          console.log(`✅ Set rank of ${target} to ${rank}`);
          await noblox.postOnGroupWall(GROUP_ID, `✅ Successfully set ${target}'s rank to ${rank}`);
        } catch (e) {
          console.error(`❌ SetRank failed for ${target}:`, e.message || e);
          await noblox.postOnGroupWall(GROUP_ID, `❌ Failed to set rank for ${target}: ${e.message || e}`);
        }
      } else {
        console.log(`➡️ Unknown or invalid command: ${cmd}`);
      }
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
  setInterval(checkWall, 10000); // every 10 seconds.
});
