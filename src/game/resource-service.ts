import { eq } from "drizzle-orm";
import { db, resources, type Resource } from "../db";
import {
  RESOURCE_DEFINITIONS_TABLE,
  REWARDS_COOLDOWN_TICKS,
} from "./static-data";

/**
 * Update rewards for a single resource
 * Adds rewardsPerTick to rewardsBank if cooldown has passed
 */
export async function updateResourceRewards(
  resource: Resource,
  currentTick: number
): Promise<void> {
  // Check if cooldown has passed
  if (currentTick <= resource.collectedAt + REWARDS_COOLDOWN_TICKS) {
    return; // Still in cooldown
  }

  const resourceDef = RESOURCE_DEFINITIONS_TABLE[resource.type];
  if (!resourceDef) {
    console.error(`Unknown resource type: ${resource.type}`);
    return;
  }

  const levelDef = resourceDef.levels[resource.level];
  if (!levelDef) {
    console.error(
      `Unknown level ${resource.level} for resource type ${resource.type}`
    );
    return;
  }

  // Add rewards
  const rewardsToAdd = levelDef.rewardsPerTick;
  if (rewardsToAdd > 0) {
    await db
      .update(resources)
      .set({
        rewardsBank: resource.rewardsBank + rewardsToAdd,
      })
      .where(eq(resources.id, resource.id));
  }
}

/**
 * Update rewards for all resources of a town
 */
export async function updateTownResourceRewards(
  townResources: Resource[],
  currentTick: number
): Promise<void> {
  await Promise.all(
    townResources.map((resource) =>
      updateResourceRewards(resource, currentTick)
    )
  );
}

/**
 * Collect rewards from a resource
 */
export async function collectResourceRewards(
  resourceId: string,
  currentTick: number
): Promise<{ amount: number; rewardType: "coins" | "troops" | "none" }> {
  const [resource] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, resourceId));

  if (!resource) {
    throw new Error(`Resource not found: ${resourceId}`);
  }

  const resourceDef = RESOURCE_DEFINITIONS_TABLE[resource.type];
  if (!resourceDef) {
    throw new Error(`Unknown resource type: ${resource.type}`);
  }

  const amount = resource.rewardsBank;
  const rewardType = resourceDef.rewardType;

  // Clear rewards bank and update collected time
  await db
    .update(resources)
    .set({
      rewardsBank: 0,
      collectedAt: currentTick,
    })
    .where(eq(resources.id, resourceId));

  return { amount, rewardType };
}
