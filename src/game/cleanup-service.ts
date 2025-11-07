import { and, eq, lte } from "drizzle-orm";
import { db, battles, shields, boosts } from "../db";

/**
 * Remove battles that have passed their cooldown period
 */
export async function cleanupExpiredBattles(currentTick: number): Promise<void> {
  await db
    .delete(battles)
    .where(lte(battles.cooldownEnd, currentTick));
}

/**
 * Remove shields that have passed their cooldown period
 */
export async function cleanupExpiredShields(currentTick: number): Promise<void> {
  await db
    .delete(shields)
    .where(lte(shields.cooldownEnd, currentTick));
}

/**
 * Remove boosts that have passed their cooldown period
 */
export async function cleanupExpiredBoosts(currentTick: number): Promise<void> {
  await db
    .delete(boosts)
    .where(lte(boosts.cooldownEnd, currentTick));
}

/**
 * Cleanup all expired entities for a specific town
 */
export async function cleanupExpiredForTown(
  townAddress: string,
  currentTick: number
): Promise<void> {
  // Delete expired battles
  await db
    .delete(battles)
    .where(
      and(
        eq(battles.defenderAddress, townAddress),
        lte(battles.cooldownEnd, currentTick)
      )
    );

  await db
    .delete(battles)
    .where(
      and(
        eq(battles.attackerAddress, townAddress),
        lte(battles.cooldownEnd, currentTick)
      )
    );

  // Delete expired shields
  await db
    .delete(shields)
    .where(
      and(
        eq(shields.townAddress, townAddress),
        lte(shields.cooldownEnd, currentTick)
      )
    );

  // Delete expired boosts
  await db
    .delete(boosts)
    .where(
      and(
        eq(boosts.townAddress, townAddress),
        lte(boosts.cooldownEnd, currentTick)
      )
    );
}

/**
 * Cleanup all expired entities globally
 */
export async function cleanupAllExpired(currentTick: number): Promise<void> {
  await Promise.all([
    cleanupExpiredBattles(currentTick),
    cleanupExpiredShields(currentTick),
    cleanupExpiredBoosts(currentTick),
  ]);
}
