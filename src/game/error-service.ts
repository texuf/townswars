import { eq, lt } from "drizzle-orm";
import { db, townErrors } from "../db";

/**
 * Log an error for a specific town
 * This records errors in the database for debugging and user visibility
 */
export async function logTownError(
  townAddress: string,
  message: string,
  tick: number
): Promise<void> {
  try {
    await db.insert(townErrors).values({
      townAddress,
      message,
      tick,
    });
  } catch (error) {
    // If we can't even log the error, just console.error it
    console.error(
      `Failed to log error for town ${townAddress}:`,
      message,
      error
    );
  }
}

/**
 * Get recent errors for a town
 * Useful for debugging and showing users what went wrong
 */
export async function getTownErrors(
  townAddress: string,
  limit: number = 10
): Promise<Array<{ message: string; tick: number; createdAt: Date }>> {
  const errors = await db
    .select({
      message: townErrors.message,
      tick: townErrors.tick,
      createdAt: townErrors.createdAt,
    })
    .from(townErrors)
    .where(eq(townErrors.townAddress, townAddress))
    .orderBy(townErrors.createdAt)
    .limit(limit);

  return errors;
}

/**
 * Clear old errors for a town
 * Run this periodically to prevent the table from growing too large
 */
export async function clearOldErrors(daysOld: number = 7): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  await db
    .delete(townErrors)
    .where(lt(townErrors.createdAt, cutoffDate));
}
