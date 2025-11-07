# Towns Wars - Comprehensive Completion Plan

**Generated**: 2025-11-06
**Status**: Active Development Plan

---

## Current Status Summary

### ✅ COMPLETED PHASES

**Phase 1: Core Infrastructure**
- [x] Database schema setup
- [x] Town creation and persistence
- [x] Basic bot framework integration
- [x] Tick system implementation

**Phase 2: Resource System**
- [x] Resource static data tables
- [x] Resource purchase logic (buy action)
- [x] Resource upgrade logic (upgrade action)
- [x] Resource collection mechanism (collect action)
- [x] Resource reward generation (rewards accumulation in tick)
- [x] Boost purchase and tracking
- [x] Shield purchase and tracking
- [x] Level up request/approval/cancel flow

### ❌ REMAINING WORK

**Phase 3: Combat System** (NOT STARTED)
- [ ] Battle calculation algorithm
- [ ] Battle initiation
- [ ] Battle resolution
- [ ] Battle cooldowns
- [ ] Battle suggestions
- [ ] Attack command/button

**Phase 4: UI/UX Enhancements** (PARTIAL)
- [ ] Button-based interactions (currently slash commands only)
- [ ] Fancy display states (dramatic battle/level-up displays)
- [ ] Feed message system (global broadcasts)
- [ ] User message deletion for engaged players
- [x] Basic main message rendering

**Phase 5: Progression System** (PARTIAL)
- [x] Level up flow (mock approval)
- [ ] Actual treasury integration (SpaceDapp API)
- [x] Shield and boost mechanics

**Phase 6: Polish** (NOT STARTED)
- [ ] SpaceDapp town name lookup (currently hardcoded "Pitter patter")
- [ ] Enhanced error handling and display
- [ ] Implementation tests (static data validation)
- [ ] Integration tests
- [ ] Performance optimization
- [ ] Balance testing

---

## TODOs Found in Codebase

1. **src/game/message-service.ts:253-254**
   - TODO: Attack buttons (Phase 3)
   - TODO: Battle suggestions

2. **src/game/town-service.ts:25**
   - TODO: Implement actual spaceDapp lookup

3. **src/tick.ts:73**
   - TODO: Send global feed messages (Phase 2 completion)

4. **src/tick.ts:80**
   - TODO: Process battle requests (Phase 3)

5. **src/tick.ts:82**
   - TODO: Update battle suggestions (Phase 3)

---

## Phase 3: Combat System (TOP PRIORITY)

### 3.1 Battle Calculation & Storage

**File**: `src/game/battle-service.ts` (NEW FILE)

**Tasks**:
1. **Implement `calculateBattle()` function** per spec (OFFICIAL_TOWNS_WARS.spec.md:368-407)
   ```typescript
   function calculateBattle(
     attacker: Town,
     defender: Town,
     attackerLevel: TownLevel
   ): BattleResult {
     // Calculate attacker HP and DPS
     let attackerHp = attacker.troops * attackerLevel.troopHp;
     const attackerDps = attacker.troops * attackerLevel.troopDps;

     // Calculate defender HP and DPS from resources
     let defenderHp = defender.resources.reduce(...);
     const defenderDps = defender.resources.reduce(...);

     // Simulate battle tick-by-tick
     for (let i = 0; i < attackerLevel.attackDuration; i++) {
       attackerHp -= defenderDps;
       if (attackerHp < 0) return { success: false };

       defenderHp -= attackerDps;
       if (defenderHp < 0) return { success: true, percentage: 100, duration: i };
     }

     // Calculate partial success
     const percentage = (defenderInitialHp - defenderHp) / defenderInitialHp;
     return { success: true, percentage: Math.round(100 * percentage), duration };
   }
   ```

2. **Create Battle database operations**
   - `createBattle(attackerAddress, defenderAddress, currentTick)` - Creates battle record
   - `getBattle(battleId)` - Retrieves battle
   - `getTownActiveBattle(townAddress)` - Gets active battle for town
   - `calculateBattleReward(defender: Town)` - Calculate reward/penalty from treasury
   - `resolveBattle(battleId)` - Apply treasury transfers

3. **Add battle calculation helpers**
   - Calculate reward: Based on defender's treasury
   - Calculate penalty: Based on attacker's treasury at risk
   - Random cooldown: Between cooldownTimeMin and cooldownTimeMax

