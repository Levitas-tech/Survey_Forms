import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response, ResponseStatus } from '../../entities/response.entity';
import { Answer } from '../../entities/answer.entity';
import { Form, FormStatus } from '../../entities/form.entity';
import { User, UserRole } from '../../entities/user.entity';
import { CreateResponseDto, UpdateResponseDto } from './dto/responses.dto';

@Injectable()
export class ResponsesService {
  constructor(
    @InjectRepository(Response)
    private responseRepository: Repository<Response>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
    @InjectRepository(Form)
    private formRepository: Repository<Form>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(formId: string, createResponseDto: CreateResponseDto, userId: string): Promise<Response> {
    console.log('Creating response for formId:', formId, 'userId:', userId);
    console.log('Response data:', JSON.stringify(createResponseDto, null, 2));
    
    // Check if form exists and is published
    const form = await this.formRepository.findOne({
      where: { id: formId, status: FormStatus.PUBLISHED },
      relations: ['questions'],
    });

    if (!form) {
      console.log('Form not found or not published. FormId:', formId);
      throw new NotFoundException('Form not found or not published');
    }

    // Check if user already has a response for this form
    const existingResponse = await this.responseRepository.findOne({
      where: { formId, userId, status: ResponseStatus.IN_PROGRESS },
    });

    if (existingResponse) {
      throw new BadRequestException('Response already in progress');
    }

    // Create response
    const response = this.responseRepository.create({
      formId,
      userId,
      startedAt: new Date(),
      status: ResponseStatus.IN_PROGRESS,
    });

    const savedResponse = await this.responseRepository.save(response);

    // Create answers if provided
    if (createResponseDto.answers && createResponseDto.answers.length > 0) {
      console.log('Creating answers with data:', createResponseDto.answers);
      
      const answers = createResponseDto.answers.map((answerData) => {
        const answer = this.answerRepository.create({
          ...answerData,
          responseId: savedResponse.id,
        });
        console.log('Created answer entity:', {
          questionId: answer.questionId,
          value: answer.value,
          responseId: answer.responseId
        });
        return answer;
      });

      const savedAnswers = await this.answerRepository.save(answers);
      console.log('Saved answers:', savedAnswers.map(a => ({
        id: a.id,
        questionId: a.questionId,
        value: a.value
      })));
    }

    return this.responseRepository.findOne({
      where: { id: savedResponse.id },
      relations: ['answers', 'answers.question'],
    });
  }

  async findAll(formId: string, user: User): Promise<Response[]> {
    // Check if user has permission to view responses
    if (user.role === UserRole.USER) {
      throw new ForbiddenException('Access denied');
    }

    return this.responseRepository.find({
      where: { formId },
      relations: ['user', 'answers', 'answers.question'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Response> {
    const response = await this.responseRepository.findOne({
      where: { id },
      relations: ['form', 'user', 'answers', 'answers.question'],
    });

    if (!response) {
      throw new NotFoundException('Response not found');
    }

    // Users can only view their own responses
    if (user.role === UserRole.USER && response.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    console.log('Response found:', {
      id: response.id,
      answersCount: response.answers?.length,
      answers: response.answers?.map(answer => ({
        id: answer.id,
        questionId: answer.questionId,
        value: answer.value,
        questionText: answer.question?.text,
        questionType: answer.question?.type,
        questionOptions: answer.question?.options
      }))
    });

    return response;
  }

  async update(id: string, updateResponseDto: UpdateResponseDto, user: User): Promise<Response> {
    console.log('Update request received:', {
      id,
      updateData: updateResponseDto,
      userId: user.id
    });

    // Find response without loading answers to avoid cascade issues
    const response = await this.responseRepository.findOne({
      where: { id },
      relations: ['form', 'user'],
    });

    if (!response) {
      throw new NotFoundException('Response not found');
    }

    // Users can only update their own responses
    if (user.role === UserRole.USER && response.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    // Update answers if provided
    if (updateResponseDto.answers) {
      console.log('Updating answers:', updateResponseDto.answers);
      
      try {
        // Remove existing answers
        await this.answerRepository.delete({ responseId: id });

        // Create new answers
        const answers = updateResponseDto.answers.map((answerData) => {
          console.log('Creating answer:', answerData);
          return this.answerRepository.create({
            ...answerData,
            responseId: id,
          });
        });

        console.log('Saving answers:', answers);
        await this.answerRepository.save(answers);
      } catch (error) {
        console.error('Error updating answers:', error);
        throw error;
      }
    }

    // Update response status if provided
    if (updateResponseDto.status) {
      response.status = updateResponseDto.status;
      if (updateResponseDto.status === ResponseStatus.SUBMITTED) {
        response.submittedAt = new Date();
      }
    }

    // Save response without loading answers
    const savedResponse = await this.responseRepository.save(response);
    
    // Return response with answers loaded separately
    return this.responseRepository.findOne({
      where: { id: savedResponse.id },
      relations: ['form', 'user', 'answers', 'answers.question'],
    });
  }

  async submit(id: string, user: User): Promise<Response> {
    const response = await this.findOne(id, user);

    // Users can only submit their own responses
    if (user.role === UserRole.USER && response.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    response.status = ResponseStatus.SUBMITTED;
    response.submittedAt = new Date();

    return this.responseRepository.save(response);
  }

  async remove(id: string, user: User): Promise<void> {
    const response = await this.findOne(id, user);

    // Users can only delete their own responses
    if (user.role === UserRole.USER && response.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.responseRepository.remove(response);
  }

  async getUserResponses(userId: string): Promise<Response[]> {
    return this.responseRepository.find({
      where: { userId },
      relations: ['form', 'answers', 'answers.question'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllResponses(user: User): Promise<Response[]> {
    return this.responseRepository.find({
      relations: ['form', 'user', 'answers', 'answers.question'],
      order: { createdAt: 'DESC' },
    });
  }
}
