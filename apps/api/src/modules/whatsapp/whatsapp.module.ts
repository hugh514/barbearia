import { Module, forwardRef } from '@nestjs/common';
import { ChannelsModule } from '@modules/channels/channels.module';
import { ChannelConfigModule } from '@modules/channel-config/channel-config.module';
import { ConversationsModule } from '@modules/conversations/conversations.module';
import { MessagesModule } from '@modules/messages/messages.module';
import {
  EVOLUTION_API_PROVIDER,
  EvolutionApiClient,
} from './providers/evolution-api.provider';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [
    ChannelConfigModule,
    ConversationsModule,
    MessagesModule,
    forwardRef(() => ChannelsModule),
  ],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService,
    EvolutionApiClient,
    {
      provide: EVOLUTION_API_PROVIDER,
      useExisting: EvolutionApiClient,
    },
  ],
  exports: [WhatsAppService, EVOLUTION_API_PROVIDER],
})
export class WhatsAppModule {}
