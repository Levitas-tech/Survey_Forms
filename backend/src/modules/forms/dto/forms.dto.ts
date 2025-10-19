import { IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsBoolean, IsNumber, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { FormStatus } from '../../../entities/form.entity';
import { QuestionType } from '../../../entities/question.entity';

export class OptionDto {
  @ApiProperty({ example: 'Option 1' })
  @IsString()
  text: string;

  @ApiProperty({ example: '1' })
  @IsString()
  value: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class CreateQuestionDto {
  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({ example: 'How satisfied are you with our service?' })
  @IsString()
  text: string;

  @ApiProperty({ example: 'Please rate from 1 to 10', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ type: [OptionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];
}

export class CreateFormDto {
  @ApiProperty({ example: 'Customer Feedback Survey' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Please provide your feedback about our service', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: FormStatus, required: false, default: FormStatus.DRAFT })
  @IsOptional()
  @IsEnum(FormStatus)
  status?: FormStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiProperty({ type: [CreateQuestionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];
}

export class UpdateFormDto {
  @ApiProperty({ example: 'Updated Survey Title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: FormStatus, required: false })
  @IsOptional()
  @IsEnum(FormStatus)
  status?: FormStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class UpdateQuestionDto {
  @ApiProperty({ enum: QuestionType, required: false })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiProperty({ example: 'Updated question text', required: false })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ type: [OptionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];
}
