# Fancy Displays Manual Testing Guide

This guide walks you through testing all 8 fancy display states in Towns Wars.

---

## Prerequisites

### 1. Start the Server

```bash
# Terminal 1: Start the database
bun run docker:up

# Terminal 2: Start the bot server
bun run dev

# Terminal 3: Run the tick system (in watch mode)
bun run tick:watch
```

### 2. Access Two Towns Channels

You'll need to test from **two different towns** to see both attacker and defender perspectives.

- **Option A**: Two different channels in the same space
- **Option B**: Two different spaces (recommended for isolation)

---

## Test Scenario Overview

We'll test all 8 display states in sequence:

1. ✅ **Level Up Display** - Approve initial town level
2. ⏳ **Pending Battle** - Queue an attack
3. ⚔️ **Battle In Progress (Attacker)** - Watch your attack
4. 🛡️ **Battle In Progress (Defender)** - Enemy perspective
5. 🎉 **Victory (Attacker)** - Win the battle
6. 🛡️ **Defended (Defender)** - Lose the battle
7. ☠️ **Defeat (Attacker)** - Lose an attack (optional)
8. ⚠️ **Breached (Defender)** - Lose a defense (optional)

---

## Test Setup (Both Towns)

### Town A Setup (Attacker)

#### Step 1: Create Town A
```
Channel A: /engage
```

**Expected Display**:
```
🏰 **[Random Name]** - Level 0 → 1

📋 **Treasury Approval Required**
...
[Approve] [Cancel]
```

#### Step 2: Approve Level Up
Click **[Approve]** button

**Expected Display (Priority 8 - New Level Up)**:
```
╔═══════════════════════════════════════════════╗
║        🏰  TOWN UPGRADED!  🏰                 ║
╚═══════════════════════════════════════════════╝

**[Town Name]** has reached **Level 1**!
      ⬆️
     🏰🏰
    ▓▓▓▓▓▓
   ████████
...
```

✅ **Test Result**: _______________________

**Wait for next tick (10 seconds)** - Display should return to standard view.

#### Step 3: Build Resource Production

**Buy a Mine**:
- Click **[Buy mine (25c)]** button
- Wait for next tick
- You should see channel message: "You bought a new mine (1/1)"

**Buy a Barracks**:
- Click **[Buy barracks (25c)]** button
- Wait for next tick
- You should see channel message: "You bought a new barracks (1/1)"

#### Step 4: Collect Resources

**Wait ~30 seconds (3 ticks)** for resources to accumulate rewards.

