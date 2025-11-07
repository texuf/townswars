import type { Town, Resource, Battle } from "../db";
import type { TownState } from "./town-state-service";
import {
  TOWN_LEVELS_TABLE,
  RESOURCE_DEFINITIONS_TABLE,
  RESOURCE_LIMITS_TABLE,
  formatDollars,
} from "./static-data";

// ============================================================================
// FANCY DISPLAY STATES (Priority-based dramatic events)
// ============================================================================

/**
 * Priority 1: Pending Battle - Attack queued for next tick
 */
async function renderPendingBattle(
  town: Town,
  targetAddress: string
): Promise<string> {
  const { getTown } = await import("./town-service");
  const enemy = await getTown(targetAddress);

  if (!enemy) {
    return `⚔️ Battle queued for next tick...`;
  }

  return `╔═══════════════════════════════════════════════╗
║        ⚔️  PREPARING FOR BATTLE  ⚔️           ║
╚═══════════════════════════════════════════════╝

**${town.name}** is preparing to attack **${enemy.name}**!

      🏰                    🏰
     /${town.name.slice(0, 3)}/                   /${enemy.name.slice(0, 3)}/
    ▓▓▓▓                   ▓▓▓▓

⚔️ **Your troops march to war...**

🎯 Target: ${enemy.name} (Level ${enemy.level})

⏱️ Battle begins next tick!`;
}

/**
 * Priority 2: Battle In Progress - Attacker View
 */
async function renderBattleInProgressAttacker(
  town: Town,
  battle: Battle,
  currentTick: number
): Promise<string> {
  const { getTown } = await import("./town-service");
  const enemy = await getTown(battle.defenderAddress);
  const ticksRemaining = battle.end - currentTick;
  const secondsRemaining = ticksRemaining * 10;

  if (!enemy) {
    return `⚔️ Battle in progress...`;
  }

  return `╔═══════════════════════════════════════════════╗
║        ⚔️  ATTACKING ${enemy.name
    .toUpperCase()
    .slice(0, 15)
    .padEnd(15)}  ⚔️        ║
╚═══════════════════════════════════════════════╝

     🏹🏹🏹              🏰
    /|\\  /|\\           ▓▓▓▓
   / | \\/ | \\          ████
     YOUR TROOPS      THEIR WALLS

💰 **Potential Gain:** ${formatDollars(battle.reward)}
⚠️ **At Risk:** ${formatDollars(battle.penalty)}

⏱️ Battle ends in **${ticksRemaining} ticks** (${secondsRemaining}s)

🎲 Your fate is being decided...`;
}

/**
 * Priority 3: Battle In Progress - Defender View
 */
async function renderBattleInProgressDefender(
  town: Town,
  battle: Battle,
  currentTick: number
): Promise<string> {
  const { getTown } = await import("./town-service");
  const enemy = await getTown(battle.attackerAddress);
  const ticksRemaining = battle.end - currentTick;
  const secondsRemaining = ticksRemaining * 10;

  if (!enemy) {
    return `🛡️ Under attack...`;
  }

  return `╔═══════════════════════════════════════════════╗
║           🛡️  UNDER ATTACK  🛡️               ║
╚═══════════════════════════════════════════════╝

   🏰              🏹🏹🏹
  ▓▓▓▓            /|\\  /|\\
  ████           / | \\/ | \\
YOUR WALLS      THEIR TROOPS

⚠️ **${enemy.name}** is attacking!

💰 **Potential Gain:** ${formatDollars(battle.penalty)}
⚠️ **At Risk:** ${formatDollars(battle.reward)}

⏱️ Battle ends in **${ticksRemaining} ticks** (${secondsRemaining}s)

🛡️ Your defenses are holding...`;
}

/**
 * Priority 4-7: Battle Summary
 */
