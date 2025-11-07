import { eq } from "drizzle-orm";
import { db, towns, type NewTown, type Town } from "../db";
import { TOWN_LEVELS_TABLE } from "./static-data";
import { parseAppPrivateData, townsEnv } from "@towns-protocol/sdk";
import { LocalhostWeb3Provider, SpaceDapp } from "@towns-protocol/web3";

/**
 * Get a town by address
 */
export async function getTown(address: string): Promise<Town | undefined> {
  const [town] = await db
    .select()
    .from(towns)
    .where(eq(towns.address, address));
  return town;
}

/**
 * Get all towns
 */
export async function getAllTowns(): Promise<Town[]> {
  return db.select().from(towns);
}

/**
 * Get town name from space ID using spaceDapp instance
 * For MVP, we'll use a placeholder. In production, this would query the spaceDapp.
 */
async function getTownNameFromSpace(spaceId: string): Promise<string> {
  // make the config
  const appPrivateData = process.env.APP_PRIVATE_DATA!;
  const { env } = parseAppPrivateData(appPrivateData);
  const config = townsEnv().makeTownsConfig(env);

  // make a space dapp
  const spaceDapp = new SpaceDapp(
    config.base.chainConfig,
    new LocalhostWeb3Provider(config.base.rpcUrl)
  );

  try {
    const space = await spaceDapp.getSpaceInfo(spaceId);
    return space?.name || "Unknown";
  } catch (error) {
    console.error(`Error getting town name from space: ${error}`);
    return "Unknown";
  }
}

/**
 * Create a new town
 */
export async function createTown(
  address: string,
  channelId: string,
  spaceId: string,
  currentTick: number
): Promise<Town> {
  // Get town name from space
  const name = await getTownNameFromSpace(spaceId);

  // Get initial coin allocation from level 1 (towns start at level 0 but request level 1)
  const level1Data = TOWN_LEVELS_TABLE[1];
  const initialCoins = level1Data?.coinAllocation || 0;

  const newTown: NewTown = {
    address,
    channelId,
    name,
    level: 0, // Start at level 0
    requestedLevel: 1, // Request level 1
    leveledUpAt: currentTick,
    coins: initialCoins,
    troops: 0,
    treasury: 0,
  };

  const [town] = await db.insert(towns).values(newTown).returning();
  return town;
}

/**
 * Update a town
 */
export async function updateTown(
  address: string,
  updates: Partial<Omit<Town, "address" | "createdAt">>
): Promise<Town> {
  const [updated] = await db
    .update(towns)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(towns.address, address))
    .returning();

  return updated;
}

/**
 * Get or create a town
 * Returns existing town or creates a new one if it doesn't exist
 */
export async function getOrCreateTown(
  address: string,
  channelId: string,
  spaceId: string,
  currentTick: number
): Promise<{ town: Town; isNew: boolean }> {
  const existing = await getTown(address);

  if (existing) {
    return { town: existing, isNew: false };
  }

  const newTown = await createTown(address, channelId, spaceId, currentTick);
  return { town: newTown, isNew: true };
}

/**
 * Check if a user is already engaged (has a town)
 */
export async function isEngaged(address: string): Promise<boolean> {
  const town = await getTown(address);
  return !!town;
}

/**
 * Add coins to a town
 */
export async function addCoins(address: string, amount: number): Promise<Town> {
  const town = await getTown(address);
  if (!town) {
    throw new Error(`Town not found: ${address}`);
  }

  return updateTown(address, {
    coins: town.coins + amount,
  });
}

/**
 * Add troops to a town (respecting maxTroops)
 */
export async function addTroops(
  address: string,
  amount: number
): Promise<Town> {
  const town = await getTown(address);
  if (!town) {
    throw new Error(`Town not found: ${address}`);
  }

  const townLevel = TOWN_LEVELS_TABLE[town.level];
  const maxTroops = townLevel?.maxTroops || 0;
  const newTroops = Math.min(town.troops + amount, maxTroops);

  return updateTown(address, {
    troops: newTroops,
  });
}

/**
 * Level up a town
 */
export async function levelUpTown(
  address: string,
  currentTick: number
): Promise<Town> {
  const town = await getTown(address);
  if (!town) {
    throw new Error(`Town not found: ${address}`);
  }

  if (town.requestedLevel <= town.level) {
    throw new Error(`No level up pending for town: ${address}`);
  }

  const newLevel = town.requestedLevel;
  const levelData = TOWN_LEVELS_TABLE[newLevel];

  if (!levelData) {
    throw new Error(`Invalid level: ${newLevel}`);
  }

  return updateTown(address, {
    level: newLevel,
    leveledUpAt: currentTick,
    treasury: town.treasury + levelData.approvedTreasuryBalance,
    coins: town.coins + levelData.coinAllocation,
    requestedLevel: newLevel, // Keep requestedLevel same as level after upgrade
  });
}

/**
 * Delete a town and all associated data
 * This will cascade delete all related records (resources, actions, battles, etc.)
 * due to foreign key constraints
 */
export async function deleteTown(address: string): Promise<void> {
  await db.delete(towns).where(eq(towns.address, address));
}
