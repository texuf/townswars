# Database Management Guide

Complete guide to managing database schema changes in Towns Wars.

---

## Quick Reference

| Command | When to Use | Safe for Production? |
|---------|-------------|---------------------|
| `bun run db:push` | Development only | ❌ NO - Can lose data |
| `bun run db:generate` | Before deploying schema changes | ✅ YES - Creates migration files |
| `bun run db:migrate` | Apply migrations in production | ✅ YES - Safe, tracked |
| `bun run db:indexes` | After schema setup | ✅ YES - Performance optimization |
| `bun run db:studio` | Browse database data | ✅ YES - Read-only viewer |

---

## Development Workflow

### Day-to-Day Development

```bash
# 1. Edit src/db/schema.ts
# 2. Sync to local database
bun run db:push

# 3. Apply indexes (optional, but recommended)
bun run db:indexes

# 4. View data if needed
bun run db:studio
```

**Why `db:push`?**
- ✅ Fast - instant sync
- ✅ No migration files to manage
- ✅ Perfect for rapid iteration
- ❌ Can lose data if you rename/delete columns
- ❌ No rollback capability

---

## Production Workflow

### First-Time Setup

```bash
# On your local machine:
bun run db:generate    # Generate initial migration

# Commit the migration files:
git add drizzle/
git commit -m "Initial database migration"
git push

# On production server:
bun run db:migrate     # Apply migration
bun run db:indexes     # Apply indexes
```

### Making Schema Changes

```bash
# 1. On your local machine:
#    Edit src/db/schema.ts (add/modify columns, tables, etc.)

# 2. Generate migration file:
bun run db:generate

# Output:
# ✅ Generated drizzle/0001_add_user_avatar.sql

# 3. Review the generated SQL:
cat drizzle/0001_add_user_avatar.sql

# Example output:
# ALTER TABLE "users" ADD COLUMN "avatar_url" text;

# 4. Test locally (optional but recommended):
bun run db:migrate

# 5. Commit migration files:
git add drizzle/
git commit -m "Add user avatar column"
git push

# 6. On production server:
git pull
bun run db:migrate     # Apply new migration
```

**Why this workflow?**
- ✅ Safe - migrations are reviewed before running
- ✅ Versioned - all changes tracked in git
- ✅ Rollback capable - can undo changes
- ✅ Team-friendly - everyone sees schema changes
- ✅ Production-safe - no accidental data loss

---

## Common Scenarios

### Scenario 1: Add a New Column

**Schema change:**
```typescript
// src/db/schema.ts
export const towns = pgTable("towns", {
  address: text("address").primaryKey(),
  name: text("name").notNull(),
  // NEW: Add last login time
  lastLoginAt: timestamp("last_login_at"),
});
```

**Steps:**
```bash
# Development:
bun run db:push          # Quick sync

# Production:
bun run db:generate      # Creates migration
git add drizzle/ && git commit -m "Add lastLoginAt to towns"
# Deploy, then:
bun run db:migrate       # Apply on server
```

---

### Scenario 2: Rename a Column

**⚠️ Warning**: Renaming requires special care!

**Option A: Using migration (safe)**
```bash
# 1. Generate migration
bun run db:generate

# 2. Edit the generated SQL to use ALTER TABLE ... RENAME
# Change from:
#   ALTER TABLE "towns" ADD COLUMN "new_name" text;
# To:
#   ALTER TABLE "towns" RENAME COLUMN "old_name" TO "new_name";

# 3. Apply migration
bun run db:migrate
```

**Option B: Two-step process (safest for production)**
```bash
# Step 1: Add new column
# - Add new column to schema
# - Deploy code that writes to BOTH columns
# - Wait for data to sync

# Step 2: Remove old column
# - Remove old column from schema
# - Deploy code that only uses new column
# - Drop old column
```

---

### Scenario 3: Delete a Column/Table

**⚠️ Warning**: Always backup before deleting!

```bash
# 1. Backup production database first!
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. Remove from schema.ts

# 3. Generate migration
bun run db:generate

# 4. Review SQL carefully!
cat drizzle/000X_drop_column.sql

# 5. Test on staging/copy of production

# 6. Apply to production
bun run db:migrate
```

---

## Troubleshooting

### "relation already exists"

This means you're trying to create something that exists.

**Solution:**
```bash
# If using db:push:
# Just run it again, it will sync to current schema

# If using db:migrate:
# Check drizzle/__drizzle_migrations table
# Delete the row for the failed migration
# Fix the SQL file
# Run db:migrate again
```

### "column does not exist"

Your code expects a column that doesn't exist in the database.

**Solution:**
```bash
# Development:
bun run db:push          # Sync schema

# Production:
# You forgot to run migrations!
bun run db:migrate
```

### Lost data after `db:push`

**Prevention:** Never use `db:push` in production!

**Recovery:** Restore from backup
```bash
# Restore from backup
psql $DATABASE_URL < backup.sql
```

---

## Migration Files Explained

### Where are they?

```
drizzle/
├── 0000_initial_schema.sql
├── 0001_add_user_avatar.sql
├── 0002_add_indexes.sql
└── meta/
    ├── _journal.json
    └── 0000_snapshot.json
```

### What's in a migration file?

```sql
-- drizzle/0001_add_user_avatar.sql
ALTER TABLE "users" ADD COLUMN "avatar_url" text;
ALTER TABLE "users" ADD COLUMN "bio" text;
```

### How are they tracked?

Drizzle Kit maintains a `__drizzle_migrations` table:

```sql
SELECT * FROM __drizzle_migrations;

-- Output:
-- id | hash | created_at
-- 1  | abc123 | 2024-01-01 10:00:00
-- 2  | def456 | 2024-01-15 14:30:00
```

Only runs migrations that haven't been applied yet.

---

## Best Practices

### ✅ DO

- **Use `db:push` in development** for speed
- **Use `db:generate` + `db:migrate` in production** for safety
- **Review generated SQL** before committing
- **Backup before destructive changes** (drops, renames)
- **Test migrations on staging** before production
- **Commit migration files to git**
- **Run `db:indexes` after migrations**

### ❌ DON'T

- **Never use `db:push` in production**
- **Don't edit migration files after they're applied**
- **Don't skip migrations** - they must run in order
- **Don't delete migration files** - breaks migration history
- **Don't rename columns directly** - use two-step process
- **Don't forget to commit drizzle/ directory**

---

## Emergency Procedures

### Rollback a Migration

```bash
# Option 1: Manual rollback
# Write the reverse SQL manually
psql $DATABASE_URL << EOF
ALTER TABLE "users" DROP COLUMN "avatar_url";
EOF

# Remove migration from tracking table
psql $DATABASE_URL << EOF
DELETE FROM __drizzle_migrations WHERE id = X;
EOF

# Option 2: Restore from backup
psql $DATABASE_URL < backup_before_migration.sql
```

### Reset Local Database

```bash
# Nuclear option - start fresh
bun run docker:down
bun run docker:up
bun run db:push
bun run db:indexes
```

### Check Migration Status

```bash
# See which migrations have been applied
psql $DATABASE_URL -c "SELECT * FROM __drizzle_migrations ORDER BY id;"
```

---

## Additional Resources

- [Drizzle Kit Docs](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- Project README: `README.md`
- Launch Checklist: `LAUNCH_CHECKLIST.md`
