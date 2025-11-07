# Towns Wars - Official Specification

## Statement of Purpose

Make a text-based interactive multiplayer strategy game using the Towns bot framework. Users will be able to grow and build their town's resources and defenses and attack other towns to win their treasury.

## Goal

Proof of concept MVP that runs in the existing repository.

---

## Table of Contents

1. [Core Data Structures](#core-data-structures)
2. [Static Data Tables](#static-data-tables)
3. [Game Mechanics](#game-mechanics)
4. [User Interface](#user-interface)
5. [Bot Interactions](#bot-interactions)
6. [Tick System](#tick-system)
7. [Implementation Tests](#implementation-tests)

---

## Core Data Structures

### Town

```typescript
interface Town {
  address: string; // primary key
  channelId: string;
  name: string;
  level: number; // initialized to 0
  requestedLevel: number; // initialized to 1
  leveledUpAt: number; // tick that level happened
  coins: number;
  troops: number;
  treasury: number; // stored in cents, displayed in dollars (2 decimal places)
  resources: Resource[];
  currentBattle?: Battle;
  currentShield?: Shield;
  currentBoost?: Boost;
  battleSuggestions: Town[];
  error?: { message: string; tick: number };
}
```

### Town Level

```typescript
interface TownLevel {
  approvedTreasuryBalance: number; // cents, displayed as dollars (2 decimals)
  coinAllocation: number; // coins given on level upgrade
  boostCost: number;
  boostMultiplier: number;
  boostCooldown: number;
  shieldCost: number;
  shieldDuration: number;
  shieldCooldown: number;
  cooldownTimeMin: number;
  cooldownTimeMax: number;
  hp: number;
  attackCost: number; // cost to attack someone else
  attackDuration: number; // ticks spent attacking
  troopHp: number;
  troopDps: number;
  maxTroops: number;
}
```

### Resource

```typescript
interface Resource {
  type: number;
  level: number;
  aquiredAt: number;
  rewardsBank: number;
  collectedAt: number; // initialized to aquiredAt
}
```

### Resource Definition

```typescript
interface ResourceLevel {
  cost: number; // cost of upgrade
  damagePerTick: number; // damage dealt per tick in battle
  rewardsPerTick: number; // rewards per tick
  maxRewards: number; // max rewards
  hp: number;
}

interface ResourceDefinition {
  name: string;
  description: string;
  rewardType: "none" | "troops" | "coins";
  levels: Record<number, ResourceLevel>;
}
```

### Resource Limit

```typescript
interface ResourceLimit {
  count: number;
  maxLevel: number;
}
```

### Actions

```typescript
type Action =
  | BattleAction
  | UpgradeResourceAction
  | BuyAction
  | BoostAction
  | ShieldAction
  | CollectAction
  | LevelUpRequestAction
  | LevelUpApprovalAction
  | LevelUpCancelAction;

interface BattleAction {
  id: string; // guid
  tick: number;
  type: 0;
  townAddress: string;
}

interface UpgradeResourceAction {
  id: string;
  tick: number;
  type: 1;
  resourceType: number;
}

interface BuyAction {
  id: string;
  tick: number;
  type: 2;
  resource: number;
}

interface BoostAction {
  id: string;
  tick: number;
  type: 3;
}

interface ShieldAction {
  id: string;
  tick: number;
  type: 4;
}

interface LevelUpRequestAction {
  id: string;
  tick: number;
  type: 5;
}

interface LevelUpApprovalAction {
  id: string;
  tick: number;
  type: 6;
}

interface LevelUpCancelAction {
  id: string;
  tick: number;
  type: 7;
}

interface CollectAction {
  id: string;
  tick: number;
  type: 8;
  resourceIndex: number;
}
```

### Boost

```typescript
interface Boost {
  id: string;
  townAddress: string;
  start: number;
  end: number;
  cooldownEnd: number;
}
```

### Shield

```typescript
interface Shield {
  id: string;
  townAddress: string;
  start: number; // inclusive
  end: number; // exclusive
  cooldownEnd: number;
}
```

**Note:** Shields start on the tick they were purchased.

### Battle

```typescript
interface Battle {
  id: string;
  defenderAddress: string;
  attackerAddress: string;
  start: number;
  end: number;
  cooldownEnd: number; // cooldown between cooldownTimeMin and cooldownTimeMax
  reward: number; // cents, displayed rounded to 2 decimals
  penalty: number; // cents, displayed rounded to 2 decimals
  success: boolean;
  percentage: number; // 0-100, attacker gets % of reward on win
}
```

---

## Static Data Tables

### TOWN_LEVELS_TABLE

```typescript
const TOWN_LEVELS_TABLE: Record<number, TownLevel> = {
  0: {
    approvedTreasuryBalance: 0,
    // ... etc (initialize but not used)
  },
  1: {
    approvedTreasuryBalance: 1000, // $10.00 in cents
    coinAllocation: 1000,
    boostCost: 100,
    boostMultiplier: 2,
    shieldCost: 100,
    // ... etc
  },
  // ... etc
};
```

### RESOURCE_DEFINITIONS_TABLE

```typescript
const RESOURCE_DEFINITIONS_TABLE: Record<number, ResourceDefinition> = {
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
      // ... etc
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
        rewardsPerTick: 10,
        maxRewards: 0,
        hp: 120,
      },
      1: {
        cost: 48,
        damagePerTick: 0,
        rewardsPerTick: 18,
        maxRewards: 0,
        hp: 160,
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
        rewardsPerTick: 7,
        maxRewards: 0,
        hp: 160,
      },
    },
  },
  // ... etc
};
```

### RESOURCE_LIMITS_TABLE

```typescript
const RESOURCE_LIMITS_TABLE: Record<number, Record<number, ResourceLimit>> = {
  0: {
    1: { count: 2, maxLevel: 2 }, // cannon
    2: { count: 1, maxLevel: 2 }, // barracks
    3: { count: 1, maxLevel: 2 }, // mine
    // ... etc
  },
  1: {
    1: { count: 3, maxLevel: 3 }, // cannon
    2: { count: 2, maxLevel: 3 }, // barracks
    3: { count: 2, maxLevel: 3 }, // mine
    // ... etc
  },
  // ... etc
};
```

### Constants

```typescript
const REWARDS_COOLDOWN_TICKS = 2; // Wait 2 ticks before giving rewards after collection
const ETH_TO_USD = 3318.35; // Hard-coded ETH price
```

---

## Game Mechanics

### Battle System

#### Initiation

- Towns cannot be attacked if under shield or in cooldown from previous battle
- Calculate and save battle result immediately
- Send updates to channels as battle progresses

#### Battle Algorithm

```typescript
function calculateBattle(
  attacker: Town,
  defender: Town,
  attackerLevel: TownLevel
): BattleResult {
  let attackerHp = attacker.troops * attackerLevel.troopHp;
  const attackerDps = attacker.troops * attackerLevel.troopDps;

  let defenderHp = defender.resources.reduce(
    (sum, r) => sum + RESOURCE_DEFINITIONS_TABLE[r.type].levels[r.level].hp,
    0
  );
  const defenderInitialHp = defenderHp;
  const defenderDps = defender.resources.reduce(
    (sum, r) =>
      sum + RESOURCE_DEFINITIONS_TABLE[r.type].levels[r.level].damagePerTick,
    0
  );

  for (let i = 0; i < attackerLevel.attackDuration; i++) {
    attackerHp -= defenderDps;
    if (attackerHp < 0) {
      return { success: false };
    }

    defenderHp -= attackerDps;
    if (defenderHp < 0) {
      return { success: true, percentage: 100, duration: i };
    }
  }

  const pointsTaken = defenderInitialHp - defenderHp;
  const percentage = pointsTaken / defenderInitialHp;
  return {
    success: true,
    percentage: Math.round(100 * percentage),
    duration: attackerLevel.attackDuration,
  };
}
```

#### Battle Resolution

- Attacker troops always reset to 0
- **If success == false:** Deduct penalty from attacker's treasury, give to defender's treasury
- **If success == true:** Deduct percentage of reward from defender's treasury, add to attacker's treasury

### Level Up System

#### Request Process

1. User requests level up (increments `town.requestedLevel`)
2. `town.requestedLevel` can never be more than 1 greater than `town.level`
3. Display approval request to user
4. On approval: Apply level-up approval action
5. On cancel: Decrement `town.requestedLevel`

#### Level Up Application

- Increase `town.level`
- Apply shield for new level duration
- Increase treasury by `approvedTreasuryBalance`
- Award `coinAllocation` coins
- Set `leveledUpAt` to current tick

### Resource System

#### Resource Acquisition

- Purchase new resources with coins (if below count limit)
- Upgrade existing resources with coins (if below level limit)

#### Resource Rewards

```typescript
if (currentTick > resource.collectedAt + REWARDS_COOLDOWN_TICKS) {
  resource.rewardsBank += resourceDef.levels[resource.level].rewardsPerTick;
}
```

#### Collection

- User triggers collect action
- Awards rewards based on `rewardType`:
  - `'coins'`: Add to town coins
  - `'troops'`: Add to town troops (up to maxTroops)
  - `'none'`: No reward
- Set `resource.collectedAt = currentTick`
- Clear `resource.rewardsBank`

### Tip System

Tips are received in ETH and converted to coins:

```typescript
function tipToCoins(ethAmount: number): number {
  const usdAmount = ethAmount * ETH_TO_USD;

  if (usdAmount < 3.5) return 90;
  if (usdAmount < 7.5) return 490;
  return 990;
}
```

- Increment town's coin balance
- Post new main message

---

## User Interface

### Message Management

- Server tracks main message ID per channel
- Calculate new main message after every interaction and tick
- Only post if different from previous
- When posting new message, delete previous message

### Main Message States

The main message displays differently for dramatic events:

#### State Calculation

```typescript
currentTick = getCurrentTick();
town = getTownRecord(address, currentTick);
pendingActions = getActions(address, currentTick);

boost = town.currentBoost;
boostActive = boost && boost.end > currentTick;
boostCooldown = boost && !boostActive && boost.cooldownEnd > currentTick;

shield = town.currentShield;
shieldActive = shield && shield.end > currentTick;
shieldCooldown = shield && !shieldActive && shield.cooldownEnd > currentTick;

battle = town.currentBattle;
battleInProgress = battle && battle.end > currentTick;
battleSummary = battle && battle.end === currentTick;
battleCooldown =
  battle &&
  !battleInProgress &&
  !battleSummary &&
  battle.cooldownEnd > currentTick;

pendingBattle = pendingActions.find((x) => x.type === 0);
newLevelUp = town.leveledUpAt === currentTick;
```

#### "Fancy" Display States (with ASCII art)

Priority order:

1. **Pending Battle:** "Preparing for battle with {enemyName}"
2. **Battle In Progress (Attacker):** "Attacking {enemyName} (potential gain: ${reward}, at risk: ${penalty})"
3. **Battle In Progress (Defender):** "Under Attack from {enemyName} (potential gain: ${penalty}, at risk: ${reward})"
4. **Battle Summary (Win - Attacker):** "You won the attack on {enemyName} +${amount}"
5. **Battle Summary (Win - Defender):** "Your defences were defeated by {enemyName} -${amount} (shields are active: {cooldown\*pct} seconds)"
6. **Battle Summary (Loss - Attacker):** "You lost the attack on {enemyName} -${amount}"
7. **Battle Summary (Loss - Defender):** "You beat back the {enemyName} +${amount} (shields are active: {cooldown\*pct} seconds)"
8. **New Level Up:** "Town Level {townLevel}"

#### Standard Display

Shows when no dramatic events are occurring.

**Basic Info:**

- Treasury balance (dollars, 2 decimals)
- Coin balance
- Town Level
- DPS (total defense damage per second)
- RPS (resource rewards per second, with/without boost)
- TPS (troop production per second, with/without boost)
- Resources: `[{name, count/limit}, ...]`
- Troops: `count/limit`
- Status indicators:
  - `"boost active {multiplier}x"` (if boostActive)
  - `"shield active"` (if shieldActive OR battleCooldown)
  - `"error: {message}"` (if error.tick > currentTick - 2)

**Interaction Buttons:**

Calculate available actions (apply all pending actions first):

```typescript
canRequestLevelUp = !pendingActions.some(x => x.type === 5); // No pending level up request

for (resourceType of resourceTypes) {
    resourceDef = RESOURCE_DEFINITIONS_TABLE[resourceType];
    resourceName = resourceDef.name;
    resourceLimit = RESOURCE_LIMITS_TABLE[town.level]?.[resourceType]?.count;
    levelLimit = RESOURCE_LIMITS_TABLE[town.level]?.[resourceType]?.maxLevel;
    resources = town.resources.filter(x => x.type === resourceType);

    // Can buy new resource?
    if (resources.length < resourceLimit) {
        canRequestLevelUp = false;
        cost = resourceDef.levels[0].cost;
        if (town.coins >= cost) {
            buttons.push({
                label: `Buy ${resourceName} (${cost}c)`,
                id: ...
            });
        }
    }

    // Can collect or upgrade existing resources?
    for (resource of resources) {
        if (resource.rewardsBank > 0) {
            buttons.push({
                label: `${resourceName} ${resource.rewardsBank} ${resourceDef.rewardType}`,
                id: ...
            });
        } else if (resource.level < levelLimit) {
            canRequestLevelUp = false;
            cost = resourceDef.levels[resource.level + 1].cost;
            if (town.coins >= cost) {
                buttons.push({
                    label: `Upgrade ${resourceName} to lvl ${resource.level + 1} (${cost}c)`,
                    id: ...
                });
            }
        }
    }
}

// Shield purchase
if (!battleCooldown && !shieldActive && !shieldCooldown && town.coins >= shieldCost) {
    buttons.push({ label: `Buy Shield (${shieldCost}c)`, id: ... });
}

// Boost purchase
if (!boostActive && !boostCooldown && town.coins >= boostCost) {
    buttons.push({ label: `Buy Boost (${boostCost}c)`, id: ... });
}

// Attack options
if (town.coins >= townLevel.attackCost) {
    for (battleSuggestion of battleSuggestions.sort((a, b) => a.id.localeCompare(b.id))) {
        if (canAttack(battleSuggestion)) {
            buttons.push({
                label: `Attack ${battleSuggestion.name} lvl ${battleSuggestion.level}`,
                id: ...
            });
        }
    }
}

// Town upgrade
if (canRequestLevelUp) {
    buttons.push({ label: "Upgrade Town", id: ... });
}
```

#### Level Up Request Display

When `town.requestedLevel > town.level`:

```
Approve Towns Bot to Withdraw Up to ${townLevel.approvedTreasuryBalance} from your treasury
[Approve] [Cancel]
```

### Feed Messages

#### Global Messages (all channels)

- `"{townName} is attacking {targetName} (potential gain: ${reward}, at risk: ${penalty})"`
- `"{defenderName} successfully defended against {attackerName}, gained ${amount}"`
- `"{attackerName} demolished {defenderName}, gained ${amount}"`
- `"{townName} purchased a boost"`
- `"{townName} purchased a shield"`
- `"{townName} upgraded their town hall to level {level}"`

#### Channel-Only Messages

- `"You bought a new {resourceName} ({count}/{limit})"`
- `"You upgraded a {resourceName} to level {level} ({count}/{limit})"`
- `"You bought a new {resourceName}"`

### User Message Handling

**Important:** When engaged, delete all channel messages that come from users.

---

## Bot Interactions

### Slash Commands

#### /engage

1. Check if already engaged: `townAddress = SpaceAddressFromSpaceId(spaceId)`
2. If not engaged, create new town record
3. Delete the `/engage` command message
4. Post new main message (should show treasury approval request)

### Tips

- Tips received increment town's coin balance
- Post new main message after tip received

### Reference

See `https://github.com/towns-protocol/towns/blob/main/packages/bot/src/bot.test.ts` for examples of bot-client interactions.

---

## Tick System

The game loop runs on a tick system. Each tick:

### Tick Execution Order

1. **Increment global currentTick**

2. **Iterate over all towns:**

   a. **Cleanup:** Remove battles, shields, and boosts past their cooldown

   b. **Apply actions** (except battle requests) in order:

   - Level up requests → **Global message**
   - Level up cancellations/approvals → **No message**
   - Resource purchases → **Channel message**
   - Resource upgrades → **Channel message**
   - Collect actions → **Channel message**
   - Boost & shield purchases → **Global message**

   c. **Add rewards to resource banks:**

   ```typescript
   if (currentTick > resource.collectedAt + REWARDS_COOLDOWN_TICKS) {
     resource.rewardsBank += resourceDef.levels[resource.level].rewardsPerTick;
   }
   ```

   d. **Process battle requests:**

   - If opponent doesn't have shield, isn't in current battle, and isn't in cooldown:
     - Create new battle entry
     - Send **global message** to all channels

   e. **Update battle suggestions:**

   - Find all towns that can be attacked
   - Find all towns that can attack (coins >= attackCost)
   - Try to add 3 battle suggestions to each town that can attack

   f. **Update main message** for each town

---

## Implementation Tests

### Static Data Validation Tests

#### Test 1: Resource Level Linearity

**Requirement:** All resource levels must be linear (if level N exists, level N-1 must exist).

**Requirement:** All properties must either be 0 or increment for each level.

```typescript
describe("RESOURCE_DEFINITIONS_TABLE", () => {
  it("should have linear level progression", () => {
    for (const [type, def] of Object.entries(RESOURCE_DEFINITIONS_TABLE)) {
      const levels = Object.keys(def.levels)
        .map(Number)
        .sort((a, b) => a - b);

      // Check linearity
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

#### Test 2: Resource Limits Progression

**Requirement:** All town levels must contain resources from previous level at equal or greater count/maxLevel.

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

#### Test 3: Max Level Constraints

**Requirement:** No maxLevel in RESOURCE_LIMITS_TABLE should exceed maximum level defined in RESOURCE_DEFINITIONS_TABLE.

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

---

## Implementation Roadmap

### Phase 1: Core Infrastructure

- [x] Database schema setup
- [x] Town creation and persistence
- [x] Basic bot framework integration
- [x] Tick system implementation

### Phase 2: Resource System

- [x] Resource static data tables
- [x] Resource purchase logic
- [x] Resource upgrade logic
- [x] Resource reward generation
- [x] Collection mechanism

### Phase 3: Combat System

- [ ] Battle calculation algorithm
- [ ] Battle initiation
- [ ] Battle resolution
- [ ] Battle cooldowns
- [ ] Battle suggestions

### Phase 4: Progression System

- [ ] Level up request/approval flow
- [ ] Shield mechanics
- [ ] Boost mechanics
- [ ] Treasury integration

### Phase 5: UI/UX

- [ ] Main message rendering
- [ ] Fancy display states
- [ ] Button interaction handling
- [ ] Feed message system

### Phase 6: Polish

- [ ] Error handling
- [ ] Message cleanup
- [ ] Performance optimization
- [ ] Balance testing

---

## Open Questions

1. **Battle Suggestion Algorithm:** What algorithm should be used to select 3 battle suggestions per town?
   answer: random for first version
2. **Town Naming:** How are town names assigned/chosen?
   answer: town names should be looked up using a spaceDapp instance when towns are first created
3. **Treasury Approval Flow:** Exact UI flow for space treasury approval?
   answer: just an interaction request with approve and cancel buttons (no actual money will move in the mvp)
4. **Tick Timing:** How long should each tick be (in seconds/minutes)?
   answer: 10 seconds, this is already set up in package.json
5. **Initial Resources:** What resources does a new town start with?
   no resources, just the coin allocation in the town levels definition
6. **Error Recovery:** How should errors be communicated and recovered from?
   if applicable, add the latest error along with the current tick to the error property of the town
   if during a webhook request, send the error to the channel as a message
   in all cases, log the error to the console

---

## Notes

- All monetary values stored in cents, displayed in dollars (2 decimal places)
- Hard-coded ETH price: $3,318.35
- Rewards cooldown: 2 ticks after collection
- Main message updates: After every interaction and tick
- User messages: Deleted when engaged in a town
