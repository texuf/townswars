import { makeTownsBot } from "@towns-protocol/bot";
import { Hono } from "hono";
import { logger } from "hono/logger";
import commands from "./commands";
import { getOrCreateTown, isEngaged } from "./game/town-service";
import { getCurrentTick } from "./game/game-state-service";
import { renderMainMessage } from "./game/message-service";
import { InteractionRequest, PlainMessage } from "@towns-protocol/proto";
import { sendGlobalFeedMessage } from "./game/feed-service";

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
  const { channelId, spaceId, eventId } = event;

  try {
    // Check if already engaged
    const alreadyEngaged = await isEngaged(spaceId);

    if (alreadyEngaged) {
      await handler.sendMessage(
        channelId,
        "You're already engaged in Towns Wars!"
      );
      return;
    }

    // delete the event
    await handler.adminRemoveEvent(channelId, eventId);

    // Create new town
    const currentTick = await getCurrentTick();
    const { town } = await getOrCreateTown(
      spaceId,
      channelId,
      spaceId,
      currentTick
    );

    // Send main message with interaction request
    const { getTownState } = await import("./game/town-state-service");
    const { hasPendingLevelUpRequest } = await import("./game/action-service");
    const { getActionButtons } = await import("./game/message-service");
    const { updateMainMessage } = await import("./game/main-message-service");

    const townState = await getTownState(town, currentTick);
    const pendingLevelUp = await hasPendingLevelUpRequest(town.address);
    const { message: mainMessage, isSpecialMessage } = await renderMainMessage(
      townState,
      currentTick,
      pendingLevelUp
    );
    const buttons = await getActionButtons(
      townState,
      pendingLevelUp,
      currentTick,
      isSpecialMessage
    );

    const handlerWrapper = {
      sendMessage: (channelId: string, message: string) => {
        return handler.sendMessage(channelId, message);
      },
      removeEvent: (channelId: string, eventId: string) => {
        return handler.adminRemoveEvent(channelId, eventId);
      },
      sendInteractionRequest: (
        channelId: string,
        request: PlainMessage<InteractionRequest["content"]>
      ) => {
        return handler.sendInteractionRequest(channelId, {
          recipient: undefined,
          content: request,
        });
      },
    };
    await updateMainMessage(handlerWrapper, channelId, mainMessage, buttons);
  } catch (error) {
    console.error("Error in /engage command:", error);
    await handler.sendMessage(
      channelId,
      "❌ Failed to create town. Please try again."
    );
  }
});

bot.onSlashCommand("quit", async (handler, event) => {
  const { spaceId, channelId, eventId } = event;

  try {
    // Check if user has a town
    const { getTown, deleteTown } = await import("./game/town-service");
    const town = await getTown(spaceId);

    if (!town) {
      await handler.sendMessage(
        channelId,
        "❌ You're not currently playing Towns Wars. Use `/engage` to join!"
      );
      return;
    }

    // delete the event
    await handler.adminRemoveEvent(channelId, eventId);

    // Delete the main message and interaction buttons
    const { deleteMainMessage } = await import("./game/main-message-service");
    const handlerWrapper = {
      sendMessage: (channelId: string, message: string) => {
        return handler.sendMessage(channelId, message);
      },
      removeEvent: (channelId: string, eventId: string) => {
        return handler.adminRemoveEvent(channelId, eventId);
      },
      sendInteractionRequest: (
        channelId: string,
        request: PlainMessage<InteractionRequest["content"]>
      ) => {
        return handler.sendInteractionRequest(channelId, {
          recipient: undefined,
          content: request,
        });
      },
    };
    await deleteMainMessage(handlerWrapper, channelId);

    // Delete the town from database (cascades to all related data)
    await deleteTown(spaceId);

    await sendGlobalFeedMessage(bot, `**${town.name}** has quit the game.`);
    // Send goodbye message
    await handler.sendMessage(channelId, `**${town.name}** has been deleted.`);
  } catch (error) {
    console.error("Error in /quit command:", error);
    await handler.sendMessage(
      channelId,
      "❌ Failed to quit the game. Please try again or contact support."
    );
  }
});

// ============================================================================
// INTERACTION RESPONSE HANDLER
// ============================================================================

