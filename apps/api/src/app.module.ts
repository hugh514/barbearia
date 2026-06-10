import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { SentryModule } from '@sentry/nestjs/setup';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from '@common/config/env.schema';
import { GlobalExceptionFilter } from '@common/filters/global-exception.filter';
import { CorrelationIdInterceptor } from '@common/interceptors/correlation-id.interceptor';
import { SanitizeLogsInterceptor } from '@common/interceptors/sanitize-logs.interceptor';
import { ThrottlerConfigModule } from '@common/throttler/throttler-config.module';
import { RedisThrottlerStorage } from '@common/throttler/redis-throttler.storage';
import { RedisModule } from '@common/redis/redis.module';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { AuthModule } from '@modules/auth/auth.module';
import { HealthModule } from '@modules/health/health.module';
import { TenantsModule } from '@modules/tenants/tenants.module';
import { UsersModule } from '@modules/users/users.module';
import { PrismaModule } from '@prisma/prisma.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('NODE_ENV') === 'production';
        return {
          pinoHttp: {
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                  },
                },
            level: isProduction ? 'info' : 'debug',
            autoLogging: true,
            redact: {
              paths: [
                'req.body.password',
                'req.body.refreshToken',
                'req.body.accessToken',
                'req.body.passwordHash',
              ],
              censor: '[REDACTED]',
            },
            customProps: (req) => ({
              correlationId: (req as { correlationId?: string }).correlationId,
            }),
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ThrottlerConfigModule],
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        throttlers: [{ name: 'login', ttl: 60000, limit: 5 }],
        storage,
        getTracker: (req: {
          ip: string;
          headers: Record<string, string | string[] | undefined>;
        }) => {
          const forwarded = req.headers['x-forwarded-for'];
          if (typeof forwarded === 'string' && forwarded.length > 0) {
            return forwarded.split(',')[0].trim();
          }
          return req.ip;
        },
      }),
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    TenantsModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationIdInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizeLogsInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
