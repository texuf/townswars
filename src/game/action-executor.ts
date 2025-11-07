import { and, eq } from "drizzle-orm";
import type { Action, Town, Resource } from "../db";
import { db, resources, boosts, shields } from "../db";
import {
  ActionType,
  RESOURCE_DEFINITIONS_TABLE,
  RESOURCE_LIMITS_TABLE,
  TOWN_LEVELS_TABLE,
} from "./static-data";
import type {
  BuyActionData,
  UpgradeResourceActionData,
  CollectActionData,
} from "./action-service";
import { deleteAction } from "./action-service";
import { updateTown, addCoins, addTroops, levelUpTown } from "./town-service";
import { collectResourceRewards } from "./resource-service";
import { logTownError } from "./error-service";

/**
 * Result of executing an action
 */
export interface ActionResult {
  success: boolean;
  message: string;
  feedMessage?: string; // Global message to all channels
  channelMessage?: string; // Message only to this channel
}

/**
 * Execute a buy resource action
 */
async function executeBuyResource(
  action: Action,
  town: Town,
  currentTick: number
): Promise<ActionResult> {
  const data = action.data as BuyActionData;
  const { resourceType } = data;

  const resourceDef = RESOURCE_DEFINITIONS_TABLE[resourceType];
  if (!resourceDef) {
    return {
      success: false,
      message: `Unknown resource type: ${resourceType}`,
    };
  }

  const resourceLimit = RESOURCE_LIMITS_TABLE[town.level]?.[resourceType];
  if (!resourceLimit) {
    return {
      success: false,
      message: `Resource type ${resourceType} not available at level ${town.level}`,
    };
  }

  // Check if already at limit
  const existingResources = await db
    .select()
    .from(resources)
    .where(
      and(
        eq(resources.townAddress, town.address),
        eq(resources.type, resourceType)
      )
    );

  if (existingResources.length >= resourceLimit.count) {
    return {
      success: false,
      message: `Already have maximum ${resourceDef.name}s (${resourceLimit.count})`,
    };
  }

  // Get cost (level 0 cost)
  const level0Def = resourceDef.levels[0];
  if (!level0Def) {
    return {
      success: false,
      message: `Resource ${resourceDef.name} has no level 0`,
    };
  }

  const cost = level0Def.cost;

  // Check if can afford
  if (town.coins < cost) {
    return {
      success: false,
      message: `Not enough coins (need ${cost}, have ${town.coins})`,
    };
  }

  // Deduct coins
  await updateTown(town.address, {
    coins: town.coins - cost,
  });

  // Create resource
  await db.insert(resources).values({
    townAddress: town.address,
    type: resourceType,
    level: 0,
    aquiredAt: currentTick,
    collectedAt: currentTick,
    rewardsBank: 0,
  });

  const newCount = existingResources.length + 1;
  return {
    success: true,
    message: `Bought ${resourceDef.name} for ${cost} coins`,
    channelMessage: `You bought a new ${resourceDef.name} (${newCount}/${resourceLimit.count})`,
  };
}

/**
 * Execute an upgrade resource action
 */
async function executeUpgradeResource(
  action: Action,
  town: Town,
  currentTick: number
): Promise<ActionResult> {
  const data = action.data as UpgradeResourceActionData;
  const { resourceId } = data;

  const [resource] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, resourceId));

  if (!resource) {
    return {
      success: false,
      message: `Resource not found: ${resourceId}`,
    };
  }

  if (resource.townAddress !== town.address) {
    return {
      success: false,
      message: `Resource does not belong to this town`,
    };
  }

  const resourceDef = RESOURCE_DEFINITIONS_TABLE[resource.type];
  if (!resourceDef) {
    return {
      success: false,
      message: `Unknown resource type: ${resource.type}`,
    };
  }

  const resourceLimit = RESOURCE_LIMITS_TABLE[town.level]?.[resource.type];
  if (!resourceLimit) {
    return {
      success: false,
      message: `Resource not available at this level`,
    };
  }

  // Check if already at max level for this town level
  if (resource.level >= resourceLimit.maxLevel) {
    return {
      success: false,
      message: `${resourceDef.name} already at max level (${resourceLimit.maxLevel}) for town level ${town.level}`,
    };
  }

  const nextLevel = resource.level + 1;
  const nextLevelDef = resourceDef.levels[nextLevel];
  if (!nextLevelDef) {
    return {
      success: false,
      message: `No definition for ${resourceDef.name} level ${nextLevel}`,
    };
  }

  const cost = nextLevelDef.cost;

  // Check if can afford
  if (town.coins < cost) {
    return {
      success: false,
      message: `Not enough coins (need ${cost}, have ${town.coins})`,
    };
  }

  // Deduct coins
  await updateTown(town.address, {
    coins: town.coins - cost,
  });

  // Upgrade resource
  await db
    .update(resources)
    .set({
      level: nextLevel,
    })
    .where(eq(resources.id, resourceId));

  return {
    success: true,
    message: `Upgraded ${resourceDef.name} to level ${nextLevel} for ${cost} coins`,
    channelMessage: `You upgraded a ${resourceDef.name} to level ${nextLevel}`,
  };
}

