import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ConversationChannel } from '@prisma/client';

export class ParseChannelPipe implements PipeTransform<
  string,
  ConversationChannel
> {
  transform(value: string): ConversationChannel {
    const normalized = value.toUpperCase();

    if (
      !Object.values(ConversationChannel).includes(
        normalized as ConversationChannel,
      )
    ) {
      throw new BadRequestException(`Invalid channel: ${value}`);
    }

    return normalized as ConversationChannel;
  }
}
