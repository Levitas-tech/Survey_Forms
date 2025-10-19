import { IsString, IsArray, ValidateNested, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ResponseStatus } from '../../../entities/response.entity';

export class AnswerDto {
  @ApiProperty({ example: 'question-uuid' })
  @IsString()
  questionId: string;

  @ApiProperty({ example: 'Answer value or selected option' })
  value: any;

  @ApiProperty({ example: 4.5, required: false })
  @IsOptional()
  @IsNumber()
  score?: number;

  @ApiProperty({ example: ['file1.jpg', 'file2.pdf'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  files?: string[];
}

export class CreateResponseDto {
  @ApiProperty({ type: [AnswerDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers?: AnswerDto[];
}

export class UpdateResponseDto {
  @ApiProperty({ type: [AnswerDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers?: AnswerDto[];

  @ApiProperty({ enum: ResponseStatus, required: false })
  @IsOptional()
  @IsEnum(ResponseStatus)
  status?: ResponseStatus;
}