bot.onInteractionResponse(async (handler, event) => {
  const { spaceId, channelId, response } = event;

  // Check if this is a form response
  if (response.payload.content.case !== "form") {
    console.error(
      "Expected form response, got:",
      response.payload.content.case
    );
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

  console.log(`Interaction response from ${spaceId}: ${buttonId}`);

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
      queueBattle,
    } = await import("./game/action-service");

    const town = await getTown(spaceId);
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
          await queueShield(spaceId, currentTick + 1);
          confirmMessage = "✓ Queued shield purchase for next tick";
        } else if (params[0] === "boost") {
          await queueBoost(spaceId, currentTick + 1);
          confirmMessage = "✓ Queued boost purchase for next tick";
        } else {
          // Resource type
          const resourceType = parseInt(params[0]);
          await queueBuyResource(spaceId, currentTick + 1, resourceType);
          confirmMessage = "✓ Queued resource purchase for next tick";
        }
        break;
      }

      case "upgrade": {
        const resourceId = params[0];
        await queueUpgradeResource(spaceId, currentTick + 1, resourceId);
        confirmMessage = "✓ Queued resource upgrade for next tick";
        break;
      }

      case "collect": {
        const resourceId = params[0];
        await queueCollect(spaceId, currentTick + 1, resourceId);
        confirmMessage = "✓ Queued collection for next tick";
        break;
      }

      case "levelup": {
        if (params[0] === "request") {
          await queueLevelUpRequest(spaceId, currentTick + 1);
          confirmMessage = "✓ Queued level up request for next tick";
        } else if (params[0] === "approve") {
          await queueLevelUpApproval(spaceId, currentTick + 1);
          confirmMessage = "✓ Queued level up approval for next tick";
        } else if (params[0] === "cancel") {
          await queueLevelUpCancel(spaceId, currentTick + 1);
          confirmMessage = "✓ Queued level up cancellation for next tick";
        }
        break;
      }

      case "attack": {
        const targetAddress = params[0];

        // Validate target exists
        const { getTown } = await import("./game/town-service");
        const targetTown = await getTown(targetAddress);

        if (!targetTown) {
          await handler.sendMessage(
            channelId,
            "❌ Target town not found. They may have left the game."
          );
          return;
        }

        // Validate not attacking self
        if (targetAddress === spaceId) {
          await handler.sendMessage(
            channelId,
            "❌ You cannot attack yourself!"
          );
          return;
        }

        // Validate can afford attack
        const { TOWN_LEVELS_TABLE } = await import("./game/static-data");
        const townLevel = TOWN_LEVELS_TABLE[town.level];

        if (!townLevel || town.coins < townLevel.attackCost) {
          await handler.sendMessage(
            channelId,
            `❌ Not enough coins! Need ${townLevel?.attackCost || 0} coins.`
          );
          return;
        }

        // Validate has troops
        if (town.troops === 0) {
          await handler.sendMessage(
            channelId,
            "❌ You need troops to attack! Build barracks and collect troops first."
          );
          return;
        }

        await queueBattle(spaceId, currentTick + 1, targetAddress);
        confirmMessage = `⚔️ **Attack queued!**\n\nYour ${town.troops} troops will attack **${targetTown.name}** (Level ${targetTown.level}) next tick!`;
        break;
      }

      default:
        console.error(`Unknown action: ${action}`);
        return;
    }

    if (confirmMessage) {
      // await handler.sendMessage(channelId, confirmMessage);
      console.log(confirmMessage);
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
  const { message, spaceId, channelId, eventId, createdAt } = event;

  // If user is engaged, delete their messages in this channel
  const engaged = await isEngaged(spaceId);
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
  const { receiverAddress, spaceId, amount, channelId } = event;

  try {
    // Check if receiver is engaged
    const engaged = await isEngaged(spaceId);
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
    const { updateMainMessage } = await import("./game/main-message-service");

    const townState = await getTownState(updatedTown, currentTick);
    const pendingLevelUp = await hasPendingLevelUpRequest(updatedTown.address);
    const { message: mainMessage, isSpecialMessage } = await renderMainMessage(
      townState,
      currentTick,
      pendingLevelUp
    );
    const buttons = await getActionButtons(
      townState,
      pendingLevelUp,
      currentTick,
      isSpecialMessage
    );

    const handlerWrapper = {
      sendInteractionRequest: (
        channelId: string,
        request: PlainMessage<InteractionRequest["content"]>
      ) => {
        return handler.sendInteractionRequest(channelId, {
          recipient: undefined,
          content: request,
        });
      },
      sendMessage: (channelId: string, message: string) => {
        return handler.sendMessage(channelId, message);
      },
      removeEvent: (channelId: string, eventId: string) => {
        return handler.adminRemoveEvent(channelId, eventId);
      },
    };

    await updateMainMessage(handlerWrapper, channelId, mainMessage, buttons);
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
