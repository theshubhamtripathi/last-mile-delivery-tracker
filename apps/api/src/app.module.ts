import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { join } from 'node:path';
import { validateEnv } from './config/env.validation';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { ZonesModule } from './modules/zones/zones.module';
import { RatingModule } from './modules/rating/rating.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AssignmentModule } from './modules/assignment/assignment.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AgentsModule } from './modules/agents/agents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // The repo keeps a single .env at the workspace root.
      envFilePath: [join(__dirname, '../../../.env'), '.env'],
    }),
    // Default throttle; auth routes tighten this further at the controller.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    JwtModule.register({}),
    PrismaModule,
    AdminModule,
    TrackingModule,
    NotificationsModule,
    HealthModule,
    AuthModule,
    ZonesModule,
    RatingModule,
    AssignmentModule,
    OrdersModule,
    AgentsModule,
  ],
  providers: [
    // Order matters: authenticate, then authorize, then rate-limit.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
