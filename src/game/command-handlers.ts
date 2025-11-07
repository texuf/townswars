import type { BotHandler } from "@towns-protocol/bot";
import { getTown } from "./town-service";
import { getCurrentTick } from "./game-state-service";
import { getTownState, getTownResources } from "./town-state-service";
import { renderMainMessage } from "./message-service";
import { updateMainMessage } from "./main-message-service";
import {
  hasPendingLevelUpRequest,
  queueBuyResource,
  queueUpgradeResource,
  queueCollect,
  queueBoost,
  queueShield,
  queueLevelUpRequest,
  queueLevelUpApproval,
  queueLevelUpCancel,
} from "./action-service";
import { RESOURCE_DEFINITIONS_TABLE, RESOURCE_LIMITS_TABLE } from "./static-data";

/**
 * Handle /buy command
 */
export async function handleBuy(
  handler: BotHandler,
  userId: string,
  channelId: string,
  args: string[]
): Promise<void> {
  const town = await getTown(userId);
  if (!town) {
    await handler.sendMessage(channelId, "You need to `/engage` first!");
    return;
  }

  const resourceName = args[0]?.toLowerCase();
  if (!resourceName) {
    await handler.sendMessage(
      channelId,
      "Usage: `/buy <cannon|barracks|mine>`"
    );
    return;
  }

  // Find resource type by name
  let resourceType: number | undefined;
  for (const [type, def] of Object.entries(RESOURCE_DEFINITIONS_TABLE)) {
    if (def.name.toLowerCase() === resourceName) {
      resourceType = Number(type);
      break;
    }
  }

  if (!resourceType) {
    await handler.sendMessage(
      channelId,
      `Unknown resource: ${resourceName}. Try: cannon, barracks, or mine`
    );
    return;
  }

  // Queue the buy action for next tick
  const currentTick = await getCurrentTick();
  await queueBuyResource(userId, currentTick + 1, resourceType);

  await handler.sendMessage(
    channelId,
    `✓ Queued purchase of ${resourceName} for next tick`
  );
}

/**
 * Handle /upgrade command
 */
export async function handleUpgrade(
  handler: BotHandler,
  userId: string,
  channelId: string,
  args: string[]
): Promise<void> {
  const town = await getTown(userId);
  if (!town) {
    await handler.sendMessage(channelId, "You need to `/engage` first!");
    return;
  }

  const resourceName = args[0]?.toLowerCase();
  const indexStr = args[1];

  if (!resourceName || !indexStr) {
    await handler.sendMessage(
      channelId,
      "Usage: `/upgrade <cannon|barracks|mine> <number>`"
    );
    return;
  }

  const index = parseInt(indexStr) - 1; // Convert to 0-based
  if (isNaN(index) || index < 0) {
    await handler.sendMessage(channelId, "Invalid resource number");
    return;
  }

  // Find resource type by name
  let resourceType: number | undefined;
  for (const [type, def] of Object.entries(RESOURCE_DEFINITIONS_TABLE)) {
    if (def.name.toLowerCase() === resourceName) {
      resourceType = Number(type);
      break;
    }
  }

  if (!resourceType) {
    await handler.sendMessage(channelId, `Unknown resource: ${resourceName}`);
    return;
  }

  // Get town resources and find the specific one
  const townResources = await getTownResources(userId);
  const resourcesOfType = townResources.filter((r) => r.type === resourceType);

  if (index >= resourcesOfType.length) {
    await handler.sendMessage(
      channelId,
      `You only have ${resourcesOfType.length} ${resourceName}(s)`
    );
    return;
  }

  const resource = resourcesOfType[index];

  // Queue the upgrade action for next tick
  const currentTick = await getCurrentTick();
  await queueUpgradeResource(userId, currentTick + 1, resource.id);

  await handler.sendMessage(
    channelId,
    `✓ Queued upgrade of ${resourceName} #${index + 1} for next tick`
  );
}

/**
 * Handle /collect command
 */
