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
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FormsService } from './forms.service';
import { CreateFormDto, UpdateFormDto, CreateQuestionDto, UpdateQuestionDto } from './dto/forms.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { FormStatus } from '../../entities/form.entity';

@ApiTags('Forms')
@Controller('forms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new form (Admin only)' })
  @ApiResponse({ status: 201, description: 'Form created successfully' })
  async create(@Body() createFormDto: CreateFormDto, @Request() req) {
    return this.formsService.create(createFormDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all forms' })
  @ApiQuery({ name: 'status', required: false, enum: FormStatus })
  @ApiResponse({ status: 200, description: 'Forms retrieved successfully' })
  async findAll(@Request() req, @Query('status') status?: FormStatus) {
    return this.formsService.findAll(req.user, status);
  }

  @Get('new')
  @ApiOperation({ summary: 'Get new form template' })
  @ApiResponse({ status: 200, description: 'New form template retrieved successfully' })
  async getNewFormTemplate() {
    return {
      id: null,
      title: '',
      description: '',
      status: 'draft',
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  @Post('test')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a test form (Admin only)' })
  @ApiResponse({ status: 201, description: 'Test form created successfully' })
  async createTestForm(@Request() req) {
    const testForm = {
      title: 'Test Form',
      description: 'This is a test form',
      status: 'draft',
      questions: [
        {
          type: 'single_choice',
          text: 'Test Question',
          description: 'This is a test question',
          required: true,
          order: 1,
          options: [
            { text: 'Option 1', value: '1' },
            { text: 'Option 2', value: '2' }
          ]
        }
      ]
    };
    
    console.log('Creating test form for user:', req.user.id);
    return this.formsService.create(testForm as any, req.user.id);
  }

  @Get('debug/count')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get form count for debugging (Admin only)' })
  @ApiResponse({ status: 200, description: 'Form count retrieved successfully' })
  async getFormCount(@Request() req) {
    const count = await this.formsService.getFormCount();
    const allForms = await this.formsService.findAll(req.user);
    return {
      totalForms: count,
      userForms: allForms.length,
      forms: allForms.map(f => ({ id: f.id, title: f.title, status: f.status, createdAt: f.createdAt }))
    };
  }


  @Get(':id')
  @ApiOperation({ summary: 'Get form by ID' })
  @ApiResponse({ status: 200, description: 'Form retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    // Check if the id is a valid UUID, if not, return 404
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new NotFoundException('Form not found');
    }
    return this.formsService.findOne(id, req.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update form (Admin only)' })
  @ApiResponse({ status: 200, description: 'Form updated successfully' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  async update(@Param('id') id: string, @Body() updateFormDto: UpdateFormDto, @Request() req) {
    return this.formsService.update(id, updateFormDto, req.user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete form (Admin only)' })
  @ApiResponse({ status: 200, description: 'Form deleted successfully' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.formsService.remove(id, req.user);
    return { message: 'Form deleted successfully' };
  }

  @Post(':id/publish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Publish form (Admin only)' })
  @ApiResponse({ status: 200, description: 'Form published successfully' })
  async publish(@Param('id') id: string, @Request() req) {
    return this.formsService.publish(id, req.user);
  }

  @Post(':id/unpublish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Unpublish form (Admin only)' })
  @ApiResponse({ status: 200, description: 'Form unpublished successfully' })
  async unpublish(@Param('id') id: string, @Request() req) {
    return this.formsService.unpublish(id, req.user);
  }

  @Post(':id/questions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add question to form (Admin only)' })
  @ApiResponse({ status: 201, description: 'Question added successfully' })
  async addQuestion(
    @Param('id') formId: string,
    @Body() createQuestionDto: CreateQuestionDto,
    @Request() req,
  ) {
    return this.formsService.addQuestion(formId, createQuestionDto, req.user);
  }

  @Patch(':id/questions/:questionId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update question (Admin only)' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  async updateQuestion(
    @Param('id') formId: string,
    @Param('questionId') questionId: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @Request() req,
  ) {
    return this.formsService.updateQuestion(formId, questionId, updateQuestionDto, req.user);
  }

  @Delete(':id/questions/:questionId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete question (Admin only)' })
  @ApiResponse({ status: 200, description: 'Question deleted successfully' })
  async removeQuestion(
    @Param('id') formId: string,
    @Param('questionId') questionId: string,
    @Request() req,
  ) {
    await this.formsService.removeQuestion(formId, questionId, req.user);
    return { message: 'Question deleted successfully' };
  }
}
