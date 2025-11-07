import { makeTownsBot } from "@towns-protocol/bot";
import { Hono } from "hono";
import { logger } from "hono/logger";
import commands from "./commands";
import { getOrCreateTown, isEngaged } from "./game/town-service";
import { getCurrentTick } from "./game/game-state-service";
import { renderMainMessage } from "./game/message-service";
import { updateMainMessage } from "./game/main-message-service";

const bot = await makeTownsBot(
  process.env.APP_PRIVATE_DATA!,
  process.env.JWT_SECRET!,
  {
    commands,
  }
);

// ============================================================================
// SLASH COMMANDS
// ============================================================================

bot.onSlashCommand("engage", async (handler, event) => {
  const { userId, channelId, spaceId } = event;

  try {
    // Check if already engaged
    const alreadyEngaged = await isEngaged(userId);

    if (alreadyEngaged) {
      await handler.sendMessage(
        channelId,
        "You're already engaged in Towns Wars! Check your town status below."
      );
      return;
    }

    // Create new town
    const currentTick = await getCurrentTick();
    const { town } = await getOrCreateTown(userId, channelId, spaceId, currentTick);

    // Send confirmation message
    await handler.sendMessage(
      channelId,
      `⚔️ Welcome to Towns Wars!\n\nYour town **${town.name}** has been founded!`
    );

    // Send main message
    const mainMessage = renderMainMessage(town, currentTick);
    await updateMainMessage(handler, channelId, mainMessage);
  } catch (error) {
    console.error("Error in /engage command:", error);
    await handler.sendMessage(
      channelId,
      "❌ Failed to create town. Please try again."
    );
  }
});

bot.onSlashCommand("help", async (handler, { channelId }) => {
  await handler.sendMessage(
    channelId,
    "**Available Commands:**\n\n" +
      "• `/engage` - Join the Towns Wars game\n" +
      "• `/help` - Show this help message\n" +
      "• `/time` - Get the current time\n\n" +
      "**How to Play:**\n\n" +
      "1. Use `/engage` to create your town\n" +
      "2. Build resources (cannons, barracks, mines)\n" +
      "3. Collect coins and troops\n" +
      "4. Attack other towns to win their treasury!\n"
  );
});

bot.onSlashCommand("time", async (handler, { channelId }) => {
  const currentTime = new Date().toLocaleString();
  await handler.sendMessage(channelId, `Current time: ${currentTime} ⏰`);
});

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

bot.onMessage(async (handler, { message, channelId, eventId, createdAt }) => {
  if (message.includes("hello")) {
    await handler.sendMessage(channelId, "Hello there! 👋");
    return;
  }
  if (message.includes("ping")) {
    const now = new Date();
    await handler.sendMessage(
      channelId,
      `Pong! 🏓 ${now.getTime() - createdAt.getTime()}ms`
    );
    return;
  }
  if (message.includes("react")) {
    await handler.sendReaction(channelId, eventId, "👍");
    return;
  }
});

bot.onReaction(async (handler, { reaction, channelId }) => {
  if (reaction === "👋") {
    await handler.sendMessage(channelId, "I saw your wave! 👋");
  }
});
const { jwtMiddleware, handler } = bot.start();

const app = new Hono();
app.use(logger());
app.get("/", (c) => c.text("hello world"));
app.post("/webhook", jwtMiddleware, handler);

export default app;