**Database tables already exist**: `battles` table in schema

---

### 3.2 Battle Execution & Resolution

**File**: `src/tick.ts` (MODIFY)

**Task 3.2.1: Battle Initiation** (Line 80)
```typescript
// d. Process battle requests (Phase 3)
const battleActions = pendingActions.filter(a => a.type === ActionType.Battle);

for (const battleAction of battleActions) {
  const targetAddress = battleAction.data.townAddress;
  const targetTown = await getTown(targetAddress);
  const targetState = await getTownState(targetAddress, currentTick);

  // Check if target can be attacked
  if (!targetState.shieldActive &&
      !targetState.battleInProgress &&
      !targetState.battleCooldown) {

    // Calculate and create battle
    const battle = await createBattle(
      town.address,
      targetAddress,
      currentTick
    );

    // Set attacker troops to 0
    await updateTown(town.address, { troops: 0 });

    // Send global feed message
    await sendGlobalFeedMessage(
      `${town.name} is attacking ${targetTown.name} ` +
      `(potential gain: ${formatDollars(battle.reward)}, ` +
      `at risk: ${formatDollars(battle.penalty)})`
    );

    await deleteAction(battleAction.id);
  } else {
    // Cannot attack - delete action and show error
    await deleteAction(battleAction.id);
    await setTownError(town.address, currentTick,
      "Target cannot be attacked (shielded or in battle)");
  }
}
```

**Task 3.2.2: Battle Resolution**
```typescript
// Check for battles ending this tick
const endingBattle = await getBattleEndingAtTick(town.address, currentTick);

if (endingBattle) {
  await resolveBattle(endingBattle.id, currentTick);

  // Send global feed messages based on outcome
  if (endingBattle.success) {
    if (endingBattle.attackerAddress === town.address) {
      // Attacker won
      await sendGlobalFeedMessage(
        `${attackerTown.name} demolished ${defenderTown.name}, ` +
        `gained ${formatDollars(endingBattle.reward)}`
      );
    } else {
      // Defender lost
      await sendGlobalFeedMessage(
        `${defenderTown.name}'s defences were defeated by ${attackerTown.name}`
      );
    }
  } else {
    // Attacker lost
    await sendGlobalFeedMessage(
      `${defenderTown.name} beat back ${attackerTown.name}, ` +
      `gained ${formatDollars(endingBattle.penalty)}`
    );
  }
}
```

---

### 3.3 Battle Suggestions System

**File**: `src/game/battle-service.ts` (EXTEND)

**Task 3.3.1: Implement Battle Suggestions** (src/tick.ts:82)
```typescript
// e. Update battle suggestions (Phase 3)
await updateBattleSuggestions(currentTick);

// In battle-service.ts:
async function updateBattleSuggestions(currentTick: number) {
  // Get all towns
  const allTowns = await getAllTowns();

  for (const town of allTowns) {
    const townLevel = TOWN_LEVELS_TABLE[town.level];

    // Only update if town can afford to attack
    if (town.coins < townLevel.attackCost) {
      continue;
    }

    // Find attackable targets
    const attackableTargets = [];
    for (const target of allTowns) {
      if (target.address === town.address) continue;

      const targetState = await getTownState(target.address, currentTick);
      if (!targetState.shieldActive &&
          !targetState.battleInProgress &&
          !targetState.battleCooldown) {
        attackableTargets.push(target);
      }
    }

    // Randomly select 3 suggestions
    const suggestions = shuffleArray(attackableTargets).slice(0, 3);

    // Store in database or cache
    await storeBattleSuggestions(town.address, suggestions);
  }
}
```

**Storage Options**:
- Option A: Add `battleSuggestions` JSONB column to towns table
- Option B: Create separate `battle_suggestions` table
- Option C: Calculate on-demand in message rendering (simpler, less storage)

**Recommendation**: Option C for MVP - calculate on-demand

---

### 3.4 Battle Command Handler

**File**: `src/game/command-handlers.ts` (EXTEND)

**Task 3.4.1: Create Attack Command**
```typescript
export async function handleAttack(
  handler: BotHandler,
  userId: string,
  channelId: string,
  args: string[]
): Promise<void> {
  const town = await getTown(userId);
  if (!town) {
    await handler.sendMessage(channelId, "You need to `/engage` first!");
    return;
  }

  const targetAddress = args[0];
  if (!targetAddress) {
    await handler.sendMessage(channelId, "Usage: `/attack <target-address>`");
    return;
  }

  // Validate target exists
  const targetTown = await getTown(targetAddress);
  if (!targetTown) {
    await handler.sendMessage(channelId, "Target town not found");
    return;
  }

  // Queue battle action
  const currentTick = await getCurrentTick();
  await queueBattle(userId, currentTick + 1, targetAddress);

  await handler.sendMessage(
    channelId,
    `✓ Queued attack on ${targetTown.name} for next tick`
  );
}
```

**File**: `src/game/action-service.ts` (EXTEND)

**Task 3.4.2: Add Battle Action Queue Function**
```typescript
export async function queueBattle(
  townAddress: string,
  tick: number,
  targetAddress: string
): Promise<string> {
  const [action] = await db
    .insert(actions)
    .values({
      townAddress,
      tick,
      type: ActionType.Battle,
      data: { townAddress: targetAddress },
    })
    .returning();
  return action.id;
}
```

---

## Phase 4: UI/UX Enhancements (HIGH PRIORITY)

### 4.1 Button-Based Interactions

**File**: `src/game/message-service.ts` (MODIFY Lines 253-254)

**Task 4.1.1: Replace Slash Commands with Buttons**

Current state: Message service renders buttons but uses custom IDs.
Need to: Create interaction request buttons that the bot can respond to.

```typescript
// Generate interaction buttons based on town state
const buttons: InteractionButton[] = [];

