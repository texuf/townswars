/**
 * Static Data Validation Tests
 * These tests validate the game balance and progression rules
 * Per spec: OFFICIAL_TOWNS_WARS.spec.md:724-808
 */

import { describe, it, expect } from "bun:test";
import {
  RESOURCE_DEFINITIONS_TABLE,
  RESOURCE_LIMITS_TABLE,
  TOWN_LEVELS_TABLE,
} from "../game/static-data";

describe("Static Data Validation", () => {
  describe("RESOURCE_DEFINITIONS_TABLE", () => {
    it("should have linear level progression", () => {
      for (const [type, def] of Object.entries(RESOURCE_DEFINITIONS_TABLE)) {
        const levels = Object.keys(def.levels)
          .map(Number)
          .sort((a, b) => a - b);

        // Check linearity (if level N exists, level N-1 must exist)
        for (let i = 0; i < levels.length; i++) {
          expect(levels[i]).toBe(i);
        }
      }
    });

    it("should have incrementing or zero properties for each level", () => {
      for (const [type, def] of Object.entries(RESOURCE_DEFINITIONS_TABLE)) {
        const levels = Object.keys(def.levels)
          .map(Number)
          .sort((a, b) => a - b);

        // Check incremental properties (starting from level 1)
        for (let i = 1; i < levels.length; i++) {
          const prev = def.levels[i - 1];
          const curr = def.levels[i];

          // Properties must either be 0 or increment
          expect(curr.cost).toBeGreaterThanOrEqual(prev.cost);
          expect(curr.damagePerTick).toBeGreaterThanOrEqual(prev.damagePerTick);
          expect(curr.rewardsPerTick).toBeGreaterThanOrEqual(
            prev.rewardsPerTick
          );
          expect(curr.hp).toBeGreaterThanOrEqual(prev.hp);
        }
      }
    });

    it("should have valid resource types", () => {
      const resourceTypes = Object.keys(RESOURCE_DEFINITIONS_TABLE).map(Number);

      // All resource types should be positive integers
      for (const type of resourceTypes) {
        expect(type).toBeGreaterThan(0);
      }
    });

    it("should have required properties for each resource", () => {
      for (const [type, def] of Object.entries(RESOURCE_DEFINITIONS_TABLE)) {
        expect(def.name).toBeTruthy();
        expect(def.description).toBeTruthy();
        expect(["none", "troops", "coins"]).toContain(def.rewardType);
        expect(def.levels).toBeTruthy();
        expect(Object.keys(def.levels).length).toBeGreaterThan(0);
      }
    });

    it("should have level 0 for all resources", () => {
      for (const [type, def] of Object.entries(RESOURCE_DEFINITIONS_TABLE)) {
        expect(def.levels[0]).toBeDefined();
      }
    });
  });

  describe("RESOURCE_LIMITS_TABLE", () => {
    it("should have progressive resource limits", () => {
      const townLevels = Object.keys(RESOURCE_LIMITS_TABLE)
        .map(Number)
        .sort((a, b) => a - b);

      // Check that each town level has equal or greater limits than previous
      for (let i = 1; i < townLevels.length; i++) {
        const prevLevel = RESOURCE_LIMITS_TABLE[townLevels[i - 1]];
        const currLevel = RESOURCE_LIMITS_TABLE[townLevels[i]];

        // For each resource type in previous level
        for (const [type, prevLimit] of Object.entries(prevLevel)) {
          expect(currLevel[type]).toBeDefined();
          expect(currLevel[type].count).toBeGreaterThanOrEqual(
            prevLimit.count
          );
          expect(currLevel[type].maxLevel).toBeGreaterThanOrEqual(
            prevLimit.maxLevel
          );
        }
      }
    });

    it("should have valid count and maxLevel values", () => {
      for (const [townLevel, limits] of Object.entries(RESOURCE_LIMITS_TABLE)) {
        for (const [resourceType, limit] of Object.entries(limits)) {
          expect(limit.count).toBeGreaterThan(0);
          expect(limit.maxLevel).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("should reference valid resource types", () => {
      const validResourceTypes = Object.keys(RESOURCE_DEFINITIONS_TABLE).map(
        Number
      );

      for (const [townLevel, limits] of Object.entries(RESOURCE_LIMITS_TABLE)) {
        for (const resourceType of Object.keys(limits).map(Number)) {
          expect(validResourceTypes).toContain(resourceType);
        }
      }
    });
  });

  describe("RESOURCE_LIMITS_TABLE maxLevel constraints", () => {
    it("should not exceed defined resource levels", () => {
      for (const [townLevel, limits] of Object.entries(RESOURCE_LIMITS_TABLE)) {
        for (const [resourceType, limit] of Object.entries(limits)) {
          const resourceDef = RESOURCE_DEFINITIONS_TABLE[Number(resourceType)];
          expect(resourceDef).toBeDefined();

          const maxDefinedLevel = Math.max(
            ...Object.keys(resourceDef.levels).map(Number)
          );

          expect(limit.maxLevel).toBeLessThanOrEqual(maxDefinedLevel);
        }
      }
    });
  });

  describe("TOWN_LEVELS_TABLE", () => {
    it("should have level 0 and level 1", () => {
      expect(TOWN_LEVELS_TABLE[0]).toBeDefined();
      expect(TOWN_LEVELS_TABLE[1]).toBeDefined();
    });

    it("should have progressive values for higher levels", () => {
      const townLevels = Object.keys(TOWN_LEVELS_TABLE)
        .map(Number)
        .sort((a, b) => a - b);

      // Skip level 0 as it's initialized but not used
      for (let i = 2; i < townLevels.length; i++) {
        const prev = TOWN_LEVELS_TABLE[townLevels[i - 1]];
        const curr = TOWN_LEVELS_TABLE[townLevels[i]];

        // Treasury balance should increase
        expect(curr.approvedTreasuryBalance).toBeGreaterThanOrEqual(
          prev.approvedTreasuryBalance
        );

        // Coin allocation should increase or stay the same
        expect(curr.coinAllocation).toBeGreaterThanOrEqual(prev.coinAllocation);

        // Max troops should increase or stay the same
        expect(curr.maxTroops).toBeGreaterThanOrEqual(prev.maxTroops);

        // HP should increase or stay the same
        expect(curr.hp).toBeGreaterThanOrEqual(prev.hp);
      }
    });

    it("should have positive costs for level 1+", () => {
      const townLevels = Object.keys(TOWN_LEVELS_TABLE)
        .map(Number)
        .sort((a, b) => a - b);

      // Skip level 0
      for (let i = 1; i < townLevels.length; i++) {
        const level = TOWN_LEVELS_TABLE[townLevels[i]];

        expect(level.boostCost).toBeGreaterThan(0);
        expect(level.shieldCost).toBeGreaterThan(0);
        expect(level.attackCost).toBeGreaterThan(0);
      }
    });

    it("should have reasonable multipliers and durations", () => {
      const townLevels = Object.keys(TOWN_LEVELS_TABLE)
        .map(Number)
        .sort((a, b) => a - b);

      // Skip level 0
      for (let i = 1; i < townLevels.length; i++) {
        const level = TOWN_LEVELS_TABLE[townLevels[i]];

        // Boost multiplier should be reasonable (1-10x)
        expect(level.boostMultiplier).toBeGreaterThanOrEqual(1);
        expect(level.boostMultiplier).toBeLessThanOrEqual(10);

        // Durations should be positive
        expect(level.boostDuration).toBeGreaterThan(0);
        expect(level.shieldDuration).toBeGreaterThan(0);
        expect(level.attackDuration).toBeGreaterThan(0);

        // Cooldowns should be positive
        expect(level.boostCooldown).toBeGreaterThanOrEqual(0);
        expect(level.shieldCooldown).toBeGreaterThanOrEqual(0);
        expect(level.cooldownTimeMin).toBeGreaterThanOrEqual(0);
        expect(level.cooldownTimeMax).toBeGreaterThanOrEqual(
          level.cooldownTimeMin
        );

        // Troop stats should be positive
        expect(level.troopHp).toBeGreaterThan(0);
        expect(level.troopDps).toBeGreaterThan(0);
      }
    });
  });

  describe("Resource Type Consistency", () => {
    it("should have cannon (type 1) with no rewards", () => {
      const cannon = RESOURCE_DEFINITIONS_TABLE[1];
      expect(cannon).toBeDefined();
      expect(cannon.name).toBe("cannon");
      expect(cannon.rewardType).toBe("none");

      // All levels should have 0 rewards
      for (const level of Object.values(cannon.levels)) {
        expect(level.rewardsPerTick).toBe(0);
        expect(level.maxRewards).toBe(0);
      }
    });

    it("should have barracks (type 2) with troop rewards", () => {
      const barracks = RESOURCE_DEFINITIONS_TABLE[2];
      expect(barracks).toBeDefined();
      expect(barracks.name).toBe("barracks");
      expect(barracks.rewardType).toBe("troops");

      // All levels should have troop rewards
      for (const level of Object.values(barracks.levels)) {
        expect(level.rewardsPerTick).toBeGreaterThan(0);
        expect(level.damagePerTick).toBe(0); // Barracks don't do damage
      }
    });

    it("should have mine (type 3) with coin rewards", () => {
      const mine = RESOURCE_DEFINITIONS_TABLE[3];
      expect(mine).toBeDefined();
      expect(mine.name).toBe("mine");
      expect(mine.rewardType).toBe("coins");

      // All levels should have coin rewards
      for (const level of Object.values(mine.levels)) {
        expect(level.rewardsPerTick).toBeGreaterThan(0);
        expect(level.damagePerTick).toBe(0); // Mines don't do damage
      }
    });
  });

  describe("Game Balance", () => {
    it("should have reasonable resource costs", () => {
      for (const [type, def] of Object.entries(RESOURCE_DEFINITIONS_TABLE)) {
        for (const [level, stats] of Object.entries(def.levels)) {
          // Costs should be within reasonable range (0-1000 coins)
          expect(stats.cost).toBeGreaterThanOrEqual(0);
          expect(stats.cost).toBeLessThanOrEqual(1000);
        }
      }
    });

    it("should have reasonable HP values", () => {
      for (const [type, def] of Object.entries(RESOURCE_DEFINITIONS_TABLE)) {
        for (const [level, stats] of Object.entries(def.levels)) {
          // HP should be within reasonable range (0-1000)
          expect(stats.hp).toBeGreaterThanOrEqual(0);
          expect(stats.hp).toBeLessThanOrEqual(1000);
        }
      }
    });

    it("should have reasonable DPS values", () => {
      for (const [type, def] of Object.entries(RESOURCE_DEFINITIONS_TABLE)) {
        for (const [level, stats] of Object.entries(def.levels)) {
          // DPS should be within reasonable range (0-100)
          expect(stats.damagePerTick).toBeGreaterThanOrEqual(0);
          expect(stats.damagePerTick).toBeLessThanOrEqual(100);
        }
      }
    });

    it("should have reasonable reward rates", () => {
      for (const [type, def] of Object.entries(RESOURCE_DEFINITIONS_TABLE)) {
        for (const [level, stats] of Object.entries(def.levels)) {
          // Rewards per tick should be within reasonable range (0-100)
          expect(stats.rewardsPerTick).toBeGreaterThanOrEqual(0);
          expect(stats.rewardsPerTick).toBeLessThanOrEqual(100);
        }
      }
    });
  });
});
