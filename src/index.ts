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

    // Send main message with interaction request
    const { getTownState } = await import("./game/town-state-service");
    const { hasPendingLevelUpRequest } = await import("./game/action-service");
    const { getActionButtons } = await import("./game/message-service");
    const { updateMainMessageWithInteraction } = await import("./game/main-message-service");

    const townState = await getTownState(town, currentTick);
    const pendingLevelUp = await hasPendingLevelUpRequest(town.address);
    const mainMessage = await renderMainMessage(townState, currentTick, pendingLevelUp);
    const buttons = await getActionButtons(townState, pendingLevelUp);

    await updateMainMessageWithInteraction(handler, channelId, userId, mainMessage, buttons);
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
// INTERACTION RESPONSE HANDLER
// ============================================================================

bot.onInteractionResponse(async (handler, event) => {
  const { userId, channelId, response } = event;

  // Check if this is a form response
  if (response.payload.content.case !== 'form') {
    console.error("Expected form response, got:", response.payload.content.case);
    return;
  }

  // Parse the button ID to determine the action
  const form = response.payload.content.value;

  // The clicked button's ID is in the first component of the response
  const buttonId = form.components[0]?.id;

  if (!buttonId) {
    console.error("No button ID in interaction response");
    return;
  }

  console.log(`Interaction response from ${userId}: ${buttonId}`);

  try {
    const { getTown } = await import("./game/town-service");
    const { getCurrentTick } = await import("./game/game-state-service");
    const {
      queueBuyResource,
      queueUpgradeResource,
      queueCollect,
      queueBoost,
      queueShield,
      queueLevelUpRequest,
      queueLevelUpApproval,
      queueLevelUpCancel,
    } = await import("./game/action-service");

    const town = await getTown(userId);
    if (!town) {
      await handler.sendMessage(channelId, "You need to `/engage` first!");
      return;
    }

    const currentTick = await getCurrentTick();
    const [action, ...params] = buttonId.split(":");

    let confirmMessage = "";

    switch (action) {
      case "buy": {
        if (params[0] === "shield") {
          await queueShield(userId, currentTick + 1);
          confirmMessage = "✓ Queued shield purchase for next tick";
        } else if (params[0] === "boost") {
          await queueBoost(userId, currentTick + 1);
          confirmMessage = "✓ Queued boost purchase for next tick";
        } else {
          // Resource type
          const resourceType = parseInt(params[0]);
          await queueBuyResource(userId, currentTick + 1, resourceType);
          confirmMessage = "✓ Queued resource purchase for next tick";
        }
        break;
      }

      case "upgrade": {
        const resourceId = params[0];
        await queueUpgradeResource(userId, currentTick + 1, resourceId);
        confirmMessage = "✓ Queued resource upgrade for next tick";
        break;
      }

      case "collect": {
        const resourceId = params[0];
        await queueCollect(userId, currentTick + 1, resourceId);
        confirmMessage = "✓ Queued collection for next tick";
        break;
      }

      case "levelup": {
        if (params[0] === "request") {
          await queueLevelUpRequest(userId, currentTick + 1);
          confirmMessage = "✓ Queued level up request for next tick";
        } else if (params[0] === "approve") {
          await queueLevelUpApproval(userId, currentTick + 1);
          confirmMessage = "✓ Queued level up approval for next tick";
        } else if (params[0] === "cancel") {
          await queueLevelUpCancel(userId, currentTick + 1);
          confirmMessage = "✓ Queued level up cancellation for next tick";
        }
        break;
      }

      default:
        console.error(`Unknown action: ${action}`);
        return;
    }

    if (confirmMessage) {
      await handler.sendMessage(channelId, confirmMessage);
    }
  } catch (error) {
    console.error("Error handling interaction response:", error);
    await handler.sendMessage(channelId, "❌ Failed to process action");
  }
});

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

bot.onMessage(async (handler, event) => {
  const { message, channelId, eventId, createdAt, userId } = event;

  // If user is engaged, delete their messages in this channel
  const engaged = await isEngaged(userId);
  if (engaged) {
    try {
      // Delete the user's message using admin permissions
      await handler.adminRemoveEvent(channelId, eventId);
    } catch (error) {
      console.error("Error deleting engaged user message:", error);
    }
    return;
  }

  // Handle test commands for non-engaged users
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

// ============================================================================
// TIP HANDLER
// ============================================================================

bot.onTip(async (handler, event) => {
  const { receiverAddress, amount, channelId } = event;

  try {
    // Check if receiver is engaged
    const engaged = await isEngaged(receiverAddress);
    if (!engaged) {
      // Not engaged, ignore tip for game purposes
      return;
    }

    // Convert ETH amount (in wei) to ETH
    const ethAmount = Number(amount) / 1e18;

    // Convert to coins using conversion function
    const { tipToCoins } = await import("./game/static-data");
    const coinsToAdd = tipToCoins(ethAmount);

    // Add coins to town
    const { addCoins } = await import("./game/town-service");
    const updatedTown = await addCoins(receiverAddress, coinsToAdd);

    // Send notification
    await handler.sendMessage(
      channelId,
      `💰 Tip received! +${coinsToAdd} coins added to your town.`
    );

    // Update main message with interaction request
    const currentTick = await getCurrentTick();
    const { getTownState } = await import("./game/town-state-service");
    const { hasPendingLevelUpRequest } = await import("./game/action-service");
    const { getActionButtons } = await import("./game/message-service");
    const { updateMainMessageWithInteraction } = await import("./game/main-message-service");

    const townState = await getTownState(updatedTown, currentTick);
    const pendingLevelUp = await hasPendingLevelUpRequest(updatedTown.address);
    const mainMessage = await renderMainMessage(townState, currentTick, pendingLevelUp);
    const buttons = await getActionButtons(townState, pendingLevelUp);

    await updateMainMessageWithInteraction(handler, channelId, receiverAddress, mainMessage, buttons);
  } catch (error) {
    console.error("Error handling tip:", error);
    // Don't send error to channel - tip was still received
  }
});
const { jwtMiddleware, handler } = bot.start();

const app = new Hono();
app.use(logger());
app.get("/", (c) => c.text("hello world"));
app.post("/webhook", jwtMiddleware, handler);

export default app;
