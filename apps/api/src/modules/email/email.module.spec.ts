import { createEmailSender } from './email.module';
import { LogEmailProvider } from './log-email.provider';

describe('createEmailSender', () => {
  it('log devolve o provedor de log', () => {
    const log = new LogEmailProvider();
    expect(createEmailSender('log', log)).toBe(log);
  });

  it('smtp falha fechado enquanto não houver implementação', () => {
    expect(() => createEmailSender('smtp', new LogEmailProvider())).toThrow(
      /smtp/i,
    );
  });
});

describe('LogEmailProvider', () => {
  it('não escreve o link nem o destinatário no log', async () => {
    const provider = new LogEmailProvider();
    const logs: string[] = [];
    const spy = jest
      .spyOn(
        (provider as unknown as { logger: { log: (m: string) => void } })
          .logger,
        'log',
      )
      .mockImplementation((m: string) => {
        logs.push(String(m));
      });

    await provider.send({
      to: 'alguem@x.example',
      subject: 'Redefinição de senha',
      text: 'texto com token-secreto',
      link: 'http://localhost/reset-password?token=token-secreto',
    });

    expect(logs.join(' ')).not.toContain('token-secreto');
    expect(logs.join(' ')).not.toContain('alguem@x.example');
    expect(provider.lastSentTo('alguem@x.example')?.link).toContain(
      'token-secreto',
    );
    spy.mockRestore();
  });
});
