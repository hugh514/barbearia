import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { Env } from '@common/config/env.schema';
import { JwtPayload } from '@modules/auth/auth.types';
import { ConversationResponseDto } from '@modules/conversations/dto/conversation-response.dto';
import { MessageResponseDto } from '@modules/messages/dto/message-response.dto';

export const CONVERSATIONS_NAMESPACE = '/conversations';

const _allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export function tenantRoom(tenantId: string): string {
  return `tenant:${tenantId}`;
}

@Injectable()
@WebSocketGateway({
  namespace: CONVERSATIONS_NAMESPACE,
  cors: { origin: _allowedOrigins },
})
export class ConversationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ConversationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new UnauthorizedException('Missing JWT token');
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get('JWT_SECRET', { infer: true }),
      });

      if (!payload.tenantId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      client.data.tenantId = payload.tenantId;
      client.data.userId = payload.sub;
      await client.join(tenantRoom(payload.tenantId));
    } catch (error) {
      this.logger.debug(
        `Socket connection rejected: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const tenantId = client.data.tenantId as string | undefined;
    if (tenantId) {
      void client.leave(tenantRoom(tenantId));
    }
  }

  emitConversationUpdated(
    tenantId: string,
    conversation: ConversationResponseDto,
  ): void {
    this.server
      .to(tenantRoom(tenantId))
      .emit('conversation.updated', conversation);
  }

  emitMessageNew(tenantId: string, message: MessageResponseDto): void {
    this.server.to(tenantRoom(tenantId)).emit('message.new', message);
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken;
    }

    const authHeader = client.handshake.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return undefined;
  }
}
