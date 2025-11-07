# Towns Wars Testing Guide

## Prerequisites

1. **Database running:**
   ```bash
   bun run docker:up
   ```

2. **Environment variables configured:**
   - Copy `.env.sample` to `.env`
   - Set `APP_PRIVATE_DATA` (bot credentials)
   - Set `JWT_SECRET` (webhook security)
   - Set `DATABASE_URL` (should be pre-configured for local Docker)

3. **Database schema pushed:**
   ```bash
   bun run db:push
   ```

## Running the Bot

### Development Mode (with hot reload)
```bash
bun run dev
```

### Production Mode
```bash
bun run start
```

## Testing Features

### 1. Town Creation (`/engage`)

**Steps:**
1. In a Towns channel, type `/engage`
2. Bot should respond with welcome message
3. Bot should show main message with town status
4. Town should show level 0, requesting level 1
5. Treasury approval screen should appear

**Expected Output:**
```
⚔️ Welcome to Towns Wars!

Your town **[Random Name]** has been founded!

🏰 **[Town Name]** - Level 0 → 1

📋 **Treasury Approval Required**

To upgrade your town to level 1, you need to approve the Towns Bot
to withdraw up to $10.00 from your treasury.

[Approve] [Cancel]
```

**Initial State:**
- Level: 0
- Requested Level: 1
- Coins: 1000 (from level 1 coin allocation)
- Troops: 0
- Treasury: $0.00

### 2. Duplicate Engagement

**Steps:**
1. Type `/engage` again in the same channel
2. Should get message saying already engaged

**Expected Output:**
```
You're already engaged in Towns Wars! Check your town status below.
```

### 3. Tip Handling

**Steps:**
1. Send an ETH tip to a user who has engaged (created a town)
2. Bot should detect tip and convert to coins
3. Bot should update main message with new coin balance

**Tip Conversion:**
- $0.00 - $3.49: +90 coins
- $3.50 - $7.49: +490 coins
- $7.50+: +990 coins

**Expected Output:**
```
💰 Tip received! +[X] coins added to your town.
```

Main message should update showing new coin balance.

### 4. Message Deletion (Engaged Users)

**Steps:**
1. After engaging, send any regular message in the channel
2. Message should be immediately deleted by the bot

**Expected Behavior:**
- User messages in channel are deleted using `adminRemoveEvent`
- Bot has admin permissions to delete any message
- Engaged users interact only through the interactive buttons in their main message

## Database Inspection

### View all towns
```bash
docker exec townswars-postgres psql -U townswars -d townswars -c "SELECT address, name, level, coins, troops, treasury FROM towns;"
```

### View game state
```bash
docker exec townswars-postgres psql -U townswars -d townswars -c "SELECT * FROM game_state;"
```

### View main messages
```bash
docker exec townswars-postgres psql -U townswars -d townswars -c "SELECT channel_id, message_id FROM main_messages;"
```

### Clear all data (reset game)
```bash
docker exec townswars-postgres psql -U townswars -d townswars -c "TRUNCATE towns, resources, battles, shields, boosts, actions, main_messages, town_errors, game_state CASCADE;"
```

## Drizzle Studio (Database GUI)

```bash
bun run db:studio
```

Opens a web interface at http://localhost:4983 to browse and edit database tables.

## Tick System

The tick system runs every 10 seconds and handles:
- Incrementing global tick counter
- Cleaning up expired battles, shields, and boosts
- Updating resource rewards (adding rewardsPerTick to rewardsBank)
- Updating main messages for all towns
- TODO: Action execution (Phase 2)
- TODO: Battle processing (Phase 3)
- TODO: Battle suggestions (Phase 3)

**To run manually:**
```bash
bun run tick
```

**To run continuously (development):**
```bash
bun run tick:watch
```

This will execute the tick every 10 seconds automatically.

**What happens each tick:**
1. Global tick counter increments
2. All expired battles/shields/boosts are removed from database
3. For each town:
   - Resource rewards accumulate (if past cooldown)
   - Main message updates (if content changed)
4. Logs show progress and timing

**Example output:**
```
[2025-01-06T12:00:00.000Z] Tick starting...
  Current tick: 42
  ✓ Cleaned up expired battles, shields, and boosts
  Processing 5 towns...
[2025-01-06T12:00:00.123Z] Tick completed in 123ms
```

## Common Issues

### Database connection errors
- Ensure Docker container is running: `docker ps | grep townswars-postgres`
- Check DATABASE_URL in .env matches Docker configuration

### Bot not responding
- Verify APP_PRIVATE_DATA and JWT_SECRET are set correctly
- Check bot is running: `bun run dev` should show "Listening on port 5123"
- Verify webhook URL is accessible from Towns server

### Messages not updating
- Check console logs for errors
- Verify main message tracking in database: `SELECT * FROM main_messages;`
- Check bot has admin permissions in the space

## Next Steps

✅ **Phase 1 Complete: Core Infrastructure**
- [x] Database schema setup
- [x] Town creation and persistence
- [x] Basic bot framework integration
- [x] Tick system implementation

**Phase 2: Resource System**
- [ ] Resource purchase (buy action)
- [ ] Resource upgrade (upgrade action)
- [ ] Resource collection (collect action)
- [ ] Action queue system
- [ ] Enhanced main message UI with buttons

**Phase 3: Combat System**
- [ ] Battle calculation algorithm
- [ ] Battle initiation and processing
- [ ] Battle resolution
- [ ] Battle suggestions system
- [ ] Fancy battle messages (ASCII art)

**Phase 4: Progression System**
- [ ] Level up approval flow (with actual treasury interaction)
- [ ] Shield mechanics (purchase, activation, cooldown)
- [ ] Boost mechanics (purchase, activation, multiplier)
- [ ] Treasury integration
