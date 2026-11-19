// O ConfigModule valida o ambiente ao importar o AppModule, então o valor
// precisa estar definido antes dos imports abaixo (o setup global usa 'true').
process.env.TRUST_PROXY = 'false';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { REDIS_CLIENT } from '../src/common/redis/redis.module';

/** Padrão de produção: sem TRUST_PROXY, X-Forwarded-For não vale para o rate limit. */
describe('Feature 015 — TRUST_PROXY desligado no throttle (e2e)', () => {
  let app: INestApplication;
  const run = Date.now();

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    await app.init();
    await clearThrottle();
  });

  // Contadores do throttle (chaves sha256): suites anteriores sem XFF usam o
  // mesmo IP de loopback, então zera antes e depois.
  async function clearThrottle(): Promise<void> {
    const redis = app.get<Redis>(REDIS_CLIENT);
    const keys = (await redis.keys('*')).filter((k) =>
      /^[0-9a-f]{64}(:blocked)?$/.test(k),
    );
    if (keys.length) await redis.del(...keys);
  }

  afterAll(async () => {
    await clearThrottle();
    await app.close();
  });

  it('IPs forjados no cabeçalho não escapam do limite de login', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', `10.${run % 250}.77.${i + 1}`)
        .send({
          email: `forja${i}-${run}@t015.example`,
          password: 'errada123',
        });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });
});
