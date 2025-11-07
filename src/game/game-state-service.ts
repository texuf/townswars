import { eq } from "drizzle-orm";
import { db, gameState, type GameState, type NewGameState } from "../db";

/**
 * Get the current game state (tick counter, etc.)
 * Creates the singleton record if it doesn't exist
 */
export async function getGameState(): Promise<GameState> {
  let [state] = await db.select().from(gameState).where(eq(gameState.id, 1));

  if (!state) {
    // Initialize game state if it doesn't exist
    const newState: NewGameState = {
      id: 1,
      currentTick: 0,
    };
    [state] = await db.insert(gameState).values(newState).returning();
  }

  return state;
}

/**
 * Get the current tick number
 */
export async function getCurrentTick(): Promise<number> {
  const state = await getGameState();
  return state.currentTick;
}

/**
 * Increment the tick counter
 */
export async function incrementTick(): Promise<GameState> {
  const state = await getGameState();
  const [updated] = await db
    .update(gameState)
    .set({
      currentTick: state.currentTick + 1,
      updatedAt: new Date(),
    })
    .where(eq(gameState.id, 1))
    .returning();

  return updated;
}

/**
 * Set the tick to a specific value (for testing)
 */
export async function setTick(tick: number): Promise<GameState> {
  const [updated] = await db
    .update(gameState)
    .set({
      currentTick: tick,
      updatedAt: new Date(),
    })
    .where(eq(gameState.id, 1))
    .returning();

  return updated;
}
