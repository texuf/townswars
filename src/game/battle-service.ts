import { eq, and, or } from "drizzle-orm";
import { db, battles, type Town, type Battle, type Resource } from "../db";
import {
  TOWN_LEVELS_TABLE,
  RESOURCE_DEFINITIONS_TABLE,
  type TownLevel,
} from "./static-data";
import { updateTown } from "./town-service";

/**
 * Result of battle calculation
 */
interface BattleResult {
  success: boolean;
  percentage: number; // 0-100, percentage of defender HP destroyed
  duration?: number; // ticks it took (if ended early)
}

/**
 * Calculate battle outcome between attacker and defender
 * Per spec: OFFICIAL_TOWNS_WARS.spec.md:368-407
 */
export function calculateBattle(
  attacker: Town,
  defender: Town,
  defenderResources: Resource[],
  attackerLevel: TownLevel
): BattleResult {
  // Calculate attacker stats
  let attackerHp = attacker.troops * attackerLevel.troopHp;
  const attackerDps = attacker.troops * attackerLevel.troopDps;

  // Calculate defender stats from resources
  let defenderHp = defenderResources.reduce((sum, r) => {
    const resourceDef = RESOURCE_DEFINITIONS_TABLE[r.type];
    const levelDef = resourceDef.levels[r.level];
    return sum + levelDef.hp;
  }, 0);

  const defenderInitialHp = defenderHp;

  const defenderDps = defenderResources.reduce((sum, r) => {
    const resourceDef = RESOURCE_DEFINITIONS_TABLE[r.type];
    const levelDef = resourceDef.levels[r.level];
    return sum + levelDef.damagePerTick;
  }, 0);

  // Simulate battle tick-by-tick
  for (let i = 0; i < attackerLevel.attackDuration; i++) {
    // Defender damages attacker
    attackerHp -= defenderDps;
    if (attackerHp <= 0) {
      // Attacker defeated
      return { success: false, percentage: 0 };
    }

    // Attacker damages defender
    defenderHp -= attackerDps;
    if (defenderHp <= 0) {
      // Defender defeated (full victory)
      return { success: true, percentage: 100, duration: i + 1 };
    }
  }

  // Battle duration expired - partial victory for attacker
  const pointsTaken = defenderInitialHp - defenderHp;
  const percentage = pointsTaken / defenderInitialHp;

  return {
    success: true,
    percentage: Math.round(100 * percentage),
    duration: attackerLevel.attackDuration,
  };
}

/**
 * Calculate battle reward and penalty
 * Reward: What attacker can gain (from defender treasury)
 * Penalty: What attacker risks (from attacker treasury)
 */
function calculateRewardAndPenalty(
  attacker: Town,
  defender: Town
): { reward: number; penalty: number } {
  // Reward is a percentage of defender's treasury
  // For MVP, let's use 50% of defender's treasury as potential reward
  const reward = Math.floor(defender.treasury * 0.5);

  // Penalty is what attacker loses if they fail
  // For MVP, let's use 25% of attacker's treasury as penalty
  const penalty = Math.floor(attacker.treasury * 0.25);

  return { reward, penalty };
}

/**
 * Generate random cooldown between min and max
 */