// Buy resource buttons
for (const [resourceType, resourceDef] of Object.entries(RESOURCE_DEFINITIONS_TABLE)) {
  const resourceLimit = RESOURCE_LIMITS_TABLE[town.level]?.[resourceType];
  if (!resourceLimit) continue;

  const existingCount = townResources.filter(r => r.type === Number(resourceType)).length;
  if (existingCount < resourceLimit.count) {
    const cost = resourceDef.levels[0].cost;
    if (town.coins >= cost) {
      buttons.push({
        label: `Buy ${resourceDef.name} (${cost}c)`,
        id: `buy:${resourceType}`,
      });
    }
  }
}

// Collect/Upgrade resource buttons
for (const resource of townResources) {
  const resourceDef = RESOURCE_DEFINITIONS_TABLE[resource.type];
  const resourceLimit = RESOURCE_LIMITS_TABLE[town.level]?.[resource.type];

  if (resource.rewardsBank > 0) {
    buttons.push({
      label: `${resourceDef.name} ${resource.rewardsBank} ${resourceDef.rewardType}`,
      id: `collect:${resource.id}`,
    });
  } else if (resource.level < resourceLimit.maxLevel) {
    const cost = resourceDef.levels[resource.level + 1].cost;
    if (town.coins >= cost) {
      buttons.push({
        label: `Upgrade ${resourceDef.name} to lvl ${resource.level + 1} (${cost}c)`,
        id: `upgrade:${resource.id}`,
      });
    }
  }
}

// Shield button
if (!battleCooldown && !shieldActive && !shieldCooldown &&
    town.coins >= townLevel.shieldCost) {
  buttons.push({
    label: `Buy Shield (${townLevel.shieldCost}c)`,
    id: `shield`,
  });
}

// Boost button
if (!boostActive && !boostCooldown && town.coins >= townLevel.boostCost) {
  buttons.push({
    label: `Buy Boost (${townLevel.boostCost}c)`,
    id: `boost`,
  });
}

// Attack buttons (Phase 3)
if (town.coins >= townLevel.attackCost) {
  const suggestions = await getBattleSuggestions(town.address, currentTick);
  for (const suggestion of suggestions.slice(0, 3)) {
    buttons.push({
      label: `Attack ${suggestion.name} lvl ${suggestion.level}`,
      id: `attack:${suggestion.address}`,
    });
  }
}

