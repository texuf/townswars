import type { Town } from "../db";
import { TOWN_LEVELS_TABLE, formatDollars } from "./static-data";

/**
 * Render the main message for a town
 * This is the primary UI that players interact with
 */
export function renderMainMessage(town: Town, currentTick: number): string {
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

[Approve] [Cancel]`;
  }

  // Standard display
  const lines: string[] = [];

  lines.push(`🏰 **${town.name}** - Level ${town.level}`);
  lines.push("");
  lines.push(`💰 Treasury: ${formatDollars(town.treasury)}`);
  lines.push(`🪙 Coins: ${town.coins}`);
  lines.push(`⚔️ Troops: ${town.troops}/${townLevel?.maxTroops || 0}`);
  lines.push("");

  // TODO: Add resources, DPS, RPS, TPS calculations
  // TODO: Add status indicators (boost, shield, battle)
  // TODO: Add interaction buttons

  lines.push("_Use interaction buttons below to manage your town_");

  return lines.join("\n");
}

/**
 * Check if two message contents are different
 */
export function messagesAreDifferent(msg1: string, msg2: string): boolean {
  return msg1.trim() !== msg2.trim();
}