**Collect Coins**:
- You should see button: **[Collect X coins from mine #1]**
- Click it, wait for next tick
- Channel message: "You collected X coins"

**Collect Troops** (repeat until you have 10+ troops):
- Click **[Collect X troops from barracks #1]**
- Wait for tick
- Repeat 2-3 times until troops ≥ 10

**Check Status**:
```
⚔️ Troops: 10/50
🪙 Coins: 950
```

You now have troops and coins to attack!

---

### Town B Setup (Defender)

#### Step 1: Create Town B
```
Channel B: /engage
```

#### Step 2: Approve Level Up
Click **[Approve]** button

Same **New Level Up** display should show.

#### Step 3: Build Defenses (Optional)

To make battles more interesting, you can build cannons:

- Click **[Buy cannon (20c)]**
- Wait for next tick
- Optionally upgrade: **[Upgrade cannon #1 to lvl 1 (38c)]**

---

## Test Execution

### Test 1: Pending Battle Display ⏳

**From Town A (Attacker)**:

#### Step 1: Get Town B's Address

From Channel B, check the database:
```bash
docker exec townswars-postgres psql -U townswars -d townswars -c "SELECT address, name FROM towns LIMIT 2;"
```

Copy Town B's address (starts with `0x...`)

#### Step 2: Queue Attack
```
Channel A: /attack <Town-B-address>
```

**Expected**: Confirmation message
```
✓ Queued attack on [Town B Name] for next tick

⚔️ Your 10 troops will attack their defenses!
```

#### Step 3: Check Main Message (before next tick)

**Expected Display (Priority 1 - Pending Battle)**:
```
╔═══════════════════════════════════════════════╗
║        ⚔️  PREPARING FOR BATTLE  ⚔️           ║
╚═══════════════════════════════════════════════╝

**[Town A]** is preparing to attack **[Town B]**!

      🏰                    🏰
     /Tow/                 /Tow/
    ▓▓▓▓                   ▓▓▓▓

⚔️ **Your troops march to war...**
🎯 Target: [Town B] (Level 1)
⏱️ Battle begins next tick!
```

✅ **Test Result**: _______________________

**Wait for next tick** - Battle will begin!

---

### Test 2: Battle In Progress (Attacker View) ⚔️

**After next tick**, check Channel A main message.

**Expected Display (Priority 2 - Battle In Progress Attacker)**:
```
╔═══════════════════════════════════════════════╗
║        ⚔️  ATTACKING [TOWN B]  ⚔️             ║
╚═══════════════════════════════════════════════╝

     🏹🏹🏹              🏰
    /|\  /|\           ▓▓▓▓
   / | \/ | \          ████
     YOUR TROOPS      THEIR WALLS

💰 **Potential Gain:** $X.XX
⚠️ **At Risk:** $X.XX

⏱️ Battle ends in **10 ticks** (100s)
🎲 Your fate is being decided...
```

✅ **Test Result**: _______________________

**Note the countdown** - it should decrease each tick:
- Tick 1: "10 ticks (100s)"
- Tick 2: "9 ticks (90s)"
- etc.

---

### Test 3: Battle In Progress (Defender View) 🛡️

**Simultaneously**, check Channel B main message.

**Expected Display (Priority 3 - Battle In Progress Defender)**:
```
╔═══════════════════════════════════════════════╗
║           🛡️  UNDER ATTACK  🛡️               ║
╚═══════════════════════════════════════════════╝

   🏰              🏹🏹🏹
  ▓▓▓▓            /|\  /|\
  ████           / | \/ | \
YOUR WALLS      THEIR TROOPS

⚠️ **[Town A]** is attacking!

💰 **Potential Gain:** $X.XX
⚠️ **At Risk:** $X.XX

⏱️ Battle ends in **10 ticks** (100s)
🛡️ Your defenses are holding...
```

✅ **Test Result**: _______________________

**Note**: Rewards/penalties are reversed from attacker's view.

---

### Test 4: Global Feed Messages 📢

**Check both channels** during battle start.

**Expected in ALL channels**:
```
📢 [Town A] is attacking [Town B] (potential gain: $X.XX, at risk: $X.XX)
```

✅ **Test Result**: _______________________

---

### Test 5: Battle Summary - Victory/Defeat 🎉☠️

**Wait for 10 ticks (~100 seconds)** for battle to complete.

#### If Town A Wins:

**Channel A (Attacker) - Priority 4**:
```
╔═══════════════════════════════════════════════╗
║            🎉  VICTORY!  🎉                   ║
╚═══════════════════════════════════════════════╝

You demolished **[Town B]**!

      🏹                ☠️
     /|\              ████
    / | \            (ruins)

💰 **Gained:** $X.XX
🎯 **Damage:** XX% of defenses destroyed

⚔️ Your troops have returned victorious!
```

✅ **Test Result**: _______________________

**Channel B (Defender) - Priority 7**:
```
╔═══════════════════════════════════════════════╗
║           ⚠️  BREACHED  ⚠️                    ║
╚═══════════════════════════════════════════════╝

Your defenses were defeated by **[Town A]**

      🏰                🏹
     ☠️☠️              /|\
   (breached)         / | \

💸 **Lost:** $X.XX
🎯 **Damage:** XX% of defenses destroyed
```

✅ **Test Result**: _______________________

#### If Town A Loses:

**Channel A (Attacker) - Priority 5**:
```
╔═══════════════════════════════════════════════╗
║             ☠️  DEFEAT  ☠️                    ║
╚═══════════════════════════════════════════════╝

You lost the attack on **[Town B]**

      ☠️                 🏰
    (fallen)           ▓▓▓▓
                       ████

💸 **Lost:** $X.XX
⚔️ Your troops were destroyed.
```

✅ **Test Result**: _______________________

**Channel B (Defender) - Priority 6**:
```
╔═══════════════════════════════════════════════╗
║          🛡️  DEFENDED!  🛡️                   ║
╚═══════════════════════════════════════════════╝

You beat back **[Town A]**!

      🏰                ☠️
     ▓▓▓▓            (fallen)
     ████

💰 **Gained:** $X.XX
🛡️ Your defenses held strong!
```

✅ **Test Result**: _______________________

---

### Test 6: Global Feed Message (Battle End) 📢

**Expected in all channels** (based on outcome):

**If Attacker Won**:
```
📢 [Town A] demolished [Town B], gained $X.XX
```

**If Defender Won**:
```
📢 [Town B] beat back [Town A], gained $X.XX
```

✅ **Test Result**: _______________________

---

### Test 7: Return to Standard Display

**Wait one more tick** after battle summary.

Both towns should return to **standard display**:
```
🏰 **[Town Name]** - Level 1

💰 Treasury: $X.XX
🪙 Coins: XXX
⚔️ Troops: X/50
...
```

✅ **Test Result**: _______________________

---

## Additional Tests

### Test 8: Battle Cooldown Protection

After a battle ends, both towns are in cooldown.

**Try to attack again immediately**:
```
Channel A: /attack <Town-B-address>
```

**Expected in console logs**:
```
✗ [Town A]: Cannot attack [Town B] (shielded or in battle)
```

The attack should **not** create a battle.

✅ **Test Result**: _______________________

---

### Test 9: Multiple Sequential Battles

To test all 4 battle outcomes, you need to create scenarios where:

1. **Strong attacker vs weak defender** = Attacker victory
2. **Weak attacker vs strong defender** = Attacker defeat

**Modify troop/defense balance**:
- Give Town A 50 troops (collect more from barracks)
- Give Town B 5 cannons (buy and upgrade)

**Run multiple battles** and verify all 4 summary displays appear correctly.

---

## Database Inspection During Tests

### Check Battle Records
```bash
docker exec townswars-postgres psql -U townswars -d townswars -c "SELECT * FROM battles ORDER BY start DESC LIMIT 1;"
```

**Expected fields**:
- `attacker_address`, `defender_address`
- `start`, `end`, `cooldown_end`
- `reward`, `penalty`, `success`, `percentage`

### Check Treasury Changes
```bash
docker exec townswars-postgres psql -U townswars -d townswars -c "SELECT name, treasury, coins, troops FROM towns;"
```

**Verify**:
- Attacker lost troops (should be 0)
- Treasury transferred correctly
- Amounts match battle summary displays

---

## Test Results Summary

| Display State | Priority | Test Status | Notes |
|---------------|----------|-------------|-------|
| Level Up | 8 | ☐ Pass ☐ Fail | |
| Pending Battle | 1 | ☐ Pass ☐ Fail | |
| Battle In Progress (Attacker) | 2 | ☐ Pass ☐ Fail | |
| Battle In Progress (Defender) | 3 | ☐ Pass ☐ Fail | |
| Victory (Attacker) | 4 | ☐ Pass ☐ Fail | |
| Defeated (Defender) | 7 | ☐ Pass ☐ Fail | |
| Defeat (Attacker) | 5 | ☐ Pass ☐ Fail | |
| Defended (Defender) | 6 | ☐ Pass ☐ Fail | |

---

## Common Issues & Troubleshooting

### Issue: Display Not Updating

**Problem**: Main message stuck on old display

**Solution**:
- Check tick system is running (`bun run tick:watch`)
- Check console for errors
- Verify database connection

### Issue: Battle Not Starting

**Problem**: Pending battle doesn't transition to in-progress

**Possible Causes**:
- Target has active shield
- Target is in another battle
- Target is in cooldown

**Debug**:
```bash
# Check shields
docker exec townswars-postgres psql -U townswars -d townswars -c "SELECT * FROM shields WHERE town_address='<target-address>';"

# Check battles
docker exec townswars-postgres psql -U townswars -d townswars -c "SELECT * FROM battles WHERE defender_address='<target-address>';"
```

### Issue: ASCII Art Looks Wrong

**Problem**: Box characters or emojis don't display correctly

**Solution**:
- Ensure your terminal/app supports UTF-8
- Use a monospace font
- Some apps may not render box characters (╔═╗) perfectly

### Issue: Wrong Display State Showing

**Problem**: Standard display shows instead of fancy display

**Debug**:
- Check current tick vs battle timing
- Verify state detection logic in console logs
- Check database for battle/shield/boost records

---

## Success Criteria

All tests pass if:

✅ All 8 fancy displays render correctly
✅ ASCII art is readable and aligned
✅ Countdown timers work (decrease each tick)
✅ Rewards/penalties shown correctly
✅ Displays transition properly (fancy → standard)
✅ Both attacker and defender see correct perspectives
✅ Global feed messages broadcast to all channels
✅ Treasury values update correctly

---

## Next Steps After Testing

Based on test results:

- **All Pass**: Proceed to Phase 5 (Treasury integration)
- **Some Fail**: Fix issues and re-test
- **Visual Issues**: Adjust ASCII art or formatting
- **Logic Issues**: Debug state detection or timing

---

**Happy Testing! ⚔️🏰**