/**
 * Execute a collect action
 */
async function executeCollect(
  action: Action,
  town: Town,
  currentTick: number
): Promise<ActionResult> {
  const data = action.data as CollectActionData;
  const { resourceId } = data;

  try {
    const result = await collectResourceRewards(resourceId, currentTick);
    const { amount, rewardType } = result;

    if (amount === 0) {
      return {
        success: false,
        message: "No rewards to collect",
      };
    }

    // Apply rewards
    if (rewardType === "coins") {
      await addCoins(town.address, amount);
      return {
        success: true,
        message: `Collected ${amount} coins`,
        channelMessage: `You collected ${amount} coins`,
      };
    } else if (rewardType === "troops") {
      const townLevel = TOWN_LEVELS_TABLE[town.level];
      const maxTroops = townLevel?.maxTroops || 0;
      const beforeTroops = town.troops;
      await addTroops(town.address, amount);
      const actualAdded = Math.min(amount, maxTroops - beforeTroops);

      return {
        success: true,
        message: `Collected ${actualAdded} troops`,
        channelMessage: `You collected ${actualAdded} troops`,
      };
    }

    return {
      success: false,
      message: "Resource has no rewards",
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to collect: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Execute a boost purchase action
 */
async function executeBoost(
  action: Action,
  town: Town,
  currentTick: number
): Promise<ActionResult> {
  const townLevel = TOWN_LEVELS_TABLE[town.level];
  if (!townLevel) {
    return {
      success: false,
      message: `Invalid town level: ${town.level}`,
    };
  }

  const cost = townLevel.boostCost;

  // Check if can afford
  if (town.coins < cost) {
    return {
      success: false,
      message: `Not enough coins (need ${cost}, have ${town.coins})`,
    };
  }

  // Deduct coins
  await updateTown(town.address, {
    coins: town.coins - cost,
  });

  // Create boost
  await db.insert(boosts).values({
    townAddress: town.address,
    start: currentTick,
    end: currentTick + townLevel.boostDuration,
    cooldownEnd: currentTick + townLevel.boostDuration + townLevel.boostCooldown,
  });

  return {
    success: true,
    message: `Purchased boost for ${cost} coins`,
    feedMessage: `${town.name} purchased a boost`,
  };
}

/**
 * Execute a shield purchase action
 */
async function executeShield(
  action: Action,
  town: Town,
  currentTick: number
): Promise<ActionResult> {
  const townLevel = TOWN_LEVELS_TABLE[town.level];
  if (!townLevel) {
    return {
      success: false,
      message: `Invalid town level: ${town.level}`,
    };
  }

  const cost = townLevel.shieldCost;

  // Check if can afford
  if (town.coins < cost) {
    return {
      success: false,
      message: `Not enough coins (need ${cost}, have ${town.coins})`,
    };
  }

  // Deduct coins
  await updateTown(town.address, {
    coins: town.coins - cost,
  });

  // Create shield
  await db.insert(shields).values({
    townAddress: town.address,
    start: currentTick,
    end: currentTick + townLevel.shieldDuration,
    cooldownEnd: currentTick + townLevel.shieldDuration + townLevel.shieldCooldown,
  });

  return {
    success: true,
    message: `Purchased shield for ${cost} coins`,
    feedMessage: `${town.name} purchased a shield`,
  };
}

/**
 * Execute a level up request action
 */
async function executeLevelUpRequest(
  action: Action,
  town: Town,
  currentTick: number
): Promise<ActionResult> {
  // Increment requested level
  if (town.requestedLevel > town.level + 1) {
    return {
      success: false,
      message: `Already have a pending level up request`,
    };
  }

  await updateTown(town.address, {
    requestedLevel: town.level + 1,
  });

  return {
    success: true,
    message: `Requested level up to ${town.level + 1}`,
    feedMessage: `${town.name} requested town level upgrade`,
  };
}

/**
 * Execute a level up approval action
 */
async function executeLevelUpApproval(
  action: Action,
  town: Town,
  currentTick: number
): Promise<ActionResult> {
  if (town.requestedLevel <= town.level) {
    return {
      success: false,
      message: `No level up pending`,
    };
  }

  // Level up the town (adds treasury, coins, updates level)
  await levelUpTown(town.address, currentTick);

  // Create shield for the new level
  const newLevelData = TOWN_LEVELS_TABLE[town.requestedLevel];
  if (newLevelData) {
    await db.insert(shields).values({
      townAddress: town.address,
      start: currentTick,
      end: currentTick + newLevelData.shieldDuration,
      cooldownEnd:
        currentTick + newLevelData.shieldDuration + newLevelData.shieldCooldown,
    });
  }

  return {
    success: true,
    message: `Town upgraded to level ${town.requestedLevel}`,
    feedMessage: `${town.name} upgraded their town hall to level ${town.requestedLevel}`,
  };
}

/**
 * Execute a level up cancel action
 */
async function executeLevelUpCancel(
  action: Action,
  town: Town,
  currentTick: number
): Promise<ActionResult> {
  if (town.requestedLevel <= town.level) {
    return {
      success: false,
      message: `No level up pending`,
    };
  }

  // Cancel the request
  await updateTown(town.address, {
    requestedLevel: town.level,
  });

  return {
    success: true,
    message: `Cancelled level up request`,
  };
}

/**
 * Execute an action
 */
export async function executeAction(
  action: Action,
  town: Town,
  currentTick: number
): Promise<ActionResult> {
  switch (action.type) {
    case ActionType.BuyResource:
      return executeBuyResource(action, town, currentTick);
    case ActionType.UpgradeResource:
      return executeUpgradeResource(action, town, currentTick);
    case ActionType.Collect:
      return executeCollect(action, town, currentTick);
    case ActionType.Boost:
      return executeBoost(action, town, currentTick);
    case ActionType.Shield:
      return executeShield(action, town, currentTick);
    case ActionType.LevelUpRequest:
      return executeLevelUpRequest(action, town, currentTick);
    case ActionType.LevelUpApproval:
      return executeLevelUpApproval(action, town, currentTick);
    case ActionType.LevelUpCancel:
      return executeLevelUpCancel(action, town, currentTick);
    case ActionType.Battle:
      // Battle actions are handled separately
      return {
        success: false,
        message: "Battle actions are processed separately",
      };
    default:
      return {
        success: false,
        message: `Unknown action type: ${action.type}`,
      };
  }
}

/**
 * Execute all pending actions for a town at current tick
 * Returns results grouped by success/failure
 */
export async function executePendingActions(
  town: Town,
  pendingActions: Action[],
  currentTick: number
): Promise<{
  successful: Array<{ action: Action; result: ActionResult }>;
  failed: Array<{ action: Action; result: ActionResult }>;
}> {
  const successful: Array<{ action: Action; result: ActionResult }> = [];
  const failed: Array<{ action: Action; result: ActionResult }> = [];

  // Sort actions by type priority (as per spec)
  const sortedActions = [...pendingActions].sort((a, b) => {
    const priority: Record<number, number> = {
      [ActionType.LevelUpRequest]: 1,
      [ActionType.LevelUpCancel]: 2,
      [ActionType.LevelUpApproval]: 2,
      [ActionType.BuyResource]: 3,
      [ActionType.UpgradeResource]: 4,
      [ActionType.Collect]: 5,
      [ActionType.Boost]: 6,
      [ActionType.Shield]: 6,
      [ActionType.Battle]: 7, // Processed separately
    };
    return (priority[a.type] || 99) - (priority[b.type] || 99);
  });

  // Execute actions in order (excluding battles)
  for (const action of sortedActions) {
    if (action.type === ActionType.Battle) {
      continue; // Skip battles, handled separately
    }

    try {
      const result = await executeAction(action, town, currentTick);

      if (result.success) {
        successful.push({ action, result });
        await deleteAction(action.id);
      } else {
        failed.push({ action, result });
        // Log failed action to database
        await logTownError(town.address, result.message, currentTick);
        await deleteAction(action.id);
      }
    } catch (error) {
      // Catch any unexpected errors during execution
      const errorMessage = error instanceof Error ? error.message : "Unknown error during action execution";
      failed.push({
        action,
        result: {
          success: false,
          message: errorMessage,
        },
      });
      // Log unexpected errors
      await logTownError(town.address, `Action ${action.type} failed: ${errorMessage}`, currentTick);
      await deleteAction(action.id);
    }
  }

  return { successful, failed };
}
