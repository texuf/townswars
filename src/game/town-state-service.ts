import { and, eq, gt, or } from "drizzle-orm";
import {
  db,
  type Town,
  battles,
  shields,
  boosts,
  resources,
  type Battle,
  type Shield,
  type Boost,
  type Resource,
} from "../db";

/**
 * Get the current active or cooldown battle for a town (as defender or attacker)
 */
export async function getCurrentBattle(
  townAddress: string,
  currentTick: number
): Promise<Battle | undefined> {
  const [battle] = await db
    .select()
    .from(battles)
    .where(
      and(
        or(
          eq(battles.defenderAddress, townAddress),
          eq(battles.attackerAddress, townAddress)
        ),
        gt(battles.cooldownEnd, currentTick)
      )
    )
    .limit(1);

  return battle;
}

/**
 * Get the current active or cooldown shield for a town
 */
export async function getCurrentShield(
  townAddress: string,
  currentTick: number
): Promise<Shield | undefined> {
  const [shield] = await db
    .select()
    .from(shields)
    .where(
      and(
        eq(shields.townAddress, townAddress),
        gt(shields.cooldownEnd, currentTick)
      )
    )
    .limit(1);

  return shield;
}

/**
 * Get the current active or cooldown boost for a town
 */
export async function getCurrentBoost(
  townAddress: string,
  currentTick: number
): Promise<Boost | undefined> {
  const [boost] = await db
    .select()
    .from(boosts)
    .where(
      and(
        eq(boosts.townAddress, townAddress),
        gt(boosts.cooldownEnd, currentTick)
      )
    )
    .limit(1);

  return boost;
}

/**
 * Get all resources for a town
 */
export async function getTownResources(
  townAddress: string
): Promise<Resource[]> {
  return db
    .select()
    .from(resources)
    .where(eq(resources.townAddress, townAddress));
}

/**
 * Check if a town can be attacked
 * Returns true if town has no shield, no active battle, and no cooldown
 */
export async function canBeAttacked(
  townAddress: string,
  currentTick: number
): Promise<boolean> {
  const shield = await getCurrentShield(townAddress, currentTick);
  const battle = await getCurrentBattle(townAddress, currentTick);

  // Check for active shield
  if (shield && shield.end > currentTick) {
    return false;
  }

  // Check for active battle
  if (battle && battle.end > currentTick) {
    return false;
  }

  // Check for battle cooldown
  if (battle && battle.cooldownEnd > currentTick) {
    return false;
  }

  return true;
}

/**
 * Check if a town can attack (has enough coins)
 */
export function canAttack(town: Town, attackCost: number): boolean {
  return town.coins >= attackCost;
}

/**
 * Enhanced town state with all related data
 */
export interface TownState {
  town: Town;
  resources: Resource[];
  battle?: Battle;
  shield?: Shield;
  boost?: Boost;
  battleActive: boolean;
  battleSummary: boolean;
  battleCooldown: boolean;
  shieldActive: boolean;
  shieldCooldown: boolean;
  boostActive: boolean;
  boostCooldown: boolean;
}

/**
 * Get complete town state with all related data
 */
export async function getTownState(
  town: Town,
  currentTick: number
): Promise<TownState> {
  const [townResources, battle, shield, boost] = await Promise.all([
    getTownResources(town.address),
    getCurrentBattle(town.address, currentTick),
    getCurrentShield(town.address, currentTick),
    getCurrentBoost(town.address, currentTick),
  ]);

  const battleInProgress = battle ? battle.end > currentTick : false;
  const battleSummary = battle ? battle.end === currentTick : false;
  const battleCooldown = battle
    ? !battleInProgress && !battleSummary && battle.cooldownEnd > currentTick
    : false;

  const shieldActive = shield ? shield.end > currentTick : false;
  const shieldCooldown = shield
    ? !shieldActive && shield.cooldownEnd > currentTick
    : false;

  const boostActive = boost ? boost.end > currentTick : false;
  const boostCooldown = boost
    ? !boostActive && boost.cooldownEnd > currentTick
    : false;

  return {
    town,
    resources: townResources,
    battle,
    shield,
    boost,
    battleActive: battleInProgress,
    battleSummary,
    battleCooldown,
    shieldActive,
    shieldCooldown,
    boostActive,
    boostCooldown,
  };
}
