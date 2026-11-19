import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '@common/config/env.schema';
import { EMAIL_SENDER, EmailSender } from './email.interface';
import { LogEmailProvider } from './log-email.provider';

/**
 * Escolhe o provedor. O smtp ainda não existe: falha fechado no boot, então
 * produção (que recusa `log`) só sobe depois que ele for implementado.
 */
export function createEmailSender(
  provider: 'log' | 'smtp',
  log: LogEmailProvider,
): EmailSender {
  if (provider === 'smtp') {
    throw new Error(
      'EMAIL_PROVIDER=smtp ainda não foi implementado: implemente EmailSender e ligue aqui',
    );
  }
  return log;
}

@Module({
  providers: [
    LogEmailProvider,
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService, LogEmailProvider],
      useFactory: (config: ConfigService<Env, true>, log: LogEmailProvider) =>
        createEmailSender(config.get('EMAIL_PROVIDER', { infer: true }), log),
    },
  ],
  exports: [EMAIL_SENDER],
})
export class EmailModule {}
