/**
 * Tick handler - runs periodic background tasks
 *
 * In production: Run via cron job with `bun tick`
 * In development: Run with `bun tick:watch` for automatic 10s intervals
 */

async function tick() {
  console.log("tick");

  // Add your periodic tasks here:
  // - Check for scheduled events
  // - Clean up expired data
  // - Send scheduled messages
  // - Update game state
  // - etc.
}

// Run the tick function
await tick();

// Exit cleanly
process.exit(0);
