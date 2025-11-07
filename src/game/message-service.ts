import type { Town, Resource } from "../db";
import type { TownState } from "./town-state-service";
import {
  TOWN_LEVELS_TABLE,
  RESOURCE_DEFINITIONS_TABLE,
  RESOURCE_LIMITS_TABLE,
  formatDollars,
} from "./static-data";

/**
 * Render the main message for a town with full UI
 */
export async function renderMainMessage(
  townState: TownState,
  currentTick: number,
  hasPendingLevelUpRequest: boolean
): Promise<string> {
  const { town, resources, shield, boost, battle, battleActive, battleSummary, battleCooldown, shieldActive, shieldCooldown, boostActive, boostCooldown } = townState;
  const townLevel = TOWN_LEVELS_TABLE[town.level];

  // Check if town needs level approval
  if (town.requestedLevel > town.level) {
    const nextLevelData = TOWN_LEVELS_TABLE[town.requestedLevel];
    const approvalAmount = formatDollars(
      nextLevelData?.approvedTreasuryBalance || 0
    );

    return `🏰 **${town.name}** - Level ${town.level} → ${town.requestedLevel}

📋 **Treasury Approval Required**

To upgrade your town to level ${town.requestedLevel}, you need to approve the Towns Bot to withdraw up to ${approvalAmount} from your treasury.

This is a one-time approval for this level upgrade.

Use the buttons below to approve or cancel.`;
  }

  const lines: string[] = [];

  // Header
  lines.push(`🏰 **${town.name}** - Level ${town.level}`);
  lines.push("");

  // Basic Info
  lines.push(`💰 Treasury: ${formatDollars(town.treasury)}`);
  lines.push(`🪙 Coins: ${town.coins}`);
  lines.push(`⚔️ Troops: ${town.troops}/${townLevel?.maxTroops || 0}`);
  lines.push("");

  // Calculate DPS, RPS, TPS
  const dps = calculateDPS(resources);
  const rps = calculateRPS(resources, boostActive, townLevel);
  const tps = calculateTPS(resources, boostActive, townLevel);

  lines.push(`🛡️ Defense: ${dps} DPS`);
  if (rps.coins > 0 || rps.troops > 0) {
    const rpsText: string[] = [];
    if (rps.coins > 0) rpsText.push(`${rps.coins} coins/tick`);
    if (rps.troops > 0) rpsText.push(`${rps.troops} troops/tick`);
    lines.push(`📦 Production: ${rpsText.join(", ")}`);
  }
  lines.push("");

  // Resources
  lines.push("**Resources:**");
  const resourcesByType = groupResourcesByType(resources);
  const resourceTypes = Object.keys(RESOURCE_DEFINITIONS_TABLE).map(Number);

  for (const resourceType of resourceTypes) {
    const resourceDef = RESOURCE_DEFINITIONS_TABLE[resourceType];
    const resourceLimit = RESOURCE_LIMITS_TABLE[town.level]?.[resourceType];

    if (!resourceLimit) continue;

    const townResources = resourcesByType[resourceType] || [];
    const count = townResources.length;
    const maxCount = resourceLimit.count;

    lines.push(`  ${resourceDef.name}: ${count}/${maxCount}`);
  }
  lines.push("");

  // Status indicators
  const statuses: string[] = [];
  if (boostActive) statuses.push(`🚀 Boost active (${townLevel?.boostMultiplier}x)`);
  if (shieldActive) statuses.push("🛡️ Shield active");
  if (battleCooldown) statuses.push("🛡️ Shield active (battle cooldown)");

  if (statuses.length > 0) {
    lines.push(`**Status:** ${statuses.join(" • ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Calculate total DPS from resources
 */
function calculateDPS(resources: Resource[]): number {
  return resources.reduce((total, resource) => {
    const resourceDef = RESOURCE_DEFINITIONS_TABLE[resource.type];
    const levelDef = resourceDef?.levels[resource.level];
    return total + (levelDef?.damagePerTick || 0);
  }, 0);
}

/**
 * Calculate resource production per tick (RPS)
 */
function calculateRPS(
  resources: Resource[],
  boostActive: boolean,
  townLevel: any
): { coins: number; troops: number } {
  const multiplier = boostActive ? (townLevel?.boostMultiplier || 1) : 1;

  let coins = 0;
  let troops = 0;

  for (const resource of resources) {
    const resourceDef = RESOURCE_DEFINITIONS_TABLE[resource.type];
    const levelDef = resourceDef?.levels[resource.level];
    const rewards = (levelDef?.rewardsPerTick || 0) * multiplier;

    if (resourceDef?.rewardType === "coins") {
      coins += rewards;
    } else if (resourceDef?.rewardType === "troops") {
      troops += rewards;
    }
  }

  return { coins, troops };
}

/**
 * Calculate troop production per tick (TPS)
 */
function calculateTPS(
  resources: Resource[],
  boostActive: boolean,
  townLevel: any
): number {
  return calculateRPS(resources, boostActive, townLevel).troops;
}

/**
 * Group resources by type
 */
function groupResourcesByType(resources: Resource[]): Record<number, Resource[]> {
  return resources.reduce((groups, resource) => {
    if (!groups[resource.type]) {
      groups[resource.type] = [];
    }
    groups[resource.type].push(resource);
    return groups;
  }, {} as Record<number, Resource[]>);
}

export interface ActionButton {
  id: string;
  label: string;
}

/**
 * Calculate available action buttons for interaction request
 */
async function calculateAvailableButtons(
  town: Town,
  resources: Resource[],
  townLevel: any,
  shieldActive: boolean,
  shieldCooldown: boolean,
  boostActive: boolean,
  boostCooldown: boolean,
  battleCooldown: boolean,
  hasPendingLevelUpRequest: boolean,
  currentTick: number
): Promise<ActionButton[]> {
  const buttons: ActionButton[] = [];
  let canRequestLevelUp = !hasPendingLevelUpRequest;

  const resourcesByType = groupResourcesByType(resources);
  const resourceTypes = Object.keys(RESOURCE_DEFINITIONS_TABLE).map(Number);

  // Resource buttons
  for (const resourceType of resourceTypes) {
    const resourceDef = RESOURCE_DEFINITIONS_TABLE[resourceType];
    const resourceLimit = RESOURCE_LIMITS_TABLE[town.level]?.[resourceType];

    if (!resourceLimit) continue;

    const townResources = resourcesByType[resourceType] || [];

    // Buy button if not at limit
    if (townResources.length < resourceLimit.count) {
      canRequestLevelUp = false;
      const cost = resourceDef.levels[0]?.cost || 0;
      if (town.coins >= cost) {
        buttons.push({
          id: `buy:${resourceType}`,
          label: `Buy ${resourceDef.name} (${cost}c)`,
        });
      }
    }

    // Collect or upgrade buttons for existing resources
    for (let i = 0; i < townResources.length; i++) {
      const resource = townResources[i];

      if (resource.rewardsBank > 0) {
        const rewardType = resourceDef.rewardType === "coins" ? "coins" : "troops";
        buttons.push({
          id: `collect:${resource.id}`,
          label: `Collect ${resource.rewardsBank} ${rewardType} from ${resourceDef.name} #${i + 1}`,
        });
      } else if (resource.level < resourceLimit.maxLevel) {
        canRequestLevelUp = false;
        const nextLevel = resource.level + 1;
        const cost = resourceDef.levels[nextLevel]?.cost || 0;
        if (town.coins >= cost) {
          buttons.push({
            id: `upgrade:${resource.id}`,
            label: `Upgrade ${resourceDef.name} #${i + 1} to lvl ${nextLevel} (${cost}c)`,
          });
        }
      }
    }
  }

  // Shield button
  if (!shieldActive && !shieldCooldown && !battleCooldown) {
    const shieldCost = townLevel?.shieldCost || 0;
    if (town.coins >= shieldCost) {
      buttons.push({
        id: "buy:shield",
        label: `Buy Shield (${shieldCost}c)`,
      });
    }
  }

  // Boost button
  if (!boostActive && !boostCooldown) {
    const boostCost = townLevel?.boostCost || 0;
    if (town.coins >= boostCost) {
      buttons.push({
        id: "buy:boost",
        label: `Buy Boost (${boostCost}c)`,
      });
    }
  }

  // Attack buttons (if can afford and have troops)
  const attackCost = townLevel?.attackCost || 0;
  if (
    town.coins >= attackCost &&
    town.troops > 0 &&
    !battleCooldown
  ) {
    // Get battle suggestions
    const { getBattleSuggestions } = await import("./battle-service");
    const suggestions = await getBattleSuggestions(town.address, currentTick, 3);

    for (const suggestion of suggestions) {
      buttons.push({
        id: `attack:${suggestion.address}`,
        label: `Attack ${suggestion.name} (lvl ${suggestion.level})`,
      });
    }
  }

  // Town upgrade button
  if (canRequestLevelUp) {
    buttons.push({
      id: "levelup:request",
      label: `Upgrade Town to Level ${town.level + 1}`,
    });
  }

  return buttons;
}

/**
 * Get action buttons for rendering
 */
export async function getActionButtons(
  townState: TownState,
  hasPendingLevelUpRequest: boolean,
  currentTick: number
): Promise<ActionButton[]> {
  const { town, resources, shieldActive, shieldCooldown, boostActive, boostCooldown, battleCooldown } = townState;
  const townLevel = TOWN_LEVELS_TABLE[town.level];

  // If town needs level approval, only show approve/cancel buttons
  if (town.requestedLevel > town.level) {
    return [
      {
        id: "levelup:approve",
        label: "Approve Upgrade",
      },
      {
        id: "levelup:cancel",
        label: "Cancel Request",
      },
    ];
  }

  return calculateAvailableButtons(
    town,
    resources,
    townLevel,
    shieldActive,
    shieldCooldown,
    boostActive,
    boostCooldown,
    battleCooldown,
    hasPendingLevelUpRequest,
    currentTick
  );
}

/**
 * Check if two message contents are different
 */
export function messagesAreDifferent(msg1: string, msg2: string): boolean {
  return msg1.trim() !== msg2.trim();
}