// Level up button
if (canRequestLevelUp) {
  buttons.push({
    label: "Upgrade Town",
    id: `levelup`,
  });
}
```

**Task 4.1.2: Implement Button Click Handlers**

**File**: `src/index.ts` (MODIFY - add interaction handler)

```typescript
// Handle interaction requests (button clicks)
bot.onInteractionRequest(async (request) => {
  const { userId, channelId, interactionId } = request;

  // Parse button ID
  const [action, ...params] = interactionId.split(':');

  const currentTick = await getCurrentTick();

  switch (action) {
    case 'buy':
      await queueBuyResource(userId, currentTick + 1, Number(params[0]));
      break;
    case 'upgrade':
      await queueUpgradeResource(userId, currentTick + 1, params[0]);
      break;
    case 'collect':
      await queueCollect(userId, currentTick + 1, params[0]);
      break;
    case 'shield':
      await queueShield(userId, currentTick + 1);
      break;
    case 'boost':
      await queueBoost(userId, currentTick + 1);
      break;
    case 'attack':
      await queueBattle(userId, currentTick + 1, params[0]);
      break;
    case 'levelup':
      await queueLevelUpRequest(userId, currentTick + 1);
      break;
    case 'approve-levelup':
      await queueLevelUpApproval(userId, currentTick + 1);
      break;
    case 'cancel-levelup':
      await queueLevelUpCancel(userId, currentTick + 1);
      break;
  }

  // Acknowledge interaction
  await bot.acknowledgeInteraction(interactionId);

  // Update main message will happen on next tick
});
```

---

### 4.2 Fancy Display States

**File**: `src/game/message-service.ts` (MODIFY)

**Task 4.2.1: Implement Dramatic Event Detection**

```typescript
export async function renderMainMessage(
  town: Town,
  currentTick: number
): Promise<string> {
  const state = await getTownState(town.address, currentTick);
  const pendingActions = await getActionsByTick(town.address, currentTick);

  // Calculate display state priority (per spec lines 492-531)
  const pendingBattle = pendingActions.find(a => a.type === ActionType.Battle);
  const newLevelUp = town.leveledUpAt === currentTick;

  // Priority 1: Pending Battle
  if (pendingBattle) {
    return renderPendingBattle(town, pendingBattle.data.townAddress);
  }

  // Priority 2-3: Battle In Progress
  if (state.battleInProgress && state.battle) {
    if (state.battle.attackerAddress === town.address) {
      return renderBattleInProgressAttacker(town, state.battle);
    } else {
      return renderBattleInProgressDefender(town, state.battle);
    }
  }

  // Priority 4-7: Battle Summary
  if (state.battleSummary && state.battle) {
    return renderBattleSummary(town, state.battle);
  }

  // Priority 8: New Level Up
  if (newLevelUp) {
    return renderNewLevelUp(town);
  }

  // Standard display
  return renderStandardDisplay(town, state, currentTick);
}
```

**Task 4.2.2: Create Fancy Display Renderers**

```typescript
function renderPendingBattle(town: Town, enemyAddress: string): string {
  const enemy = await getTown(enemyAddress);
  return `
╔═══════════════════════════════════════════════╗
║     ⚔️  PREPARING FOR BATTLE  ⚔️             ║
╚═══════════════════════════════════════════════╝

${town.name} is preparing to attack ${enemy.name}!

⚔️ Battle begins next tick...
`;
}

function renderBattleInProgressAttacker(town: Town, battle: Battle): string {
  const enemy = await getTown(battle.defenderAddress);
  const ticksRemaining = battle.end - currentTick;

  return `
╔═══════════════════════════════════════════════╗
║     ⚔️  ATTACKING ${enemy.name.toUpperCase()}  ⚔️      ║
╚═══════════════════════════════════════════════╝

     🏹        🏰
    /|\\       ███
   / | \\     █████

Potential Gain: ${formatDollars(battle.reward)}
At Risk: ${formatDollars(battle.penalty)}

Battle ends in ${ticksRemaining} ticks...
`;
}

function renderBattleInProgressDefender(town: Town, battle: Battle): string {
  const enemy = await getTown(battle.attackerAddress);
  const ticksRemaining = battle.end - currentTick;

  return `
╔═══════════════════════════════════════════════╗
║     🛡️  UNDER ATTACK  🛡️                     ║
╚═══════════════════════════════════════════════╝

   🏰        🏹
  ███       /|\\
 █████     / | \\

${enemy.name} is attacking!

Potential Gain: ${formatDollars(battle.penalty)}
At Risk: ${formatDollars(battle.reward)}

Battle ends in ${ticksRemaining} ticks...
`;
}

