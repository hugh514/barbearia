import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as Sentry from '@sentry/nestjs';
import basicAuth from 'express-basic-auth';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { Env } from '@common/config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  const configService = app.get(ConfigService<Env, true>);
  const logger = app.get(Logger);
  app.useLogger(logger);

  app.use(helmet());

  const allowedOrigins = configService
    .get('ALLOWED_ORIGINS', { infer: true })
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: allowedOrigins, credentials: true });

  // trust proxy é configurado no AppModule a partir de TRUST_PROXY.

  app.useBodyParser('json', { limit: '2mb' });

  const sentryDsn = configService.get('SENTRY_DSN', { infer: true });
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: configService.get('NODE_ENV', { infer: true }),
    });
  }

  const swaggerEnabled = configService.get('SWAGGER_ENABLED', { infer: true });
  const nodeEnv = configService.get('NODE_ENV', { infer: true });

  if (swaggerEnabled) {
    if (nodeEnv === 'production') {
      const swaggerUser = configService.get('SWAGGER_USER', { infer: true });
      const swaggerPass = configService.get('SWAGGER_PASS', { infer: true });
      app.use(
        ['/docs', '/docs-json'],
        basicAuth({
          challenge: true,
          users: { [swaggerUser]: swaggerPass },
        }),
      );
    }

    const swaggerConfig = new DocumentBuilder()
      .setTitle(configService.get('APP_NAME', { infer: true }))
      .setDescription('API central da plataforma Barbearia Modelo')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtido via POST /auth/login',
        },
        'access-token',
      )
      .addApiKey(
        {
          type: 'apiKey',
          in: 'header',
          name: 'X-Internal-Key',
          description: 'Chave interna para integrações WhatsApp/Instagram',
        },
        'internal-api-key',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = configService.get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  logger.log(`Application running on port ${port}`);
}

void bootstrap();