async function renderBattleSummary(
  town: Town,
  battle: Battle,
  isAttacker: boolean
): Promise<string> {
  const { getTown } = await import("./town-service");
  const enemyAddress = isAttacker
    ? battle.defenderAddress
    : battle.attackerAddress;
  const enemy = await getTown(enemyAddress);
  const enemyName = enemy?.name || "Enemy";

  if (isAttacker && battle.success) {
    // Attacker won
    const actualReward = Math.floor((battle.reward * battle.percentage) / 100);

    return `╔═══════════════════════════════════════════════╗
║            🎉  VICTORY!  🎉                   ║
╚═══════════════════════════════════════════════╝

You demolished **${enemyName}**!

      🏹                ☠️
     /|\\              ████
    / | \\            (ruins)

💰 **Gained:** ${formatDollars(actualReward)}
🎯 **Damage:** ${battle.percentage}% of defenses destroyed

⚔️ Your troops have returned victorious!

_Your forces have proven their strength._`;
  } else if (isAttacker && !battle.success) {
    // Attacker lost
    return `╔═══════════════════════════════════════════════╗
║             ☠️  DEFEAT  ☠️                    ║
╚═══════════════════════════════════════════════╝

You lost the attack on **${enemyName}**

      ☠️                 🏰
    (fallen)           ▓▓▓▓
                       ████

💸 **Lost:** ${formatDollars(battle.penalty)}

⚔️ Your troops were destroyed.

_Build up your forces and try again._`;
  } else if (!isAttacker && !battle.success) {
    // Defender won
    return `╔═══════════════════════════════════════════════╗
║          🛡️  DEFENDED!  🛡️                   ║
╚═══════════════════════════════════════════════╝

You beat back **${enemyName}**!

      🏰                ☠️
     ▓▓▓▓            (fallen)
     ████

💰 **Gained:** ${formatDollars(battle.penalty)}

🛡️ Your defenses held strong!

_Your enemies have been repelled._`;
  } else {
    // Defender lost
    const actualReward = Math.floor((battle.reward * battle.percentage) / 100);

    return `╔═══════════════════════════════════════════════╗
║           ⚠️  BREACHED  ⚠️                    ║
╚═══════════════════════════════════════════════╝

Your defenses were defeated by **${enemyName}**

      🏰                🏹
     ☠️☠️              /|\\
   (breached)         / | \\

💸 **Lost:** ${formatDollars(actualReward)}
🎯 **Damage:** ${battle.percentage}% of defenses destroyed

🛡️ You are now protected by battle cooldown.

_Rebuild and strengthen your defenses._`;
  }
}

/**
 * Priority 8: New Level Up
 */
function renderNewLevelUp(town: Town): string {
  return `╔═══════════════════════════════════════════════╗
║        🏰  TOWN UPGRADED!  🏰                 ║
╚═══════════════════════════════════════════════╝

**${town.name}** has reached **Level ${town.level}**!

      ⬆️
     🏰🏰
    ▓▓▓▓▓▓
   ████████

✨ **New buildings and upgrades unlocked!**
🛡️ **Shield activated!**
💰 **Treasury bonus received!**

_Your town grows in power and prestige._`;
}

// ============================================================================
// STANDARD DISPLAY (No dramatic events)
// ============================================================================

/**
 * Render the main message for a town with full UI
 */
