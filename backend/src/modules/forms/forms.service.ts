import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form, FormStatus } from '../../entities/form.entity';
import { Question, QuestionType } from '../../entities/question.entity';
import { Option } from '../../entities/option.entity';
import { User, UserRole } from '../../entities/user.entity';
import { CreateFormDto, UpdateFormDto, CreateQuestionDto, UpdateQuestionDto } from './dto/forms.dto';

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(Form)
    private formRepository: Repository<Form>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Option)
    private optionRepository: Repository<Option>,
  ) {}

  async create(createFormDto: CreateFormDto, userId: string): Promise<Form> {
    const { questions, ...formData } = createFormDto as any;
    
    console.log('=== FORM CREATION START ===');
    console.log('User ID:', userId);
    console.log('Form data:', JSON.stringify(formData, null, 2));
    console.log('Questions count:', questions?.length || 0);
    console.log('Questions data:', JSON.stringify(questions, null, 2));
    
    try {
      const form = this.formRepository.create({
        ...formData,
        createdById: userId,
      });
      console.log('Form entity created:', form);

      const savedForm = await this.formRepository.save(form);
      console.log('Form saved successfully:', savedForm);
      console.log('Form ID:', (savedForm as any).id);
      
      // Ensure we have a single form object, not an array
      const formId = Array.isArray(savedForm) ? (savedForm as any)[0].id : (savedForm as any).id;
      console.log('Using form ID:', formId);

    // Create questions if provided
    if (questions && questions.length > 0) {
      console.log('Creating questions...');
      for (const questionData of questions) {
        const { options, traderPerformance, ...questionFields } = questionData;
        
        console.log('Creating question:', questionFields.text);
        
        const question = this.questionRepository.create({
          ...questionFields,
          formId: formId,
          orderIndex: questionFields.order || 0,
          config: questionFields.config || {}
        });

        const savedQuestion = await this.questionRepository.save(question);
        console.log('Question saved with ID:', (savedQuestion as any).id);

        // Create options if provided
        if (options && options.length > 0) {
          for (const optionData of options) {
            const option = this.optionRepository.create({
              ...optionData,
              questionId: (savedQuestion as any).id,
            });
            await this.optionRepository.save(option);
          }
        }
      }
    }

    const finalForm = await this.formRepository.findOne({
      where: { id: formId },
      relations: ['questions', 'questions.options']
    });
    
    console.log('Final form retrieved:', finalForm?.id, 'with', finalForm?.questions?.length || 0, 'questions');
    console.log('=== FORM CREATION COMPLETE ===');
    return finalForm;
    } catch (error) {
      console.error('=== FORM CREATION ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async findAll(user: User, status?: FormStatus): Promise<Form[]> {
    console.log('Finding forms for user:', user.id, 'role:', user.role, 'status:', status);
    
    const query = this.formRepository.createQueryBuilder('form')
      .leftJoinAndSelect('form.questions', 'questions')
      .leftJoinAndSelect('questions.options', 'options')
      .orderBy('form.createdAt', 'DESC');

    if (status) {
      query.andWhere('form.status = :status', { status });
    }

    // Users can only see published forms assigned to them
    if (user.role === UserRole.USER) {
      query.andWhere('form.status = :published', { published: FormStatus.PUBLISHED });
    }

    const forms = await query.getMany();
    console.log('Found forms:', forms.length, 'forms');
    return forms;
  }

  async getFormCount(): Promise<number> {
    return this.formRepository.count();
  }

  async addQuestion(formId: string, createQuestionDto: CreateQuestionDto, user: User): Promise<Question> {
    const form = await this.formRepository.findOne({
      where: { id: formId },
      relations: ['questions']
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    // Check if user has permission to modify this form
    if (user.role === UserRole.USER && form.createdById !== user.id) {
      throw new ForbiddenException('You do not have permission to modify this form');
    }

    const { options, ...questionFields } = createQuestionDto;
    
    const question = this.questionRepository.create({
      ...questionFields,
      formId: formId,
      orderIndex: questionFields.order || (form.questions?.length || 0) + 1,
      config: questionFields.config || {}
    });

    const savedQuestion = await this.questionRepository.save(question);

    // Create options if provided
    if (options && options.length > 0) {
      for (const optionData of options) {
        const option = this.optionRepository.create({
          ...optionData,
          questionId: savedQuestion.id,
        });
        await this.optionRepository.save(option);
      }
    }

    return this.questionRepository.findOne({
      where: { id: savedQuestion.id },
      relations: ['options']
    });
  }

  async updateQuestion(formId: string, questionId: string, updateQuestionDto: UpdateQuestionDto, user: User): Promise<Question> {
    const form = await this.formRepository.findOne({
      where: { id: formId }
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    // Check if user has permission to modify this form
    if (user.role === UserRole.USER && form.createdById !== user.id) {
      throw new ForbiddenException('You do not have permission to modify this form');
    }

    const question = await this.questionRepository.findOne({
      where: { id: questionId, formId },
      relations: ['options']
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const { options, ...questionFields } = updateQuestionDto;
    
    Object.assign(question, questionFields);

    const savedQuestion = await this.questionRepository.save(question);

    // Update options if provided
    if (options !== undefined) {
      // Delete existing options
      await this.optionRepository.delete({ questionId: questionId });
      
      // Create new options
      if (options.length > 0) {
        for (const optionData of options) {
          const option = this.optionRepository.create({
            ...optionData,
            questionId: questionId,
          });
          await this.optionRepository.save(option);
        }
      }
    }

    return this.questionRepository.findOne({
      where: { id: savedQuestion.id },
      relations: ['options']
    });
  }

  async removeQuestion(formId: string, questionId: string, user: User): Promise<void> {
    const form = await this.formRepository.findOne({
      where: { id: formId }
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    // Check if user has permission to modify this form
    if (user.role === UserRole.USER && form.createdById !== user.id) {
      throw new ForbiddenException('You do not have permission to modify this form');
    }

    const question = await this.questionRepository.findOne({
      where: { id: questionId, formId }
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    await this.questionRepository.delete(questionId);
  }

  async findOne(id: string, user: User): Promise<Form> {
    const form = await this.formRepository.findOne({
      where: { id },
      relations: ['questions', 'questions.options', 'createdBy'],
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    // Users can only access published forms
    if (user.role === UserRole.USER && form.status !== FormStatus.PUBLISHED) {
      throw new ForbiddenException('Access denied');
    }

    return form;
  }

  async update(id: string, updateFormDto: UpdateFormDto, user: User): Promise<Form> {
    const form = await this.findOne(id, user);

    // Only admins can edit forms
    if (user.role === UserRole.USER) {
      throw new ForbiddenException('Access denied');
    }

    Object.assign(form, updateFormDto);
    return this.formRepository.save(form);
  }

  async remove(id: string, user: User): Promise<void> {
    const form = await this.findOne(id, user);

    // Only admins can delete forms
    if (user.role === UserRole.USER) {
      throw new ForbiddenException('Access denied');
    }

    await this.formRepository.remove(form);
  }

  async publish(id: string, user: User): Promise<Form> {
    const form = await this.findOne(id, user);

    if (user.role === UserRole.USER) {
      throw new ForbiddenException('Access denied');
    }

    form.status = FormStatus.PUBLISHED;
    form.publishAt = new Date();

    return this.formRepository.save(form);
  }

  async unpublish(id: string, user: User): Promise<Form> {
    const form = await this.findOne(id, user);

    if (user.role === UserRole.USER) {
      throw new ForbiddenException('Access denied');
    }

    form.status = FormStatus.DRAFT;
    form.publishAt = null;

    return this.formRepository.save(form);
  }

}
