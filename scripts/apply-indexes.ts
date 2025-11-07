/**
 * Apply database indexes for performance optimization
 *
 * This script reads the SQL from drizzle/add-indexes.sql and applies it to the database.
 * Run with: bun run db:indexes
 */

import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

async function applyIndexes() {
  console.log("🔧 Applying database indexes...\n");

  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error("❌ ERROR: DATABASE_URL environment variable is not set");
    console.error("\nPlease set DATABASE_URL in your .env file or environment.\n");
    process.exit(1);
  }

  try {
    // Read SQL file
    const sqlPath = join(process.cwd(), "drizzle", "add-indexes.sql");
    const sql = readFileSync(sqlPath, "utf-8");

    console.log(`📄 Reading SQL from: ${sqlPath}`);
    console.log(`🔗 Connecting to database...\n`);

    // Create postgres connection
    const db = postgres(process.env.DATABASE_URL);

    // Split SQL into individual statements and execute each
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`📝 Executing ${statements.length} CREATE INDEX statements...\n`);

    for (const statement of statements) {
      try {
        await db.unsafe(statement);
      } catch (error) {
        // Ignore "already exists" errors
        if (error instanceof Error && error.message.includes("already exists")) {
          // Silent - index already exists, which is fine
          continue;
        }
        throw error;
      }
    }

    console.log("✅ Database indexes applied successfully!\n");
    console.log("Indexes created:");
    console.log("  • Towns: address, channel_id, level");
    console.log("  • Resources: town_address, type, composite");
    console.log("  • Actions: town_address, tick, type, composite");
    console.log("  • Battles: attacker, defender, end, cooldown_end");
    console.log("  • Shields: town_address, end, cooldown_end");
    console.log("  • Boosts: town_address, end, cooldown_end");
    console.log("  • Main messages: channel_id");
    console.log("  • Town errors: town_address, tick\n");

    // Close connection
    await db.end();

    console.log("🎉 Done! Your database is now optimized for performance.\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ ERROR: Failed to apply indexes\n");

    if (error instanceof Error) {
      console.error(`Details: ${error.message}\n`);

      // Provide helpful hints based on error type
      if (error.message.includes("connect")) {
        console.error("💡 Tip: Make sure your database is running.");
        console.error("   Run: bun run docker:up\n");
      } else if (error.message.includes("already exists")) {
        console.error("💡 Note: Some indexes may already exist. This is normal.");
        console.error("   The script creates indexes with 'IF NOT EXISTS' to be safe.\n");
      }
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

// Run the script
applyIndexes();