export async function handleCollect(
  handler: BotHandler,
  userId: string,
  channelId: string,
  args: string[]
): Promise<void> {
  const town = await getTown(userId);
  if (!town) {
    await handler.sendMessage(channelId, "You need to `/engage` first!");
    return;
  }

  const resourceName = args[0]?.toLowerCase();
  const indexStr = args[1];

  if (!resourceName || !indexStr) {
    await handler.sendMessage(
      channelId,
      "Usage: `/collect <cannon|barracks|mine> <number>`"
    );
    return;
  }

  const index = parseInt(indexStr) - 1; // Convert to 0-based
  if (isNaN(index) || index < 0) {
    await handler.sendMessage(channelId, "Invalid resource number");
    return;
  }

  // Find resource type by name
  let resourceType: number | undefined;
  for (const [type, def] of Object.entries(RESOURCE_DEFINITIONS_TABLE)) {
    if (def.name.toLowerCase() === resourceName) {
      resourceType = Number(type);
      break;
    }
  }

  if (!resourceType) {
    await handler.sendMessage(channelId, `Unknown resource: ${resourceName}`);
    return;
  }

  // Get town resources and find the specific one
  const townResources = await getTownResources(userId);
  const resourcesOfType = townResources.filter((r) => r.type === resourceType);

  if (index >= resourcesOfType.length) {
    await handler.sendMessage(
      channelId,
      `You only have ${resourcesOfType.length} ${resourceName}(s)`
    );
    return;
  }

  const resource = resourcesOfType[index];

  // Queue the collect action for next tick
  const currentTick = await getCurrentTick();
  await queueCollect(userId, currentTick + 1, resource.id);

  await handler.sendMessage(
    channelId,
    `✓ Queued collection from ${resourceName} #${index + 1} for next tick`
  );
}

/**
 * Handle /buy-shield command
 */
export async function handleBuyShield(
  handler: BotHandler,
  userId: string,
  channelId: string
): Promise<void> {
  const town = await getTown(userId);
  if (!town) {
    await handler.sendMessage(channelId, "You need to `/engage` first!");
    return;
  }

  // Queue the shield action for next tick
  const currentTick = await getCurrentTick();
  await queueShield(userId, currentTick + 1);

  await handler.sendMessage(channelId, "✓ Queued shield purchase for next tick");
}

/**
 * Handle /buy-boost command
 */
export async function handleBuyBoost(
  handler: BotHandler,
  userId: string,
  channelId: string
): Promise<void> {
  const town = await getTown(userId);
  if (!town) {
    await handler.sendMessage(channelId, "You need to `/engage` first!");
    return;
  }

  // Queue the boost action for next tick
  const currentTick = await getCurrentTick();
  await queueBoost(userId, currentTick + 1);

  await handler.sendMessage(channelId, "✓ Queued boost purchase for next tick");
}

/**
 * Handle /request-levelup command
 */
export async function handleRequestLevelUp(
  handler: BotHandler,
  userId: string,
  channelId: string
): Promise<void> {
  const town = await getTown(userId);
  if (!town) {
    await handler.sendMessage(channelId, "You need to `/engage` first!");
    return;
  }

  // Queue the level up request for next tick
  const currentTick = await getCurrentTick();
  await queueLevelUpRequest(userId, currentTick + 1);

  await handler.sendMessage(
    channelId,
    "✓ Queued level up request for next tick"
  );
}

/**
 * Handle /approve-levelup command
 */
export async function handleApproveLevelUp(
  handler: BotHandler,
  userId: string,
  channelId: string
): Promise<void> {
  const town = await getTown(userId);
  if (!town) {
    await handler.sendMessage(channelId, "You need to `/engage` first!");
    return;
  }

  if (town.requestedLevel <= town.level) {
    await handler.sendMessage(channelId, "No level up pending!");
    return;
  }

  // Queue the approval for next tick
  const currentTick = await getCurrentTick();
  await queueLevelUpApproval(userId, currentTick + 1);

  await handler.sendMessage(
    channelId,
    "✓ Queued level up approval for next tick"
  );
}

/**
 * Handle /cancel-levelup command
 */
export async function handleCancelLevelUp(
  handler: BotHandler,
  userId: string,
  channelId: string
): Promise<void> {
  const town = await getTown(userId);
  if (!town) {
    await handler.sendMessage(channelId, "You need to `/engage` first!");
    return;
  }

  if (town.requestedLevel <= town.level) {
    await handler.sendMessage(channelId, "No level up pending!");
    return;
  }

  // Queue the cancellation for next tick
  const currentTick = await getCurrentTick();
  await queueLevelUpCancel(userId, currentTick + 1);

  await handler.sendMessage(
    channelId,
    "✓ Queued level up cancellation for next tick"
  );
}
