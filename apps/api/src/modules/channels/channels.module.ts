import { Module, forwardRef } from '@nestjs/common';
import { AiModule } from '@modules/ai/ai.module';
import { ChannelConfigModule } from '@modules/channel-config/channel-config.module';
import { ConversationsModule } from '@modules/conversations/conversations.module';
import { CustomersModule } from '@modules/customers/customers.module';
import { InstagramModule } from '@modules/instagram/instagram.module';
import { MessagesModule } from '@modules/messages/messages.module';
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module';
import { ChannelMessageHandlerService } from './channel-message-handler.service';
import { ChannelsController } from './channels.controller';
import { ChannelsReplyService } from './channels-reply.service';

@Module({
  imports: [
    AiModule,
    ChannelConfigModule,
    CustomersModule,
    ConversationsModule,
    MessagesModule,
    forwardRef(() => WhatsAppModule),
    forwardRef(() => InstagramModule),
  ],
  controllers: [ChannelsController],
  providers: [ChannelMessageHandlerService, ChannelsReplyService],
  exports: [ChannelMessageHandlerService, ChannelsReplyService],
})
export class ChannelsModule {}
