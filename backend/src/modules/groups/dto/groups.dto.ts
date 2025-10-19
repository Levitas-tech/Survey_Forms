import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ example: 'Marketing Team' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Team responsible for marketing activities', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateGroupDto {
  @ApiProperty({ example: 'Updated Group Name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
