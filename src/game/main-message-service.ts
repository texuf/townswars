import { eq } from "drizzle-orm";
import { db, mainMessages, type MainMessage, type NewMainMessage } from "../db";
import { messagesAreDifferent, type ActionButton } from "./message-service";

// Handler interface with methods we need
interface MessageHandler {
  sendMessage: (channelId: string, message: string) => Promise<{ eventId: string }>;
  removeEvent: (channelId: string, eventId: string) => Promise<any>;
  sendInteractionRequest: (channelId: string, request: any) => Promise<{ eventId: string }>;
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

/**
 * Update main message and interaction request
 * Sends the message, then sends interaction request with buttons if available
 */
export async function updateMainMessageWithInteraction(
  handler: MessageHandler,
  channelId: string,
  userId: string,
  messageContent: string,
  buttons: ActionButton[]
): Promise<void> {
  // Always update the main message
  await updateMainMessage(handler, channelId, messageContent);

  // Send interaction request if there are buttons
  if (buttons.length > 0) {
    const components = buttons.map((button) => ({
      id: button.id,
      component: {
        button: {
          label: button.label,
        },
      },
    }));

    const form = {
      id: `town-actions-${Date.now()}`,
      title: "Town Actions",
      subtitle: "Select an action",
      components,
    };

    try {
      await handler.sendInteractionRequest(channelId, {
        recipient: Buffer.from(userId.replace(/^0x/, ""), "hex"),
        content: {
          form,
        },
      });
    } catch (error) {
      console.error("Failed to send interaction request:", error);
    }
  }
}