function renderBattleSummary(town: Town, battle: Battle): string {
  const isAttacker = battle.attackerAddress === town.address;
  const won = isAttacker ? battle.success : !battle.success;
  const enemy = await getTown(
    isAttacker ? battle.defenderAddress : battle.attackerAddress
  );

  if (isAttacker && battle.success) {
    // Attacker won
    return `
╔═══════════════════════════════════════════════╗
║     🎉  VICTORY!  🎉                          ║
╚═══════════════════════════════════════════════╝

You demolished ${enemy.name}!

💰 Gained: ${formatDollars(battle.reward * battle.percentage / 100)}

Your forces have returned to base.
`;
  } else if (isAttacker && !battle.success) {
    // Attacker lost
    return `
╔═══════════════════════════════════════════════╗
║     ☠️  DEFEAT  ☠️                            ║
╚═══════════════════════════════════════════════╝

You lost the attack on ${enemy.name}

💸 Lost: ${formatDollars(battle.penalty)}

Your forces were destroyed.
`;
  } else if (!isAttacker && !battle.success) {
    // Defender won
    const cooldownTicks = battle.cooldownEnd - currentTick;
    return `
╔═══════════════════════════════════════════════╗
║     🛡️  DEFENDED!  🛡️                        ║
╚═══════════════════════════════════════════════╝

You beat back ${enemy.name}!

💰 Gained: ${formatDollars(battle.penalty)}

🛡️ Shields active for ${cooldownTicks} ticks
`;
  } else {
    // Defender lost
    const cooldownTicks = battle.cooldownEnd - currentTick;
    return `
╔═══════════════════════════════════════════════╗
║     ⚠️  BREACHED  ⚠️                          ║
╚═══════════════════════════════════════════════╝

Your defences were defeated by ${enemy.name}

💸 Lost: ${formatDollars(battle.reward * battle.percentage / 100)}

🛡️ Shields active for ${cooldownTicks} ticks
`;
  }
}

function renderNewLevelUp(town: Town): string {
  return `
╔═══════════════════════════════════════════════╗
║     🏰  TOWN UPGRADED!  🏰                    ║
╚═══════════════════════════════════════════════╝

Town Level ${town.level}

New buildings and upgrades unlocked!
🛡️ Shield activated!
`;
}
```

---

### 4.3 Feed Message System

**File**: `src/game/feed-service.ts` (NEW FILE)

**Task 4.3.1: Create Feed Message Service**

```typescript
import type { BotHandler } from "@towns-protocol/bot";
import { db, towns } from "../db";

/**
 * Send a global feed message to all engaged channels
 */
export async function sendGlobalFeedMessage(
  handler: BotHandler,
  message: string
): Promise<void> {
  // Get all unique channel IDs
  const engagedTowns = await db.select().from(towns);
  const channelIds = [...new Set(engagedTowns.map(t => t.channelId))];

  // Send message to each channel
  for (const channelId of channelIds) {
    await handler.sendMessage(channelId, `📢 ${message}`);
  }
}

/**
 * Send a channel-only message
 */
export async function sendChannelMessage(
  handler: BotHandler,
  channelId: string,
  message: string
): Promise<void> {
  await handler.sendMessage(channelId, message);
}
```

**Task 4.3.2: Integrate Feed Messages in Tick**

**File**: `src/tick.ts` (MODIFY Line 73)

```typescript
// b. Apply actions and send messages
const { successful, failed } = await executePendingActions(
  town,
  pendingActions,
  currentTick
);

for (const { action, result } of successful) {
  // Send global feed messages
  if (result.feedMessage) {
    await sendGlobalFeedMessage(handler, result.feedMessage);
  }

  // Send channel-only messages
  if (result.channelMessage) {
    await sendChannelMessage(handler, town.channelId, result.channelMessage);
  }
}
```

---

### 4.4 Message Management

**Task 4.4.1: User Message Deletion**

**File**: `src/index.ts` (MODIFY)

```typescript
// Handle all messages
bot.onMessage(async (message) => {
  const { userId, channelId, text } = message;

  // Check if user is engaged
  const town = await getTown(userId);

  if (town) {
    // User is engaged - delete their message
    // Only allow interaction through buttons
    await bot.adminRemoveEvent(channelId, message.eventId);
  }

  // Don't process text commands for engaged users
});
```

---

## Phase 5: Progression System Refinements

### 5.1 Treasury Integration

**File**: `src/game/town-service.ts` (MODIFY)

**Task 5.1.1: Implement SpaceDapp Treasury Approval**

```typescript
// Replace mock approval with actual treasury integration
export async function requestTreasuryApproval(
  townAddress: string,
  amount: number
): Promise<void> {
  // Use SpaceDapp API to request treasury withdrawal approval
  // This will trigger the actual approval flow in the Space

  // For now, this remains mock until SpaceDapp treasury API is ready
}