export async function renderMainMessage(
  townState: TownState,
  currentTick: number,
  hasPendingLevelUpRequest: boolean
): Promise<MainMessageResult> {
  const {
    town,
    resources,
    shield,
    boost,
    battle,
    battleActive,
    battleSummary,
    battleCooldown,
    shieldActive,
    shieldCooldown,
    boostActive,
    boostCooldown,
  } = townState;
  const townLevel = TOWN_LEVELS_TABLE[town.level];

  // Check if town needs level approval
  if (town.requestedLevel > town.level) {
    const nextLevelData = TOWN_LEVELS_TABLE[town.requestedLevel];
    const approvalAmount = formatDollars(
      nextLevelData?.approvedTreasuryBalance || 0
    );

    const levelUpText =
      town.level > 0 ? ` - Level ${town.level} → ${town.requestedLevel}` : "";
    return {
      message: `**${town.name}**${levelUpText}

**Treasury Approval Required**

Approve the TownsWars to withdraw up to ${approvalAmount} from your treasury.`,
      isSpecialMessage: true,
    };
  }

  // Check for pending battle action
  const { getPendingActions } = await import("./action-service");
  const { ActionType } = await import("./static-data");
  const pendingActions = await getPendingActions(town.address, currentTick);
  const pendingBattle = pendingActions.find(
    (a) => a.type === ActionType.Battle
  );

  // Priority 1: Pending Battle
  if (pendingBattle) {
    const targetAddress = (pendingBattle.data as any).targetAddress;
    return {
      message: await renderPendingBattle(town, targetAddress),
      isSpecialMessage: true,
    };
  }

  // Priority 2-3: Battle In Progress
  if (battleActive && battle) {
    const isAttacker = battle.attackerAddress === town.address;
    if (isAttacker) {
      return {
        message: await renderBattleInProgressAttacker(town, battle, currentTick),
        isSpecialMessage: true,
      };
    } else {
      return {
        message: await renderBattleInProgressDefender(town, battle, currentTick),
        isSpecialMessage: true,
      };
    }
  }

  // Priority 4-7: Battle Summary
  if (battleSummary && battle) {
    const isAttacker = battle.attackerAddress === town.address;
    return {
      message: await renderBattleSummary(town, battle, isAttacker),
      isSpecialMessage: true,
    };
  }

  // Priority 8: New Level Up
  const newLevelUp = town.leveledUpAt === currentTick;
  if (newLevelUp) {
    return {
      message: renderNewLevelUp(town),
      isSpecialMessage: true,
    };
  }

  // Standard display (no dramatic events)

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
  if (boostActive)
    statuses.push(`🚀 Boost active (${townLevel?.boostMultiplier}x)`);
  if (shieldActive) statuses.push("🛡️ Shield active");
  if (battleCooldown) statuses.push("🛡️ Shield active (battle cooldown)");

  if (statuses.length > 0) {
    lines.push(`**Status:** ${statuses.join(" • ")}`);
    lines.push("");
  }

  return {
    message: lines.join("\n"),
    isSpecialMessage: false,
  };
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
  const multiplier = boostActive ? townLevel?.boostMultiplier || 1 : 1;

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
function groupResourcesByType(
  resources: Resource[]
): Record<number, Resource[]> {
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
 * Result of rendering main message
 */
export interface MainMessageResult {
  message: string;
  isSpecialMessage: boolean;
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

      let showedCollectButton = false;

      if (resource.rewardsBank > 0) {
        const rewardType =
          resourceDef.rewardType === "coins" ? "coins" : "troops";

        // Skip troop collection if at max troops
        const skipTroopCollection =
          rewardType === "troops" && town.troops >= (townLevel?.maxTroops || 0);

        if (!skipTroopCollection) {
          buttons.push({
            id: `collect:${resource.id}`,
            label: `Collect ${resource.rewardsBank} ${rewardType} from ${
              resourceDef.name
            } #${i + 1}`,
          });
          showedCollectButton = true;
        }
      }

      // Show upgrade button if not showing collect button and can upgrade
      if (!showedCollectButton && resource.level < resourceLimit.maxLevel) {
        canRequestLevelUp = false;
        const nextLevel = resource.level + 1;
        const cost = resourceDef.levels[nextLevel]?.cost || 0;
        if (town.coins >= cost) {
          buttons.push({
            id: `upgrade:${resource.id}`,
            label: `Upgrade ${resourceDef.name} #${
              i + 1
            } to lvl ${nextLevel} (${cost}c)`,
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
  if (town.coins >= attackCost && town.troops > 0 && !battleCooldown) {
    // Get battle suggestions
    const { getBattleSuggestions } = await import("./battle-service");
    const suggestions = await getBattleSuggestions(
      town.address,
      currentTick,
      3
    );

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
  currentTick: number,
  isSpecialMessage: boolean = false
): Promise<ActionButton[]> {
  const {
    town,
    resources,
    shieldActive,
    shieldCooldown,
    boostActive,
    boostCooldown,
    battleCooldown,
  } = townState;
  const townLevel = TOWN_LEVELS_TABLE[town.level];

  // If town needs level approval, only show approve/cancel buttons
  // This is a special message that DOES show buttons
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

  // If this is a special message (battle, level up celebration, etc.), don't show buttons
  if (isSpecialMessage) {
    return [];
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
