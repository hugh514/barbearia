import { Module, forwardRef } from '@nestjs/common';
import { ChannelsModule } from '@modules/channels/channels.module';
import { ChannelConfigModule } from '@modules/channel-config/channel-config.module';
import {
  INSTAGRAM_GRAPH_PROVIDER,
  InstagramGraphClient,
} from './providers/instagram-graph.provider';
import { InstagramController } from './instagram.controller';
import { InstagramService } from './instagram.service';

@Module({
  imports: [ChannelConfigModule, forwardRef(() => ChannelsModule)],
  controllers: [InstagramController],
  providers: [
    InstagramService,
    InstagramGraphClient,
    {
      provide: INSTAGRAM_GRAPH_PROVIDER,
      useExisting: InstagramGraphClient,
    },
  ],
  exports: [InstagramService, INSTAGRAM_GRAPH_PROVIDER],
})
export class InstagramModule {}
