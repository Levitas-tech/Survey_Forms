import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form } from '../../entities/form.entity';
import { Question } from '../../entities/question.entity';
import { Option } from '../../entities/option.entity';
import { FormsService } from './forms.service';
import { FormsController } from './forms.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Form, Question, Option])],
  providers: [FormsService],
  controllers: [FormsController],
  exports: [FormsService],
})
export class FormsModule {}
