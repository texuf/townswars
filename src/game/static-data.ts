/**
 * Static game data tables
 * These define the balance and progression of the game
 */

// ============================================================================
// TOWN LEVELS
// ============================================================================

export interface TownLevel {
  approvedTreasuryBalance: number; // cents, displayed as dollars (2 decimals)
  coinAllocation: number; // coins given on level upgrade
  boostCost: number;
  boostMultiplier: number;
  boostDuration: number; // ticks
  boostCooldown: number; // ticks
  shieldCost: number;
  shieldDuration: number; // ticks
  shieldCooldown: number; // ticks
  cooldownTimeMin: number; // ticks
  cooldownTimeMax: number; // ticks
  hp: number;
  attackCost: number; // cost to attack someone else
  attackDuration: number; // ticks spent attacking
  troopHp: number;
  troopDps: number;
  maxTroops: number;
}

export const TOWN_LEVELS_TABLE: Record<number, TownLevel> = {
  0: {
    approvedTreasuryBalance: 0,
    coinAllocation: 0,
    boostCost: 0,
    boostMultiplier: 1,
    boostDuration: 0,
    boostCooldown: 0,
    shieldCost: 0,
    shieldDuration: 0,
    shieldCooldown: 0,
    cooldownTimeMin: 0,
    cooldownTimeMax: 0,
    hp: 0,
    attackCost: 0,
    attackDuration: 0,
    troopHp: 0,
    troopDps: 0,
    maxTroops: 0,
  },
  1: {
    approvedTreasuryBalance: 1000, // $10.00
    coinAllocation: 300,
    boostCost: 100,
    boostMultiplier: 2,
    boostDuration: 3, // 30 seconds (30 ticks * 10s)
    boostCooldown: 5, // 5 seconds (5 ticks * 1s)
    shieldCost: 100,
    shieldDuration: 3, // 30 seconds (3 ticks * 10s)
    shieldCooldown: 6, // 6 seconds (6 ticks * 1s)
    cooldownTimeMin: 3, // 3 seconds
    cooldownTimeMax: 6, // 6 seconds
    hp: 100,
    attackCost: 50,
    attackDuration: 1, // 1 second (1 tick * 1s)
    troopHp: 10,
    troopDps: 5,
    maxTroops: 50,
  },
  2: {
    approvedTreasuryBalance: 2500, // $25.00
    coinAllocation: 350,
    boostCost: 200,
    boostMultiplier: 2,
    boostDuration: 4, // 4 seconds
    boostCooldown: 5,
    shieldCost: 200,
    shieldDuration: 4,
    shieldCooldown: 7,
    cooldownTimeMin: 4,
    cooldownTimeMax: 8,
    hp: 150,
    attackCost: 75,
    attackDuration: 2, // 2 seconds (2 ticks * 1s)
    troopHp: 15,
    troopDps: 8,
    maxTroops: 75,
  },
  3: {
    approvedTreasuryBalance: 5000, // $50.00
    coinAllocation: 500,
    boostCost: 300,
    boostMultiplier: 2,
    boostDuration: 5, // 5 seconds
    boostCooldown: 5,
    shieldCost: 300,
    shieldDuration: 5,
    shieldCooldown: 8,
    cooldownTimeMin: 5,
    cooldownTimeMax: 10,
    hp: 200,
    attackCost: 100,
    attackDuration: 3, // 3 seconds (3 ticks * 1s)
    troopHp: 20,
    troopDps: 10,
    maxTroops: 100,
  },
};

// ============================================================================
// RESOURCES
// ============================================================================

export interface ResourceLevel {
  cost: number; // cost of upgrade
  damagePerTick: number; // damage dealt per tick in battle
  rewardsPerTick: number; // rewards per tick
  maxRewards: number; // max rewards
  hp: number;
}

export interface ResourceDefinition {
  name: string;
  description: string;
  rewardType: "none" | "troops" | "coins";
  levels: Record<number, ResourceLevel>;
}

