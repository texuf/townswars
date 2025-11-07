import { eq } from "drizzle-orm";
import { db, mainMessages, type MainMessage, type NewMainMessage } from "../db";
import { messagesAreDifferent } from "./message-service";

// Handler interface with methods we need
interface MessageHandler {
  sendMessage: (channelId: string, message: string) => Promise<{ eventId: string }>;
  removeEvent: (channelId: string, eventId: string) => Promise<any>;
}

/**
 * Get the stored main message for a channel
 */
export async function getMainMessage(
  channelId: string
): Promise<MainMessage | undefined> {
  const [message] = await db
    .select()
    .from(mainMessages)
    .where(eq(mainMessages.channelId, channelId));
  return message;
}

/**
 * Store or update the main message for a channel
 */
export async function setMainMessage(
  channelId: string,
  messageId: string,
  content: string
): Promise<MainMessage> {
  const existing = await getMainMessage(channelId);

  if (existing) {
    const [updated] = await db
      .update(mainMessages)
      .set({
        messageId,
        messageContent: content,
        updatedAt: new Date(),
      })
      .where(eq(mainMessages.channelId, channelId))
      .returning();
    return updated;
  } else {
    const newMessage: NewMainMessage = {
      channelId,
      messageId,
      messageContent: content,
    };
    const [inserted] = await db.insert(mainMessages).values(newMessage).returning();
    return inserted;
  }
}

/**
 * Update main message in channel
 * Only posts if the message content is different from the last one
 * Deletes previous message before posting new one
 */
export async function updateMainMessage(
  handler: MessageHandler,
  channelId: string,
  newContent: string
): Promise<void> {
  const stored = await getMainMessage(channelId);

  // Check if message is different
  if (stored && !messagesAreDifferent(stored.messageContent, newContent)) {
    // Message hasn't changed, don't send
    return;
  }

  // Delete previous message if it exists
  if (stored?.messageId) {
    try {
      await handler.removeEvent(channelId, stored.messageId);
    } catch (error) {
      console.error("Failed to delete previous main message:", error);
      // Continue anyway
    }
  }

  // Send new message
  const result = await handler.sendMessage(channelId, newContent);

  // Store the new message
  await setMainMessage(channelId, result.eventId, newContent);
}
