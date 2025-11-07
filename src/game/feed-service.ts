import { db, towns } from "../db";

/**
 * Bot handler type - subset of methods we need
 */
interface MessageSender {
  sendMessage: (channelId: string, message: string) => Promise<any>;
}

/**
 * Send a global feed message to all engaged channels
 * Used for battle announcements, shield/boost purchases, town upgrades
 */
export async function sendGlobalFeedMessage(
  bot: MessageSender,
  message: string
): Promise<void> {
  try {
    // Get all unique channel IDs from engaged towns
    const engagedTowns = await db.select().from(towns);
    const channelIds = [...new Set(engagedTowns.map((t) => t.channelId))];

    // Send message to each channel
    for (const channelId of channelIds) {
      try {
        await bot.sendMessage(channelId, `📢 ${message}`);
      } catch (error) {
        console.error(`Failed to send feed message to ${channelId}:`, error);
        // Continue to next channel
      }
    }
  } catch (error) {
    console.error("Failed to send global feed message:", error);
  }
}

/**
 * Send a channel-only message (for resource actions)
 */
export async function sendChannelMessage(
  bot: MessageSender,
  channelId: string,
  message: string
): Promise<void> {
  try {
    await bot.sendMessage(channelId, message);
  } catch (error) {
    console.error(`Failed to send channel message to ${channelId}:`, error);
  }
}
