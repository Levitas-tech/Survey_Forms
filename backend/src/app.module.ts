import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppDataSource } from './database/data-source';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FormsModule } from './modules/forms/forms.module';
import { ResponsesModule } from './modules/responses/responses.module';
import { GroupsModule } from './modules/groups/groups.module';
import { FilesModule } from './modules/files/files.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(AppDataSource.options),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL) || 60,
        limit: parseInt(process.env.THROTTLE_LIMIT) || 100,
      },
    ]),
    AuthModule,
    UsersModule,
    FormsModule,
    ResponsesModule,
    GroupsModule,
    FilesModule,
    ReportsModule,
    NotificationsModule,
    AnalyticsModule,
    HealthModule,
  ],
})
export class AppModule {}
