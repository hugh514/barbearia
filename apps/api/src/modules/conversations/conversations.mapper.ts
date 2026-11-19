import { Conversation, Customer, Message } from '@prisma/client';
import { ConversationResponseDto } from '@modules/conversations/dto/conversation-response.dto';
import { MessageResponseDto } from '@modules/messages/dto/message-response.dto';

type ConversationWithRelations = Conversation & {
  customer?: Customer;
  messages?: Message[];
};

export function toMessageResponse(message: Message): MessageResponseDto {
  return {
    id: message.id,
    tenantId: message.tenantId,
    conversationId: message.conversationId,
    content: message.content,
    direction: message.direction,
    channel: message.channel,
    externalId: message.externalId,
    createdAt: message.createdAt,
  };
}

export function toConversationResponse(
  conversation: ConversationWithRelations,
): ConversationResponseDto {
  const lastMessage = conversation.messages?.[0];

  return {
    id: conversation.id,
    tenantId: conversation.tenantId,
    customerId: conversation.customerId,
    channel: conversation.channel,
    status: conversation.status,
    assignedTo: conversation.assignedTo,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    customer: conversation.customer
      ? {
          id: conversation.customer.id,
          name: conversation.customer.name,
          phone: conversation.customer.phone,
          instagramUser: conversation.customer.instagramUser,
          origin: conversation.customer.origin,
        }
      : undefined,
    lastMessage: lastMessage ? toMessageResponse(lastMessage) : null,
  };
}
