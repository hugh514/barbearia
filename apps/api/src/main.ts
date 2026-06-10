import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as Sentry from '@sentry/nestjs';
import basicAuth from 'express-basic-auth';
import { AppModule } from './app.module';
import { Env } from '@common/config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService<Env, true>);
  const logger = app.get(Logger);
  app.useLogger(logger);

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
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = configService.get('PORT', { infer: true });
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

void bootstrap();
