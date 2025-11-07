import { eq } from "drizzle-orm";
import { db, mainMessages, type MainMessage, type NewMainMessage } from "../db";
import { messagesAreDifferent, type ActionButton } from "./message-service";
import {
  InteractionRequest,
  InteractionRequest_Form,
  InteractionRequest_Form_Component,
  PlainMessage,
} from "@towns-protocol/proto";

// Handler interface with methods we need
interface MessageHandler {
  sendMessage: (
    channelId: string,
    message: string
  ) => Promise<{ eventId: string }>;
  removeEvent: (channelId: string, eventId: string) => Promise<any>;
  sendInteractionRequest: (
    channelId: string,
    request: PlainMessage<InteractionRequest["content"]>
  ) => Promise<{ eventId: string }>;
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
  content: string,
  interactionEventId?: string
): Promise<MainMessage> {
  const existing = await getMainMessage(channelId);

  if (existing) {
    const [updated] = await db
      .update(mainMessages)
      .set({
        messageId,
        interactionEventId: interactionEventId || null,
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
      interactionEventId: interactionEventId || null,
      messageContent: content,
    };
    const [inserted] = await db
      .insert(mainMessages)
      .values(newMessage)
      .returning();
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
  newContent: string,
  buttons?: ActionButton[]
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

  if (stored?.interactionEventId) {
    try {
      await handler.removeEvent(channelId, stored.interactionEventId);
    } catch (error) {
      console.error("Failed to delete previous interaction event:", error);
      // Continue anyway
    }
  }

  // Send new message
  const result = await handler.sendMessage(channelId, newContent);

  const form = createForm(buttons);
  if (form) {
    const interactionResult = await handler.sendInteractionRequest(channelId, {
      case: "form",
      value: form,
    });
    await setMainMessage(
      channelId,
      result.eventId,
      newContent,
      interactionResult.eventId
    );
  } else {
    await setMainMessage(channelId, result.eventId, newContent);
  }
}

function createForm(
  buttons?: ActionButton[]
): PlainMessage<InteractionRequest_Form> | undefined {
  if (buttons && buttons.length > 0) {
    const components = buttons.map(
      (button) =>
        ({
          id: button.id,
          component: {
            case: "button",
            value: {
              label: button.label,
            },
          },
        } satisfies PlainMessage<InteractionRequest_Form_Component>)
    );

    const form = {
      id: `town-actions-${Date.now()}`,
      title: "Town Actions",
      subtitle: "Select an action",
      components,
    } satisfies PlainMessage<InteractionRequest_Form>;

    return form;
  }
  return undefined;
}

/**
 * Delete main message from channel
 * Removes the message and interaction event from the channel, and deletes the database record
 */
export async function deleteMainMessage(
  handler: MessageHandler,
  channelId: string
): Promise<void> {
  const stored = await getMainMessage(channelId);

  // Delete the interaction event first (if it exists)
  if (stored?.interactionEventId) {
    try {
      await handler.removeEvent(channelId, stored.interactionEventId);
    } catch (error) {
      console.error("Failed to delete interaction event:", error);
      // Continue anyway
    }
  }

  // Delete the main message
  if (stored?.messageId) {
    try {
      await handler.removeEvent(channelId, stored.messageId);
    } catch (error) {
      console.error("Failed to delete main message:", error);
      // Continue to delete from database anyway
    }
  }

  // Delete from database
  try {
    await db.delete(mainMessages).where(eq(mainMessages.channelId, channelId));
  } catch (error) {
    console.error("Failed to delete main message from database:", error);
  }
}
