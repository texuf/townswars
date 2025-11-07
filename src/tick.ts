/**
 * Tick handler - runs periodic background tasks
 *
 * In production: Run via cron job with `bun tick`
 * In development: Run with `bun tick:watch` for automatic 10s intervals
 */

import { makeTownsBot } from "@towns-protocol/bot";
import commands from "./commands";
import { incrementTick, getCurrentTick } from "./game/game-state-service";
import { getAllTowns, getTown, updateTown } from "./game/town-service";
import { cleanupAllExpired } from "./game/cleanup-service";
import {
  getTownState,
  getTownResources,
  canBeAttacked,
} from "./game/town-state-service";
import { updateTownResourceRewards } from "./game/resource-service";
import { renderMainMessage, getActionButtons } from "./game/message-service";
import { updateMainMessage } from "./game/main-message-service";
import {
  hasPendingLevelUpRequest,
  getPendingActions,
} from "./game/action-service";
import { executePendingActions } from "./game/action-executor";
import {
  createBattle,
  resolveBattle,
  getBattleEndingAtTick,
} from "./game/battle-service";
import { sendGlobalFeedMessage } from "./game/feed-service";
import { ActionType, formatDollars } from "./game/static-data";
import { logTownError } from "./game/error-service";

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
        const pendingActions = await getPendingActions(
          town.address,
          currentTick
        );
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

          // Send global feed messages if any
          if (result.feedMessage) {
            await sendGlobalFeedMessage(bot, result.feedMessage);
          }
        }

        for (const { action, result } of failed) {
          console.log(`    ✗ ${town.name}: ${result.message}`);
        }

        // d. Process battle requests (Phase 3)
        const battleActions = pendingActions.filter(
          (a) => a.type === ActionType.Battle
        );

        for (const battleAction of battleActions) {
          try {
            const targetAddress = (battleAction.data as any).targetAddress;
            const targetTown = await getTown(targetAddress);

            if (!targetTown) {
              const errorMsg = `Battle target not found: ${targetAddress}`;
              console.log(`    ✗ ${town.name}: ${errorMsg}`);
              await logTownError(town.address, errorMsg, currentTick);
              continue;
            }

            // Check if target can be attacked
            const targetCanBeAttacked = await canBeAttacked(
              targetAddress,
              currentTick
            );

            if (!targetCanBeAttacked) {
              const errorMsg = `Cannot attack ${targetTown.name} (shielded or in battle)`;
              console.log(`    ✗ ${town.name}: ${errorMsg}`);
              await logTownError(town.address, errorMsg, currentTick);
              continue;
            }

            // Get target resources for battle calculation
            const targetResources = await getTownResources(targetAddress);

            // Create battle (calculates outcome immediately)
            const battle = await createBattle(
              town.address,
              targetAddress,
              town,
              targetTown,
              targetResources,
              currentTick
            );

            // Reset attacker troops to 0
            await updateTown(town.address, { troops: 0 });

            // Send global feed message
            await sendGlobalFeedMessage(
              bot,
              `${town.name} is attacking ${
                targetTown.name
              } (potential gain: ${formatDollars(
                battle.reward
              )}, at risk: ${formatDollars(battle.penalty)})`
            );

            console.log(
              `    ⚔️ ${town.name} attacks ${targetTown.name} (ends at tick ${battle.end})`
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.error(
              `    ✗ Error processing battle for ${town.name}:`,
              error
            );
            await logTownError(
              town.address,
              `Battle creation failed: ${errorMessage}`,
              currentTick
            );
          }
        }

        // e. Check for battle resolution
        const endingBattle = await getBattleEndingAtTick(
          town.address,
          currentTick
        );

        if (endingBattle) {
          try {
            // Get attacker and defender
            const attackerTown = await getTown(endingBattle.attackerAddress);
            const defenderTown = await getTown(endingBattle.defenderAddress);

            if (!attackerTown || !defenderTown) {
              const errorMsg = `Battle resolution failed: Missing town data`;
              console.error(`    ✗ ${errorMsg}`);
              if (attackerTown) {
                await logTownError(attackerTown.address, errorMsg, currentTick);
              }
              if (defenderTown) {
                await logTownError(defenderTown.address, errorMsg, currentTick);
              }
            } else {
              // Resolve battle (transfer treasury)
              await resolveBattle(endingBattle, attackerTown, defenderTown);

              // Send global feed messages based on outcome
              if (endingBattle.success) {
                const actualReward = Math.floor(
                  (endingBattle.reward * endingBattle.percentage) / 100
                );

                await sendGlobalFeedMessage(
                  bot,
                  `${attackerTown.name} demolished ${
                    defenderTown.name
                  }, gained ${formatDollars(actualReward)}`
                );

                console.log(
                  `    🏆 ${attackerTown.name} won battle vs ${defenderTown.name}`
                );
              } else {
                await sendGlobalFeedMessage(
                  bot,
                  `${defenderTown.name} beat back ${
                    attackerTown.name
                  }, gained ${formatDollars(endingBattle.penalty)}`
                );

                console.log(
                  `    🛡️ ${defenderTown.name} defended vs ${attackerTown.name}`
                );
              }
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.error(
              `    ✗ Error resolving battle for ${town.name}:`,
              error
            );
            await logTownError(
              town.address,
              `Battle resolution failed: ${errorMessage}`,
              currentTick
            );
          }
        }

        // f. Update main message with interaction request
        const pendingLevelUp = await hasPendingLevelUpRequest(town.address);
        // Refresh town state after actions
        const refreshedState = await getTownState(town, currentTick);
        const { message: mainMessage, isSpecialMessage } = await renderMainMessage(
          refreshedState,
          currentTick,
          pendingLevelUp
        );
        const buttons = await getActionButtons(
          refreshedState,
          pendingLevelUp,
          currentTick,
          isSpecialMessage
        );
        await updateMainMessage(bot, town.channelId, mainMessage, buttons);
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
