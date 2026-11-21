'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Input, fieldClass } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  useConversations,
  useMessages,
  useRealtimeInbox,
  messagesKey,
  CONVERSATIONS_KEY,
} from '@/features/inbox/use-inbox';
import {
  replyConversation,
  updateConversationStatus,
  type SettableStatus,
} from '@/features/inbox/services';
import { CHANNEL_LABEL, CONV_STATUS_LABEL } from '@/features/inbox/schemas';
import { awaitingReply, chronological, relativeTime } from '@/features/inbox/thread';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const SETTABLE: SettableStatus[] = ['AGUARDANDO', 'EM_ATENDIMENTO', 'FECHADA'];

export default function InboxPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const conversations = useConversations();
  const list = conversations.data?.data ?? [];
  // A conversa ativa vem sempre da lista, para o status refletir o tempo real.
  const active = list.find((c) => c.id === activeId) ?? null;
  const messages = useMessages(activeId);
  const thread = chronological(messages.data?.data ?? []);
  useRealtimeInbox();

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastId = thread.at(-1)?.id;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [lastId, activeId]);

  const [text, setText] = useState('');
  const reply = useMutation({
    mutationFn: (msg: string) => replyConversation(active!, msg),
    onSuccess: () => {
      setText('');
      if (activeId) queryClient.invalidateQueries({ queryKey: messagesKey(activeId) });
    },
  });

  const status = useMutation({
    mutationFn: (s: SettableStatus) => updateConversationStatus(activeId!, s),
    onSuccess: (c) => {
      toast(`Conversa marcada como ${CONV_STATUS_LABEL[c.status].toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
    onError: (e) =>
      toast(e instanceof Error ? e.message : 'Não foi possível mudar o status.', 'error'),
  });

  function open(id: string) {
    setActiveId(id);
    reply.reset();
  }

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Mensagens do WhatsApp e do Instagram. A resposta sai pelo mesmo canal."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <Card
          className={cn(
            'max-h-[calc(100dvh-14rem)] overflow-auto p-0',
            active && 'hidden lg:block',
          )}
        >
          {conversations.isLoading ? (
            <div className="space-y-2 p-3" aria-busy="true" aria-label="Carregando conversas">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : conversations.isError ? (
            <div className="p-3">
              <ErrorState
                message="Não foi possível carregar as conversas."
                action={
                  <Button variant="secondary" size="sm" onClick={() => conversations.refetch()}>
                    Tentar de novo
                  </Button>
                }
              />
            </div>
          ) : list.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhuma conversa ainda. Quando um cliente escrever no WhatsApp ou no Instagram, ela aparece aqui.
            </p>
          ) : (
            <ul className="divide-y divide-border" aria-label="Conversas">
              {list.map((c) => {
                const waiting = awaitingReply(c);
                const at = c.lastMessage?.createdAt ?? c.updatedAt;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => open(c.id)}
                      aria-current={activeId === c.id ? 'true' : undefined}
                      className={cn(
                        'flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                        activeId === c.id && 'bg-accent',
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className={cn('truncate text-sm text-foreground', waiting ? 'font-semibold' : 'font-medium')}>
                          {c.customer?.name ?? 'Cliente'}
                        </span>
                        <time dateTime={at} className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {relativeTime(at)}
                        </time>
                      </span>
                      <span className="flex items-center gap-2">
                        {waiting && (
                          <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                        )}
                        <span className="truncate text-xs text-muted-foreground">
                          {waiting && <span className="sr-only">Aguardando resposta. </span>}
                          {c.lastMessage?.content ?? 'Sem mensagens'}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {CHANNEL_LABEL[c.channel]}, {CONV_STATUS_LABEL[c.status].toLowerCase()}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className={cn('flex max-h-[calc(100dvh-14rem)] min-h-96 flex-col', !active && 'hidden lg:flex')}>
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
              Escolha uma conversa para ler e responder.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-border p-3 sm:p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Voltar para conversas"
                  onClick={() => setActiveId(null)}
                >
                  <ArrowLeft />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {active.customer?.name ?? 'Cliente'}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {CHANNEL_LABEL[active.channel]}
                    {active.customer?.phone ? `, ${active.customer.phone}` : ''}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                  Status
                  <select
                    aria-label="Status da conversa"
                    className={cn(fieldClass, 'h-9 w-auto font-normal')}
                    value={active.status}
                    disabled={status.isPending}
                    onChange={(e) => status.mutate(e.target.value as SettableStatus)}
                  >
                    {active.status === 'ABERTA' && (
                      <option value="ABERTA" disabled>
                        {CONV_STATUS_LABEL.ABERTA}
                      </option>
                    )}
                    {SETTABLE.map((s) => (
                      <option key={s} value={s}>
                        {CONV_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div
                role="log"
                aria-live="polite"
                aria-label={`Mensagens com ${active.customer?.name ?? 'cliente'}`}
                className="flex-1 space-y-2 overflow-auto p-4"
              >
                {messages.isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : messages.isError ? (
                  <ErrorState
                    message="Não foi possível carregar as mensagens."
                    action={
                      <Button variant="secondary" size="sm" onClick={() => messages.refetch()}>
                        Tentar de novo
                      </Button>
                    }
                  />
                ) : thread.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma mensagem nesta conversa.</p>
                ) : (
                  thread.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                        m.direction === 'OUTBOUND'
                          ? 'ml-auto bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground',
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p className="mt-1 text-xs tabular-nums opacity-80">
                        <span className="sr-only">{m.direction === 'OUTBOUND' ? 'Enviada' : 'Recebida'} às </span>
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <form
                className="border-t border-border p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (text.trim()) reply.mutate(text.trim());
                }}
              >
                {reply.isError && (
                  <p role="alert" className="mb-2 text-sm text-destructive">
                    Mensagem não enviada:{' '}
                    {(reply.error instanceof Error && reply.error.message.trim()) ||
                      'o canal não respondeu'}
                    . O texto continua no campo para tentar de novo.
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Digite uma resposta"
                    aria-label="Mensagem"
                  />
                  <Button
                    type="submit"
                    aria-label="Enviar mensagem"
                    disabled={reply.isPending || !text.trim()}
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
