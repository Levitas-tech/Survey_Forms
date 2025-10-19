import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Response } from '../../entities/response.entity';
import { Answer } from '../../entities/answer.entity';
import { Form } from '../../entities/form.entity';
import { User } from '../../entities/user.entity';
import { ResponsesService } from './responses.service';
import { ResponsesController } from './responses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Response, Answer, Form, User])],
  providers: [ResponsesService],
  controllers: [ResponsesController],
  exports: [ResponsesService],
})
export class ResponsesModule {}
