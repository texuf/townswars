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
- Engaged users interact only through slash commands and buttons

### 5. Help Command

**Steps:**
1. Type `/help`
2. Should see help message with commands and instructions

**Expected Output:**
```
**Available Commands:**

• `/engage` - Join the Towns Wars game
• `/help` - Show this help message
• `/time` - Get the current time

**How to Play:**

1. Use `/engage` to create your town
2. Build resources (cannons, barracks, mines)
3. Collect coins and troops
4. Attack other towns to win their treasury!
```

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

## Tick System (Not Yet Implemented)

The tick system will run every 10 seconds and handle:
- Resource reward generation
- Battle progression
- Shield/boost expiration
- Action execution

**To run manually (once implemented):**
```bash
bun run tick
```

**To run continuously (development):**
```bash
bun run tick:watch
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

Phase 1 remaining:
- [ ] Tick system implementation

Phase 2:
- [ ] Resource system (buy, upgrade, collect)
- [ ] Resource rewards generation

Phase 3:
- [ ] Battle system
- [ ] Attack mechanics
- [ ] Battle resolution

Phase 4:
- [ ] Level up approval flow
- [ ] Shield/boost mechanics
- [ ] Treasury integration