export async function withdrawFromTreasury(
  townAddress: string,
  amount: number
): Promise<boolean> {
  // Actually withdraw from Space treasury
  // Return true if successful, false if failed

  // For now, this remains mock
  return true;
}
```

---

## Phase 6: Polish & Testing

### 6.1 SpaceDapp Integration

**File**: `src/game/town-service.ts` (MODIFY Line 25)

**Task 6.1.1: Implement Town Name Lookup**

```typescript
async function getTownName(address: string, spaceId: string): Promise<string> {
  // TODO: Implement actual spaceDapp lookup
  // For now, return placeholder

  try {
    // Use SpaceDapp instance to get user's space/town name
    const spaceDapp = await getSpaceDapp(spaceId);
    const profile = await spaceDapp.getProfile(address);
    return profile.name || `Town ${address.slice(0, 6)}`;
  } catch (error) {
    console.error("Failed to get town name:", error);
    return `Town ${address.slice(0, 6)}`;
  }
}
```

---

### 6.2 Error Handling

**File**: `src/game/town-service.ts` (EXTEND)

**Task 6.2.1: Enhanced Error Tracking**

```typescript
export async function setTownError(
  townAddress: string,
  tick: number,
  message: string
): Promise<void> {
  await db.insert(townErrors).values({
    townAddress,
    tick,
    message,
  });
}

