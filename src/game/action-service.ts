import { eq, and } from "drizzle-orm";
import { db, actions, type Action, type NewAction } from "../db";
import { ActionType } from "./static-data";

/**
 * Create a new action
 */
export async function createAction(
  townAddress: string,
  tick: number,
  type: ActionType,
  data?: any
): Promise<Action> {
  const newAction: NewAction = {
    townAddress,
    tick,
    type,
    data,
  };

  const [action] = await db.insert(actions).values(newAction).returning();
  return action;
}

/**
 * Get all pending actions for a town at a specific tick
 */
export async function getPendingActions(
  townAddress: string,
  currentTick: number
): Promise<Action[]> {
  return db
    .select()
    .from(actions)
    .where(
      and(eq(actions.townAddress, townAddress), eq(actions.tick, currentTick))
    );
}

/**
 * Get all actions for a town (regardless of tick)
 */
export async function getAllActionsForTown(
  townAddress: string
): Promise<Action[]> {
  return db.select().from(actions).where(eq(actions.townAddress, townAddress));
}

/**
 * Delete an action
 */
export async function deleteAction(actionId: string): Promise<void> {
  await db.delete(actions).where(eq(actions.id, actionId));
}

/**
 * Check if a town has a pending level up request action
 */
export async function hasPendingLevelUpRequest(
  townAddress: string
): Promise<boolean> {
  const [action] = await db
    .select()
    .from(actions)
    .where(
      and(
        eq(actions.townAddress, townAddress),
        eq(actions.type, ActionType.LevelUpRequest)
      )
    )
    .limit(1);

  return !!action;
}

/**
 * Get pending level up request for a town
 */
export async function getPendingLevelUpRequest(
  townAddress: string
): Promise<Action | undefined> {
  const [action] = await db
    .select()
    .from(actions)
    .where(
      and(
        eq(actions.townAddress, townAddress),
        eq(actions.type, ActionType.LevelUpRequest)
      )
    )
    .limit(1);

  return action;
}

// ============================================================================
// ACTION DATA TYPES
// ============================================================================

export interface BuyActionData {
  resourceType: number;
}

export interface UpgradeResourceActionData {
  resourceId: string;
}

export interface CollectActionData {
  resourceId: string;
}

export interface BattleActionData {
  targetAddress: string;
}

// ============================================================================
// ACTION CREATION HELPERS
// ============================================================================

/**
 * Queue a buy resource action
 */
export async function queueBuyResource(
  townAddress: string,
  tick: number,
  resourceType: number
): Promise<Action> {
  const data: BuyActionData = { resourceType };
  return createAction(townAddress, tick, ActionType.BuyResource, data);
}

/**
 * Queue an upgrade resource action
 */
export async function queueUpgradeResource(
  townAddress: string,
  tick: number,
  resourceId: string
): Promise<Action> {
  const data: UpgradeResourceActionData = { resourceId };
  return createAction(townAddress, tick, ActionType.UpgradeResource, data);
}

/**
 * Queue a collect action
 */
export async function queueCollect(
  townAddress: string,
  tick: number,
  resourceId: string
): Promise<Action> {
  const data: CollectActionData = { resourceId };
  return createAction(townAddress, tick, ActionType.Collect, data);
}

/**
 * Queue a boost purchase action
 */
export async function queueBoost(
  townAddress: string,
  tick: number
): Promise<Action> {
  return createAction(townAddress, tick, ActionType.Boost);
}

/**
 * Queue a shield purchase action
 */
export async function queueShield(
  townAddress: string,
  tick: number
): Promise<Action> {
  return createAction(townAddress, tick, ActionType.Shield);
}

/**
 * Queue a level up request action
 */
export async function queueLevelUpRequest(
  townAddress: string,
  tick: number
): Promise<Action> {
  return createAction(townAddress, tick, ActionType.LevelUpRequest);
}

/**
 * Queue a level up approval action
 */
export async function queueLevelUpApproval(
  townAddress: string,
  tick: number
): Promise<Action> {
  return createAction(townAddress, tick, ActionType.LevelUpApproval);
}

/**
 * Queue a level up cancel action
 */
export async function queueLevelUpCancel(
  townAddress: string,
  tick: number
): Promise<Action> {
  return createAction(townAddress, tick, ActionType.LevelUpCancel);
}

/**
 * Queue a battle action
 */
export async function queueBattle(
  townAddress: string,
  tick: number,
  targetAddress: string
): Promise<Action> {
  const data: BattleActionData = { targetAddress };
  return createAction(townAddress, tick, ActionType.Battle, data);
}
