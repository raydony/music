import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminAuthService } from './admin-auth.service.js';
import { AdminJwtGuard } from './guards/admin-jwt.guard.js';

const insecureExampleSecret = 'change_me_to_a_long_random_secret';

function parseExpiresIn(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
  if (!match) {
    throw new Error('JWT_EXPIRES_IN must use a value such as 30m, 12h, or 7d.');
  }

  const amount = Number(match[1]);
  const units = { s: 1, m: 60, h: 3600, d: 86400 } as const;
  const seconds = amount * units[match[2] as keyof typeof units];

  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error('JWT_EXPIRES_IN must be a positive, safe duration.');
  }

  return seconds;
}

function createJwtOptions(configService: ConfigService): JwtModuleOptions {
  const secret = configService.get<string>('JWT_SECRET')?.trim();
  if (!secret || secret.length < 32 || secret === insecureExampleSecret) {
    throw new Error('JWT_SECRET must be changed to a random value of at least 32 characters.');
  }

  const expiresIn = parseExpiresIn(configService.get<string>('JWT_EXPIRES_IN', '12h'));
  return {
    secret,
    signOptions: { expiresIn, algorithm: 'HS256' },
    verifyOptions: { algorithms: ['HS256'] },
  };
}

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: createJwtOptions,
    }),
  ],
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    {
      provide: APP_GUARD,
      useClass: AdminJwtGuard,
    },
  ],
})
export class AdminAuthModule {}