export async function getTownErrors(
  townAddress: string,
  currentTick: number
): Promise<TownError[]> {
  // Get errors from last 2 ticks
  return db
    .select()
    .from(townErrors)
    .where(
      and(
        eq(townErrors.townAddress, townAddress),
        gte(townErrors.tick, currentTick - 2)
      )
    );
}
```

**File**: `src/game/message-service.ts` (MODIFY)

**Task 6.2.2: Display Errors in Main Message**

```typescript
// In standard display, show errors from last 2 ticks
const errors = await getTownErrors(town.address, currentTick);
if (errors.length > 0) {
  statusText += `\n⚠️ Error: ${errors[0].message}`;
}
```

---

### 6.3 Implementation Tests

**File**: `src/tests/static-data.test.ts` (NEW FILE)

**Task 6.3.1: Resource Level Linearity Test**

```typescript
import { describe, it, expect } from "bun:test";
import { RESOURCE_DEFINITIONS_TABLE } from "../game/static-data";

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

      // Check incremental properties
      for (let i = 1; i < levels.length; i++) {
        const prev = def.levels[i - 1];
        const curr = def.levels[i];

        expect(curr.cost).toBeGreaterThanOrEqual(prev.cost);
        expect(curr.damagePerTick).toBeGreaterThanOrEqual(prev.damagePerTick);
        expect(curr.rewardsPerTick).toBeGreaterThanOrEqual(prev.rewardsPerTick);
        expect(curr.hp).toBeGreaterThanOrEqual(prev.hp);
      }
    }
  });
});
```

**Task 6.3.2: Resource Limits Progression Test**

```typescript
describe("RESOURCE_LIMITS_TABLE", () => {
  it("should have progressive resource limits", () => {
    const townLevels = Object.keys(RESOURCE_LIMITS_TABLE)
      .map(Number)
      .sort((a, b) => a - b);

    for (let i = 1; i < townLevels.length; i++) {
      const prevLevel = RESOURCE_LIMITS_TABLE[townLevels[i - 1]];
      const currLevel = RESOURCE_LIMITS_TABLE[townLevels[i]];

      for (const [type, prevLimit] of Object.entries(prevLevel)) {
        expect(currLevel[type]).toBeDefined();
        expect(currLevel[type].count).toBeGreaterThanOrEqual(prevLimit.count);
        expect(currLevel[type].maxLevel).toBeGreaterThanOrEqual(
          prevLimit.maxLevel
        );
      }
    }
  });
});
```

**Task 6.3.3: Max Level Constraints Test**

```typescript
describe("RESOURCE_LIMITS_TABLE maxLevel constraints", () => {
  it("should not exceed defined resource levels", () => {
    for (const [townLevel, limits] of Object.entries(RESOURCE_LIMITS_TABLE)) {
      for (const [resourceType, limit] of Object.entries(limits)) {
        const resourceDef = RESOURCE_DEFINITIONS_TABLE[resourceType];
        const maxDefinedLevel = Math.max(
          ...Object.keys(resourceDef.levels).map(Number)
        );

        expect(limit.maxLevel).toBeLessThanOrEqual(maxDefinedLevel);
      }
    }
  });
});
```

**Task 6.3.4: Run Tests**

```bash
bun test
```

---

### 6.4 Integration Testing

**File**: `src/tests/integration.test.ts` (NEW FILE)

**Task 6.4.1: Full Game Flow Test**

```typescript
describe("Full game flow", () => {
  it("should handle complete town lifecycle", async () => {
    // 1. Create town
    const town = await createTown("test-user", "test-channel");
    expect(town.level).toBe(0);
    expect(town.requestedLevel).toBe(1);

    // 2. Approve level up
    await queueLevelUpApproval(town.address, 1);
    await runTick();
    const updatedTown = await getTown(town.address);
    expect(updatedTown.level).toBe(1);

    // 3. Buy resource
    await queueBuyResource(town.address, 2, 3); // Mine
    await runTick();
    const resources = await getTownResources(town.address);
    expect(resources.length).toBe(1);
    expect(resources[0].type).toBe(3);

    // 4. Collect rewards after cooldown
    await runTick(); // Tick 3
    await runTick(); // Tick 4 - past cooldown
    await runTick(); // Tick 5 - rewards accumulating
    await queueCollect(town.address, 6, resources[0].id);
    await runTick(); // Tick 6 - collect
    const townAfterCollect = await getTown(town.address);
    expect(townAfterCollect.coins).toBeGreaterThan(town.coins);
  });
});
```

**Task 6.4.2: Battle System Test**

```typescript
describe("Battle system", () => {
  it("should handle complete battle flow", async () => {
    // Create two towns
    const attacker = await createTown("attacker", "channel1");
    const defender = await createTown("defender", "channel2");

    // Level them up and give them resources
    await setupTownForBattle(attacker);
    await setupTownForBattle(defender);

    // Initiate battle
    await queueBattle(attacker.address, currentTick + 1, defender.address);
    await runTick();

    // Check battle was created
    const battle = await getTownActiveBattle(attacker.address);
    expect(battle).toBeDefined();
    expect(battle.attackerAddress).toBe(attacker.address);
    expect(battle.defenderAddress).toBe(defender.address);

    // Fast forward to battle end
    const ticksToEnd = battle.end - currentTick;
    for (let i = 0; i < ticksToEnd; i++) {
      await runTick();
    }

    // Check battle resolved
    const attackerAfter = await getTown(attacker.address);
    const defenderAfter = await getTown(defender.address);

    if (battle.success) {
      expect(attackerAfter.treasury).toBeGreaterThan(attacker.treasury);
      expect(defenderAfter.treasury).toBeLessThan(defender.treasury);
    } else {
      expect(attackerAfter.treasury).toBeLessThan(attacker.treasury);
      expect(defenderAfter.treasury).toBeGreaterThan(defender.treasury);
    }
  });
});
```

---

### 6.5 Performance Optimization

**Task 6.5.1: Database Indexes**

```typescript
// Add indexes to frequently queried columns
// In drizzle schema or migration:

// Index on town address for quick lookups
CREATE INDEX idx_towns_address ON towns(address);

// Index on channel_id for feed messages
CREATE INDEX idx_towns_channel ON towns(channel_id);

// Index on tick for action processing
CREATE INDEX idx_actions_tick ON actions(tick);

// Index on battle end times
CREATE INDEX idx_battles_end ON battles(end);

