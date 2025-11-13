const express = require("express");
const noblox = require("noblox.js");

const app = express();
const PORT = process.env.PORT || 3000;

const COOKIE = process.env.ROBLOX_COOKIE;
const GROUP_ID = 16419863;
const OWNER_USERNAME = "singletomingleFR";

let lastProcessedId = 0;
let myRoleRank = 0;

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

    myRoleRank = await noblox.getRankInGroup(GROUP_ID, user.UserID);
    console.log(`📊 My rank in group: ${myRoleRank}`);
  } catch (err) {
    console.error("❌ Login failed:", err);
  }
}

// ---------------- PROCESS COMMAND ----------------
async function processCommand(post) {
  const username = post.poster.username;
  const msg = post.body;
  if (!msg) return;

  console.log(`👀 New post #${post.id} from ${username}: "${msg}"`);

  if (username.toLowerCase() !== OWNER_USERNAME.toLowerCase()) {
    console.log(`➡️ Skipping: not ${OWNER_USERNAME}`);
    return;
  }

  const args = msg.trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();

  async function canActOn(targetRank) {
    if (myRoleRank <= targetRank) {
      console.log(`⚠️ Cannot act: my rank (${myRoleRank}) <= target rank (${targetRank})`);
      await noblox.postOnGroupWall(
        GROUP_ID,
        `⚠️ Cannot execute command: insufficient rank (my rank: ${myRoleRank}, target rank: ${targetRank})`
      );
      return false;
    }
    return true;
  }

  try {
    if (cmd === "!promote" && args[0]) {
      const target = args[0];
      const id = await noblox.getIdFromUsername(target);
      const targetRank = await noblox.getRankInGroup(GROUP_ID, id);
      console.log(`Promote ${target} (ID: ${id}, rank: ${targetRank})`);

      if (await canActOn(targetRank)) {
        await noblox.promote(GROUP_ID, id);
        console.log(`✅ Promoted ${target}`);
        await noblox.postOnGroupWall(GROUP_ID, `✅ Successfully promoted ${target}`);
      } else {
        console.log(`⚠️ Would have promoted ${target} but rank too low`);
      }
    }

    else if (cmd === "!demote" && args[0]) {
      const target = args[0];
      const id = await noblox.getIdFromUsername(target);
      const targetRank = await noblox.getRankInGroup(GROUP_ID, id);
      console.log(`Demote ${target} (ID: ${id}, rank: ${targetRank})`);

      if (await canActOn(targetRank)) {
        await noblox.demote(GROUP_ID, id);
        console.log(`✅ Demoted ${target}`);
        await noblox.postOnGroupWall(GROUP_ID, `✅ Successfully demoted ${target}`);
      } else {
        console.log(`⚠️ Would have demoted ${target} but rank too low`);
      }
    }

    else if (cmd === "!setrank" && args[0] && args[1]) {
      const target = args[0];
      const rank = parseInt(args[1]);
      if (isNaN(rank)) {
        console.log(`❌ Invalid rank number: ${args[1]}`);
        await noblox.postOnGroupWall(GROUP_ID, `❌ Invalid rank number: ${args[1]}`);
        return;
      }
      const id = await noblox.getIdFromUsername(target);
      console.log(`SetRank ${target} (ID: ${id}, new rank: ${rank})`);

      if (await canActOn(rank)) {
        await noblox.setRank(GROUP_ID, id, rank);
        console.log(`✅ Set rank of ${target} to ${rank}`);
        await noblox.postOnGroupWall(GROUP_ID, `✅ Successfully set ${target}'s rank to ${rank}`);
      } else {
        console.log(`⚠️ Would have set rank for ${target} but rank too low`);
      }
    } else {
      console.log(`➡️ Unknown or invalid command: ${cmd}`);
    }
  } catch (e) {
    console.error(`❌ Error processing command:`, e.message || e);
    await noblox.postOnGroupWall(GROUP_ID, `❌ Error executing command: ${e.message || e}`);
  }
}

// ---------------- CHECK WALL ----------------
async function checkWall() {
  try {
    const wall = await noblox.getWall(GROUP_ID, "Desc");
    if (!wall || !wall.data || wall.data.length === 0) return;

    const newPosts = wall.data
      .filter(p => p?.id > lastProcessedId)
      .sort((a, b) => a.id - b.id);

    for (const post of newPosts) {
      await processCommand(post);
      lastProcessedId = Math.max(lastProcessedId, post.id);
      await new Promise(r => setTimeout(r, 1000)); // delay to avoid rate limits
    }
  } catch (err) {
    if (err.message && err.message.includes("Too many requests")) {
      console.warn("⚠️ Hit Roblox rate limit, will retry next check...");
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
  await checkWall(); // initial check
  setInterval(checkWall, 15000); // every 15 seconds
});
