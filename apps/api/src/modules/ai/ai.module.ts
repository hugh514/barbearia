import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { OPENAI_PROVIDER, OpenAiClient } from './providers/openai.provider';

@Module({
  providers: [
    AiService,
    OpenAiClient,
    {
      provide: OPENAI_PROVIDER,
      useExisting: OpenAiClient,
    },
  ],
  exports: [AiService, OPENAI_PROVIDER],
})
export class AiModule {}
