import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Response } from '../../entities/response.entity';
import { Answer } from '../../entities/answer.entity';
import { User } from '../../entities/user.entity';
import { Form } from '../../entities/form.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Response, Answer, User, Form])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
