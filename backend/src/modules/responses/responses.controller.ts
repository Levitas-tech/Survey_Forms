import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ResponsesService } from './responses.service';
import { CreateResponseDto, UpdateResponseDto } from './dto/responses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('Responses')
@Controller('responses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  @Post('forms/:formId')
  @ApiOperation({ summary: 'Start or submit a response to a form' })
  @ApiResponse({ status: 201, description: 'Response created successfully' })
  @ApiResponse({ status: 400, description: 'Response already in progress' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  async create(
    @Param('formId') formId: string,
    @Body() createResponseDto: CreateResponseDto,
    @Request() req,
  ) {
    console.log('Received request to create response for formId:', formId);
    console.log('Request body:', JSON.stringify(createResponseDto, null, 2));
    console.log('User ID:', req.user.id);
    console.log('Answers count:', createResponseDto.answers?.length);
    if (createResponseDto.answers) {
      createResponseDto.answers.forEach((answer, index) => {
        console.log(`Answer ${index}:`, JSON.stringify(answer, null, 2));
      });
    }
    return this.responsesService.create(formId, createResponseDto, req.user.id);
  }

  @Get('forms/:formId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.REVIEWER)
  @ApiOperation({ summary: 'Get all responses for a form (Admin only)' })
  @ApiResponse({ status: 200, description: 'Responses retrieved successfully' })
  async findAll(@Param('formId') formId: string, @Request() req) {
    return this.responsesService.findAll(formId, req.user);
  }

  @Get('my-responses')
  @ApiOperation({ summary: 'Get current user responses' })
  @ApiResponse({ status: 200, description: 'Responses retrieved successfully' })
  async getMyResponses(@Request() req) {
    return this.responsesService.getUserResponses(req.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.REVIEWER)
  @ApiOperation({ summary: 'Get all responses (Admin only)' })
  @ApiResponse({ status: 200, description: 'Responses retrieved successfully' })
  async getAllResponses(@Request() req) {
    return this.responsesService.getAllResponses(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get response by ID' })
  @ApiResponse({ status: 200, description: 'Response retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Response not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.responsesService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update response (save draft)' })
  @ApiResponse({ status: 200, description: 'Response updated successfully' })
  @ApiResponse({ status: 404, description: 'Response not found' })
  async update(
    @Param('id') id: string,
    @Body() updateResponseDto: UpdateResponseDto,
    @Request() req,
  ) {
    return this.responsesService.update(id, updateResponseDto, req.user);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit response' })
  @ApiResponse({ status: 200, description: 'Response submitted successfully' })
  @ApiResponse({ status: 404, description: 'Response not found' })
  async submit(@Param('id') id: string, @Request() req) {
    return this.responsesService.submit(id, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete response' })
  @ApiResponse({ status: 200, description: 'Response deleted successfully' })
  @ApiResponse({ status: 404, description: 'Response not found' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.responsesService.remove(id, req.user);
    return { message: 'Response deleted successfully' };
  }
}
