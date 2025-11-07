# Towns Wars ⚔️🏰

A text-based multiplayer strategy game built on the Towns bot framework. Build your town, gather resources, train troops, and battle other players for treasury supremacy!

## Game Overview

Towns Wars is an interactive multiplayer game where players:
- 🏰 Build and upgrade their towns through multiple levels
- ⛏️ Construct resource buildings (cannons, barracks, mines)
- 💰 Collect coins and recruit troops
- ⚔️ Attack other towns to win their treasury
- 🛡️ Defend against invasions with shields and defenses
- 📈 Progress through town levels to unlock new abilities

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (JavaScript runtime)
- [Docker](https://www.docker.com/) (for PostgreSQL database)
- Towns app private data and JWT secret

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd townswars

# 2. Install dependencies
bun install

# 3. Set up environment variables
cp .env.sample .env
# Edit .env and add your credentials:
# - APP_PRIVATE_DATA (from Towns)
# - JWT_SECRET (your secret key)
# - DATABASE_URL (pre-configured for local Docker)

# 4. Start the database
bun run docker:up

# 5. Push database schema
bun run db:push

# 6. Apply database indexes (for performance)
bun run db:indexes

# 7. Start the bot server
bun run dev

# 8. In another terminal, start the tick system
bun run tick:watch
```

Your bot is now running! 🎉

---

## How to Play

### Getting Started

1. **Join the game**: Type `/engage` in a Towns channel
2. **Approve town upgrade**: Click the [Approve] button to level up to Level 1
3. **Wait for next tick**: The game updates every 10 seconds
4. **Build resources**: Use buttons to buy mines, barracks, and cannons
5. **Collect rewards**: Click collection buttons when resources accumulate rewards
6. **Attack enemies**: When you have troops and coins, attack other towns!

### Game Loop

```
Build Resources → Collect Rewards → Train Troops → Attack Towns → Win Treasury → Upgrade → Repeat
```

### Commands

- `/engage` - Join the game and create your town
- `/help` - Show help information
- `/time` - Show current server time

**Note**: Attacks are initiated using the attack buttons in your main message display, not slash commands.

### Resources

| Resource | Type | Generates | Used For |
|----------|------|-----------|----------|
| **Cannon** | Defense | Nothing | Defending against attacks (DPS) |
| **Barracks** | Production | Troops | Training units for attacks |
| **Mine** | Production | Coins | Currency for buying/upgrading |

### Combat System

**Attacking**:
1. Collect troops from barracks
2. Have enough coins for attack cost (50 at level 1)
3. Click one of the attack buttons shown in your main message
4. Battle resolves automatically over multiple ticks (10 ticks = 100 seconds)
5. Win treasury from enemies or lose your penalty stake

**Defending**:
- Your cannons and other defenses provide DPS
- Purchase shields for temporary invulnerability
- Battle cooldown protects you after each fight

---

## Architecture

### Project Structure

```
townswars/
├── src/
│   ├── game/               # Game logic
│   │   ├── action-executor.ts      # Execute player actions
│   │   ├── action-service.ts       # Action queue management
│   │   ├── battle-service.ts       # Battle calculation & resolution
│   │   ├── cleanup-service.ts      # Expired entity cleanup
│   │   ├── command-handlers.ts     # Slash command handlers
│   │   ├── feed-service.ts         # Global feed messages
│   │   ├── game-state-service.ts   # Global tick counter
│   │   ├── main-message-service.ts # Main message updates
│   │   ├── message-service.ts      # UI rendering & fancy displays
│   │   ├── resource-service.ts     # Resource rewards & collection
│   │   ├── static-data.ts          # Game balance tables
│   │   ├── town-service.ts         # Town CRUD operations
│   │   └── town-state-service.ts   # Town state queries
│   ├── db/
│   │   ├── index.ts        # Drizzle database setup
│   │   └── schema.ts       # Database schema
│   ├── tests/
│   │   └── static-data.test.ts     # Game balance validation
│   ├── index.ts            # Bot server & webhook handlers
│   ├── commands.ts         # Slash command definitions
│   └── tick.ts             # Game loop tick processor
├── OFFICIAL_TOWNS_WARS.spec.md    # Full game specification
├── COMPREHENSIVE_COMPLETION_PLAN.spec.md  # Development roadmap
├── FANCY_DISPLAYS_TEST_GUIDE.md   # Manual testing guide
├── TESTING.md              # Testing documentation
├── AGENTS.md               # AI agent instructions
└── README.md               # This file
```

### Database Schema

**Core Tables**:
- `towns` - Player towns with stats (level, coins, troops, treasury)
- `resources` - Buildings owned by towns (type, level, rewards)
- `battles` - Combat encounters between towns
- `shields` - Defense buffs with duration and cooldown
- `boosts` - Production multipliers
- `actions` - Queued player actions for next tick
- `game_state` - Global tick counter
- `main_messages` - Message tracking for updates
- `town_errors` - Error logging per town

### Game Loop (Tick System)

Every 10 seconds, the tick system:
1. Increments global tick counter
2. Cleans up expired battles, shields, and boosts
3. For each town:
   - Updates resource reward banks
   - Executes queued actions (buy, upgrade, collect, etc.)
   - Processes battle initiations
   - Resolves completed battles
   - Updates main message display
4. Broadcasts global feed messages

---

## Development

### Available Scripts

```bash
# Development
bun run dev              # Start bot server with hot reload
bun run tick             # Run single tick manually
bun run tick:watch       # Run tick system continuously (every 10s)

# Database
bun run docker:up        # Start PostgreSQL in Docker
bun run docker:down      # Stop PostgreSQL container
bun run db:push          # Push schema changes to database
bun run db:indexes       # Apply performance indexes
bun run db:studio        # Open Drizzle Studio (database GUI)

# Testing
bun test                 # Run all tests
bun test --watch         # Run tests in watch mode

# Production
bun run start            # Start bot server (production)
bun run build            # Build for production
```

### Database Management

#### Development vs Production

**Development** (current setup):
```bash
# Edit src/db/schema.ts, then:
bun run db:push        # Directly sync schema (fast, no migrations)
bun run db:indexes     # Apply performance indexes
```

**Production** (recommended):
```bash
# 1. Edit src/db/schema.ts
# 2. Generate migration file:
bun run db:generate    # Creates SQL file in drizzle/

# 3. Review generated SQL, commit to git
# 4. On production server:
bun run db:migrate     # Apply migrations safely
bun run db:indexes     # Apply performance indexes
```

**Why the difference?**
- `db:push` = Fast but can lose data (dev only)
- `db:generate` + `db:migrate` = Safe, versioned, reviewable (production)

**View data**:
```bash
# Open Drizzle Studio
bun run db:studio
# Visit http://localhost:4983

# Or use psql
docker exec townswars-postgres psql -U townswars -d townswars
```

**Common queries**:
```sql
-- View all towns
SELECT address, name, level, coins, troops, treasury FROM towns;

-- View current tick
SELECT current_tick FROM game_state;

-- View active battles
SELECT * FROM battles WHERE end > (SELECT current_tick FROM game_state);

-- Reset game state
TRUNCATE towns, resources, battles, shields, boosts, actions, main_messages CASCADE;
```

### Adding New Features

1. **New Resource Type**: Add to `RESOURCE_DEFINITIONS_TABLE` in `static-data.ts`
2. **New Action Type**: Add enum to `ActionType`, create handler in `action-executor.ts`
3. **UI Changes**: Modify `message-service.ts` for rendering
4. **Game Balance**: Update tables in `static-data.ts`, run tests

---

## Testing

### Automated Tests

```bash
# Run static data validation tests
bun test src/tests/static-data.test.ts
```

**Test Coverage**:
- ✅ Resource level linearity (20 tests, 337 assertions)
- ✅ Resource limits progression
- ✅ Max level constraints
- ✅ Town level progression
- ✅ Game balance validation

### Manual Testing

See [FANCY_DISPLAYS_TEST_GUIDE.md](./FANCY_DISPLAYS_TEST_GUIDE.md) for comprehensive testing of:
- All 8 fancy display states
- Battle system end-to-end
- Resource production and collection
- Level up flow
- Shield and boost mechanics

---

## Game Balance

### Town Levels

| Level | Treasury Bonus | Coin Allocation | Max Troops | Attack Cost |
|-------|----------------|-----------------|------------|-------------|
| 1 | $10.00 | 1000 | 50 | 50 |
| 2 | $25.00 | 2000 | 75 | 75 |
| 3 | $50.00 | 3000 | 100 | 100 |

### Resource Costs (Level 0 → 1)

| Resource | Level 0 Cost | Level 1 Cost |
|----------|--------------|--------------|
| Cannon | 20 coins | 38 coins |
| Barracks | 25 coins | 48 coins |
| Mine | 25 coins | 48 coins |

### Battle Economics

- **Potential Reward**: 50% of defender's treasury
- **Attack Penalty**: 25% of attacker's treasury (if defeated)
- **Troop Loss**: Attacker loses all troops regardless of outcome
- **Partial Victory**: Reward scales with damage percentage

---

## Troubleshooting

### Bot Not Responding

**Check**:
1. Is the bot server running? (`bun run dev`)
2. Is the database running? (`docker ps | grep postgres`)
3. Are environment variables set correctly? (check `.env`)
4. Check console for errors

### Tick System Not Running

**Check**:
1. Is tick process running? (`bun run tick:watch`)
2. Check console for errors in tick output
3. Verify database connection

### Display Not Updating

**Check**:
1. Are ticks processing? (watch console logs)
2. Is main message being updated? (check database: `SELECT * FROM main_messages`)
3. Check for errors in action execution

### Database Issues

**Reset everything**:
```bash
# Stop and remove database
bun run docker:down

# Start fresh
bun run docker:up
bun run db:push

# Re-engage in game
# Type /engage in your channel
```

---

## Deployment

### Environment Variables

Production requires:
```bash
APP_PRIVATE_DATA=<your-towns-app-private-data>
JWT_SECRET=<your-jwt-secret>
DATABASE_URL=postgresql://user:pass@host:5432/dbname
PORT=5123
```

### Production Checklist

- [ ] Database is persistent (not Docker local)
- [ ] Environment variables configured
- [ ] **Database schema migrated** (`bun run db:generate` locally, `bun run db:migrate` on server)
- [ ] **Database indexes applied** (`bun run db:indexes`)
- [ ] Bot server running (`bun run start`)
- [ ] Tick system running (cron job or service)
- [ ] Database backups configured
- [ ] Error monitoring enabled
- [ ] Performance monitoring enabled

**⚠️ Never use `db:push` in production!** It can cause data loss. Always use the migration workflow.

### Tick System in Production

**Option 1: Systemd Service** (Linux)
```ini
[Unit]
Description=Towns Wars Tick System

[Service]
Type=simple
WorkingDirectory=/path/to/townswars
ExecStart=/usr/bin/bun run tick:watch
Restart=always

[Install]
WantedBy=multi-user.target
```

**Option 2: Cron Job**
```cron
# Run tick every 10 seconds (requires wrapper script)
* * * * * cd /path/to/townswars && /usr/bin/bun run tick
* * * * * sleep 10 && cd /path/to/townswars && /usr/bin/bun run tick
# ... repeat for 10, 20, 30, 40, 50 seconds
```

**Option 3: PM2** (Node.js Process Manager)
```bash
pm2 start "bun run tick:watch" --name townswars-tick
pm2 save
pm2 startup
```

---

## Contributing

### Code Style

- TypeScript strict mode enabled
- Use `async/await` for asynchronous operations
- Document all public functions with JSDoc
- Follow existing patterns in codebase

### Adding Tests

Add tests to `src/tests/` directory:
```typescript
import { describe, it, expect } from "bun:test";

describe("Feature Name", () => {
  it("should do something", () => {
    expect(result).toBe(expected);
  });
});
```

---

## Credits

Built with:
- [Towns Bot Framework](https://github.com/towns-protocol/towns)
- [Bun](https://bun.sh/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [PostgreSQL](https://www.postgresql.org/)
- [Hono](https://hono.dev/)

Game designed and implemented following the [OFFICIAL_TOWNS_WARS.spec.md](./OFFICIAL_TOWNS_WARS.spec.md) specification.

---

## License

[Add your license here]

---

## Support

For issues, questions, or feedback:
- Open an issue on GitHub
- Check [TESTING.md](./TESTING.md) for testing documentation
- Review [COMPREHENSIVE_COMPLETION_PLAN.spec.md](./COMPREHENSIVE_COMPLETION_PLAN.spec.md) for development roadmap

---

**Happy gaming! ⚔️🏰**
