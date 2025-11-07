/**
 * Tick handler - runs periodic background tasks
 *
 * In production: Run via cron job with `bun tick`
 * In development: Run with `bun tick:watch` for automatic 10s intervals
 */

import { makeTownsBot } from "@towns-protocol/bot";
import commands from "./commands";
import { incrementTick, getCurrentTick } from "./game/game-state-service";
import { getAllTowns } from "./game/town-service";
import { cleanupAllExpired } from "./game/cleanup-service";
import { getTownState } from "./game/town-state-service";
import { updateTownResourceRewards } from "./game/resource-service";
import { renderMainMessage, getActionButtons } from "./game/message-service";
import { updateMainMessageWithInteraction } from "./game/main-message-service";
import { hasPendingLevelUpRequest, getPendingActions } from "./game/action-service";
import { executePendingActions } from "./game/action-executor";

async function tick() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Tick starting...`);

  try {
    // Create bot instance for sending messages
    const bot = await makeTownsBot(
      process.env.APP_PRIVATE_DATA!,
      process.env.JWT_SECRET!,
      {
        commands,
      }
    );

    // 1. Increment global tick
    const state = await incrementTick();
    const currentTick = state.currentTick;
    console.log(`  Current tick: ${currentTick}`);

    // 2. Cleanup expired entities globally
    await cleanupAllExpired(currentTick);
    console.log(`  ✓ Cleaned up expired battles, shields, and boosts`);

    // 3. Get all towns
    const towns = await getAllTowns();
    console.log(`  Processing ${towns.length} towns...`);

    // 4. Process each town
    for (const town of towns) {
      try {
        // a. Get town state
        const townState = await getTownState(town, currentTick);

        // b. Update resource rewards (add rewardsPerTick to rewardsBank)
        await updateTownResourceRewards(townState.resources, currentTick);

        // c. Apply actions (except battles)
        const pendingActions = await getPendingActions(town.address, currentTick);
        const { successful, failed } = await executePendingActions(
          town,
          pendingActions,
          currentTick
        );

        // Log action results
        for (const { action, result } of successful) {
          console.log(`    ✓ ${town.name}: ${result.message}`);

          // Send channel messages if any
          if (result.channelMessage) {
            await bot.sendMessage(town.channelId, result.channelMessage);
          }

          // TODO: Send global feed messages (Phase 2 completion)
        }

        for (const { action, result } of failed) {
          console.log(`    ✗ ${town.name}: ${result.message}`);
        }

        // d. TODO: Process battle requests (Phase 3)

        // e. TODO: Update battle suggestions (Phase 3)

        // f. Update main message with interaction request
        const pendingLevelUp = await hasPendingLevelUpRequest(town.address);
        // Refresh town state after actions
        const refreshedState = await getTownState(town, currentTick);
        const mainMessage = await renderMainMessage(
          refreshedState,
          currentTick,
          pendingLevelUp
        );
        const buttons = await getActionButtons(refreshedState, pendingLevelUp);
        await updateMainMessageWithInteraction(
          bot,
          town.channelId,
          town.address,
          mainMessage,
          buttons
        );
      } catch (error) {
        console.error(`  ✗ Error processing town ${town.name}:`, error);
        // Continue with next town
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] Tick completed in ${duration}ms\n`
    );
  } catch (error) {
    console.error("Fatal error in tick:", error);
    process.exit(1);
  }
}

// Run the tick function
await tick();

// Exit cleanly
process.exit(0);
