import { apiClient } from '@/lib/http/client';
import {
  conversationListSchema,
  conversationSchema,
  messageListSchema,
  type Conversation,
  type ConversationStatus,
} from './schemas';

export async function listConversations(
  page = 1,
  perPage = 30,
  signal?: AbortSignal,
) {
  return apiClient(`/conversations?page=${page}&perPage=${perPage}`, {
    schema: conversationListSchema,
    signal,
  });
}

export async function listMessages(
  conversationId: string,
  page = 1,
  perPage = 50,
  signal?: AbortSignal,
) {
  return apiClient(
    `/conversations/${conversationId}/messages?page=${page}&perPage=${perPage}`,
    { schema: messageListSchema, signal },
  );
}

/** Responde numa conversa via canal (WhatsApp/Instagram). */
export async function replyConversation(
  conversation: Conversation,
  message: string,
): Promise<void> {
  await apiClient(`/channels/${conversation.channel.toLowerCase()}/reply`, {
    method: 'POST',
    body: { conversationId: conversation.id, message },
  });
}

/** Status que a equipe pode escolher (ABERTA é só o de chegada). */
export type SettableStatus = Exclude<ConversationStatus, 'ABERTA'>;

/** Muda o status; ao passar para Em atendimento a API atribui a quem pegou. */
export async function updateConversationStatus(id: string, status: SettableStatus) {
  return apiClient(`/conversations/${id}/status`, {
    method: 'PATCH',
    body: { status },
    schema: conversationSchema,
  });
}