// Index on shield/boost end times
CREATE INDEX idx_shields_end ON shields(end);
CREATE INDEX idx_boosts_end ON boosts(end);
```

**Task 6.5.2: Query Optimization**

```typescript
// Batch database operations where possible
// Use transactions for multi-step operations
// Cache frequently accessed static data
```

---

### 6.6 Balance Testing

**Task 6.6.1: Economic Balance**

- Test coin generation rates vs costs
- Verify treasury growth is reasonable
- Test battle rewards/penalties are balanced
- Ensure no infinite loops or exploits

**Task 6.6.2: Combat Balance**

- Test various troop/resource combinations
- Verify battle outcomes are fair
- Test edge cases (0 troops, max troops, etc.)
- Ensure cooldowns prevent spam

**Task 6.6.3: Progression Balance**

- Test time to level up feels reasonable
- Verify resource upgrade paths make sense
- Test that higher levels provide meaningful advantages
- Ensure new players can catch up

---

## Implementation Priority & Timeline

### Week 1: Combat System (CRITICAL PATH)
**Days 1-2**: Battle calculation & storage
- [ ] Create `battle-service.ts`
- [ ] Implement `calculateBattle()` algorithm
- [ ] Add battle database operations
- [ ] Add `queueBattle()` to action-service

**Days 3-4**: Battle execution in tick
- [ ] Modify `src/tick.ts` to process battle actions
- [ ] Implement battle initiation logic
- [ ] Implement battle resolution logic
- [ ] Test battle treasury transfers

**Day 5**: Battle commands & suggestions
- [ ] Add `/attack` command handler
- [ ] Implement battle suggestions algorithm
- [ ] Add attack buttons to main message

---

### Week 2: UI/UX (USER EXPERIENCE)
**Days 1-2**: Button interactions
- [ ] Modify message-service to generate interaction buttons
- [ ] Add `onInteractionRequest` handler to index.ts
- [ ] Replace slash commands with button clicks
- [ ] Test all button interactions

**Days 3-4**: Fancy displays
- [ ] Implement fancy state detection
- [ ] Create ASCII art battle displays
- [ ] Create level-up display
- [ ] Test state priority logic

**Day 5**: Feed messages
- [ ] Create `feed-service.ts`
- [ ] Implement global feed messages
- [ ] Implement channel messages
- [ ] Add user message deletion

---

### Week 3: Refinements
**Days 1-2**: Battle suggestions & polish
- [ ] Finalize battle suggestions system
- [ ] Add attack buttons with suggestions
- [ ] Polish battle displays
- [ ] Test multi-town battles

**Days 3-4**: Treasury & naming
- [ ] Integrate treasury API (if available)
- [ ] Implement spaceDapp town name lookup
- [ ] Test approval flow
- [ ] Error handling improvements

**Day 5**: Testing
- [ ] Write implementation tests
- [ ] Run static data validation
- [ ] Fix any test failures

---

### Week 4: Testing & Launch
**Days 1-2**: Integration testing
- [ ] Full game flow tests
- [ ] Battle system tests
- [ ] Multi-user scenarios
- [ ] Edge case testing

**Days 3-4**: Balance & optimization
- [ ] Add database indexes
- [ ] Optimize queries
- [ ] Balance testing
- [ ] Performance profiling

**Day 5**: Launch preparation
- [ ] Final bug fixes
- [ ] Documentation updates
- [ ] Deployment checklist
- [ ] Launch!

---

## Estimated Completion

**Total Development Time**: 3-4 weeks

**MVP Launch Target**: End of Week 4

**Post-Launch**: Monitor, fix bugs, gather feedback, iterate

---

## Next Immediate Actions

**OPTION 1**: Start Phase 3 (Combat System)
- Begin with `battle-service.ts` creation
- Implement battle calculation algorithm
- This is the critical path to MVP

**OPTION 2**: Start Phase 4 (UI/UX)
- Begin with button-based interactions
- Improve user experience with current features
- Defer combat until UI is polished

**OPTION 3**: Write tests first
- Validate static data tables
- Ensure foundation is solid
- Then proceed to combat system

**RECOMMENDED**: Option 1 - Combat is the most important missing feature for gameplay.

---

## Success Criteria

MVP is complete when:
- ✅ Users can create towns
- ✅ Users can buy/upgrade/collect resources
- ✅ Resources generate rewards over time
- ✅ Users can purchase shields and boosts
- ✅ Users can level up their towns
- ✅ Users can attack other towns
- ✅ Battles calculate correctly and transfer treasury
- ✅ Battle suggestions work
- ✅ UI shows dramatic battle displays
- ✅ Feed messages broadcast to all channels
- ✅ All static data tests pass
- ✅ Core gameplay loop is fun and balanced

---

## Notes

- All monetary values stored in cents, displayed as dollars (2 decimal places)
- Hard-coded ETH price: $3,318.35
- Rewards cooldown: 2 ticks after collection
- Tick interval: 10 seconds
- Main message updates after every interaction and tick
- User messages deleted when engaged (button-only interaction)

---

**Last Updated**: 2025-11-06