export const RESOURCE_DEFINITIONS_TABLE: Record<number, ResourceDefinition> = {
  // Cannon (type 1)
  1: {
    name: "cannon",
    description: "low dps weapon for defence",
    rewardType: "none",
    levels: {
      0: {
        cost: 20,
        damagePerTick: 10,
        rewardsPerTick: 0,
        maxRewards: 0,
        hp: 100,
      },
      1: {
        cost: 38,
        damagePerTick: 18,
        rewardsPerTick: 0,
        maxRewards: 0,
        hp: 140,
      },
      2: {
        cost: 60,
        damagePerTick: 28,
        rewardsPerTick: 0,
        maxRewards: 0,
        hp: 190,
      },
      3: {
        cost: 90,
        damagePerTick: 40,
        rewardsPerTick: 0,
        maxRewards: 0,
        hp: 250,
      },
    },
  },
  // Barracks (type 2)
  2: {
    name: "barracks",
    description: "generate troops",
    rewardType: "troops",
    levels: {
      0: {
        cost: 25,
        damagePerTick: 0,
        rewardsPerTick: 2,
        maxRewards: 0,
        hp: 120,
      },
      1: {
        cost: 48,
        damagePerTick: 0,
        rewardsPerTick: 4,
        maxRewards: 0,
        hp: 160,
      },
      2: {
        cost: 75,
        damagePerTick: 0,
        rewardsPerTick: 6,
        maxRewards: 0,
        hp: 210,
      },
      3: {
        cost: 110,
        damagePerTick: 0,
        rewardsPerTick: 9,
        maxRewards: 0,
        hp: 270,
      },
    },
  },
  // Mine (type 3)
  3: {
    name: "mine",
    description: "mine coins",
    rewardType: "coins",
    levels: {
      0: {
        cost: 25,
        damagePerTick: 0,
        rewardsPerTick: 5,
        maxRewards: 0,
        hp: 120,
      },
      1: {
        cost: 48,
        damagePerTick: 0,
        rewardsPerTick: 9,
        maxRewards: 0,
        hp: 160,
      },
      2: {
        cost: 75,
        damagePerTick: 0,
        rewardsPerTick: 14,
        maxRewards: 0,
        hp: 210,
      },
      3: {
        cost: 110,
        damagePerTick: 0,
        rewardsPerTick: 20,
        maxRewards: 0,
        hp: 270,
      },
    },
  },
};

// ============================================================================
// RESOURCE LIMITS
// ============================================================================

export interface ResourceLimit {
  count: number;
  maxLevel: number;
}

export const RESOURCE_LIMITS_TABLE: Record<
  number,
  Record<number, ResourceLimit>
> = {
  0: {
    1: { count: 2, maxLevel: 2 }, // cannon
    2: { count: 1, maxLevel: 2 }, // barracks
    3: { count: 1, maxLevel: 2 }, // mine
  },
  1: {
    1: { count: 3, maxLevel: 3 }, // cannon
    2: { count: 2, maxLevel: 3 }, // barracks
    3: { count: 2, maxLevel: 3 }, // mine
  },
  2: {
    1: { count: 4, maxLevel: 3 }, // cannon
    2: { count: 3, maxLevel: 3 }, // barracks
    3: { count: 3, maxLevel: 3 }, // mine
  },
  3: {
    1: { count: 5, maxLevel: 3 }, // cannon
    2: { count: 4, maxLevel: 3 }, // barracks
    3: { count: 4, maxLevel: 3 }, // mine
  },
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const REWARDS_COOLDOWN_TICKS = 2;
export const ETH_TO_USD = 3318.35;

// ============================================================================
// ACTION TYPES
// ============================================================================

export enum ActionType {
  Battle = 0,
  UpgradeResource = 1,
  BuyResource = 2,
  Boost = 3,
  Shield = 4,
  LevelUpRequest = 5,
  LevelUpApproval = 6,
  LevelUpCancel = 7,
  Collect = 8,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert ETH amount to coins based on USD value
 */
export function tipToCoins(ethAmount: number): number {
  const usdAmount = ethAmount * ETH_TO_USD;

  if (usdAmount < 3.5) return 90;
  if (usdAmount < 7.5) return 490;
  return 990;
}

/**
 * Format cents as dollars with 2 decimal places
 */
export function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Get resource type name by ID
 */
export function getResourceName(resourceType: number): string {
  return RESOURCE_DEFINITIONS_TABLE[resourceType]?.name || "unknown";
}