function generateCooldown(townLevel: TownLevel): number {
  const min = townLevel.cooldownTimeMin;
  const max = townLevel.cooldownTimeMax;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Create a new battle between attacker and defender
 * Calculates outcome immediately and stores in database
 */
export async function createBattle(
  attackerAddress: string,
  defenderAddress: string,
  attacker: Town,
  defender: Town,
  defenderResources: Resource[],
  currentTick: number
): Promise<Battle> {
  const attackerLevel = TOWN_LEVELS_TABLE[attacker.level];

  // Calculate battle outcome
  const battleResult = calculateBattle(
    attacker,
    defender,
    defenderResources,
    attackerLevel
  );

  // Calculate reward and penalty
  const { reward, penalty } = calculateRewardAndPenalty(attacker, defender);

  // Calculate battle timing
  const start = currentTick;
  const end = currentTick + attackerLevel.attackDuration;
  const cooldown = generateCooldown(attackerLevel);
  const cooldownEnd = end + cooldown;

  // Create battle record
  const [battle] = await db
    .insert(battles)
    .values({
      attackerAddress,
      defenderAddress,
      start,
      end,
      cooldownEnd,
      reward,
      penalty,
      success: battleResult.success,
      percentage: battleResult.percentage,
    })
    .returning();

  return battle;
}

/**
 * Get battle by ID
 */
export async function getBattle(battleId: string): Promise<Battle | null> {
  const [battle] = await db
    .select()
    .from(battles)
    .where(eq(battles.id, battleId));

  return battle || null;
}

/**
 * Get active battle for a town (either as attacker or defender)
 */
export async function getTownActiveBattle(
  townAddress: string,
  currentTick: number
): Promise<Battle | null> {
  const [battle] = await db
    .select()
    .from(battles)
    .where(
      and(
        or(
          eq(battles.attackerAddress, townAddress),
          eq(battles.defenderAddress, townAddress)
        ),
        // Battle is active if current tick < end tick
        // Using a simple approach: get the most recent battle and check if it's active
      )
    )
    .orderBy(battles.start)
    .limit(1);

  if (!battle) return null;

  // Check if battle is still active
  if (currentTick < battle.end) {
    return battle;
  }

  return null;
}

/**
 * Get battle ending at specific tick
 */
export async function getBattleEndingAtTick(
  townAddress: string,
  tick: number
): Promise<Battle | null> {
  const [battle] = await db
    .select()
    .from(battles)
    .where(
      and(
        or(
          eq(battles.attackerAddress, townAddress),
          eq(battles.defenderAddress, townAddress)
        ),
        eq(battles.end, tick)
      )
    )
    .limit(1);

  return battle || null;
}

/**
 * Check if town is in battle cooldown
 */
export async function isInBattleCooldown(
  townAddress: string,
  currentTick: number
): Promise<boolean> {
  const [battle] = await db
    .select()
    .from(battles)
    .where(
      and(
        or(
          eq(battles.attackerAddress, townAddress),
          eq(battles.defenderAddress, townAddress)
        )
      )
    )
    .orderBy(battles.start)
    .limit(1);

  if (!battle) return false;

  // Check if in cooldown period
  return currentTick >= battle.end && currentTick < battle.cooldownEnd;
}

/**
 * Resolve battle - transfer treasury between towns
 * Called when battle.end === currentTick
 */
export async function resolveBattle(
  battle: Battle,
  attacker: Town,
  defender: Town
): Promise<void> {
  if (!battle.success) {
    // Attacker failed - penalty transferred from attacker to defender
    const attackerNewTreasury = Math.max(0, attacker.treasury - battle.penalty);
    const defenderNewTreasury = defender.treasury + battle.penalty;

    await updateTown(attacker.address, {
      treasury: attackerNewTreasury,
    });

    await updateTown(defender.address, {
      treasury: defenderNewTreasury,
    });
  } else {
    // Attacker succeeded - reward transferred from defender to attacker
    // Award is percentage-based
    const actualReward = Math.floor((battle.reward * battle.percentage) / 100);
    const defenderNewTreasury = Math.max(0, defender.treasury - actualReward);
    const attackerNewTreasury = attacker.treasury + actualReward;

    await updateTown(attacker.address, {
      treasury: attackerNewTreasury,
    });

    await updateTown(defender.address, {
      treasury: defenderNewTreasury,
    });
  }

  // Note: Attacker troops are reset to 0 when battle is initiated
  // This is handled in the tick system, not here
}

/**
 * Get all battles (for cleanup or listing)
 */
export async function getAllBattles(): Promise<Battle[]> {
  return db.select().from(battles);
}

/**
 * Delete battle by ID (used during cleanup)
 */
export async function deleteBattle(battleId: string): Promise<void> {
  await db.delete(battles).where(eq(battles.id, battleId));
}
