import { Module } from '@nestjs/common';
import { EMAIL_SENDER } from './email.interface';
import { LogEmailProvider } from './log-email.provider';

@Module({
  providers: [
    LogEmailProvider,
    { provide: EMAIL_SENDER, useExisting: LogEmailProvider },
  ],
  exports: [EMAIL_SENDER],
})
export class EmailModule {}
