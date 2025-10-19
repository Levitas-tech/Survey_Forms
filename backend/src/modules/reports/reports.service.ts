import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form } from '../../entities/form.entity';
import { Response, ResponseStatus } from '../../entities/response.entity';
import { Answer } from '../../entities/answer.entity';
import { User, UserRole } from '../../entities/user.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Form)
    private formRepository: Repository<Form>,
    @InjectRepository(Response)
    private responseRepository: Repository<Response>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
  ) {}

  async getAggregateReport(formId: string, user: User) {
    const form = await this.formRepository.findOne({
      where: { id: formId },
      relations: ['questions', 'questions.options'],
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    // Check permissions
    if (user.role === UserRole.USER) {
      throw new ForbiddenException('Access denied');
    }

    const responses = await this.responseRepository.find({
      where: { formId, status: ResponseStatus.SUBMITTED },
      relations: ['answers'],
    });

    const report = {
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        totalQuestions: form.questions.length,
      },
      summary: {
        totalResponses: responses.length,
        completionRate: 0, // Calculate based on total possible responses
        averageTime: 0, // Calculate average completion time
      },
      questions: form.questions.map(question => {
        const questionAnswers = responses.flatMap(response =>
          response.answers.filter(answer => answer.questionId === question.id)
        );

        return {
          id: question.id,
          text: question.text,
          type: question.type,
          totalAnswers: questionAnswers.length,
          analysis: this.analyzeQuestion(question, questionAnswers),
        };
      }),
    };

    return report;
  }

  private analyzeQuestion(question: any, answers: Answer[]) {
    switch (question.type) {
      case 'single_choice':
      case 'multiple_choice':
        return this.analyzeChoiceQuestion(question, answers);
      case 'likert_scale':
      case 'numeric_scale':
        return this.analyzeScaleQuestion(question, answers);
      case 'text_short':
      case 'text_long':
        return this.analyzeTextQuestion(answers);
      default:
        return { type: 'unsupported' };
    }
  }

  private analyzeChoiceQuestion(question: any, answers: Answer[]) {
    const optionCounts = {};
    question.options?.forEach(option => {
      optionCounts[option.value] = 0;
    });

    answers.forEach(answer => {
      if (Array.isArray(answer.value)) {
        answer.value.forEach(value => {
          if (optionCounts[value] !== undefined) {
            optionCounts[value]++;
          }
        });
      } else if (optionCounts[answer.value] !== undefined) {
        optionCounts[answer.value]++;
      }
    });

    return {
      type: 'choice',
      optionCounts,
      totalResponses: answers.length,
    };
  }

  private analyzeScaleQuestion(question: any, answers: Answer[]) {
    const values = answers
      .map(answer => parseFloat(answer.value))
      .filter(value => !isNaN(value));

    if (values.length === 0) {
      return { type: 'scale', totalResponses: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      type: 'scale',
      average,
      min,
      max,
      totalResponses: values.length,
      distribution: this.calculateDistribution(values),
    };
  }

  private analyzeTextQuestion(answers: Answer[]) {
    const responses = answers.map(answer => answer.value).filter(value => value);
    return {
      type: 'text',
      totalResponses: responses.length,
      averageLength: responses.reduce((sum, text) => sum + text.length, 0) / responses.length,
    };
  }

  private calculateDistribution(values: number[]) {
    const distribution = {};
    values.forEach(value => {
      distribution[value] = (distribution[value] || 0) + 1;
    });
    return distribution;
  }

  async exportToCSV(formId: string, user: User) {
    const form = await this.formRepository.findOne({
      where: { id: formId },
      relations: ['questions'],
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    if (user.role === UserRole.USER) {
      throw new ForbiddenException('Access denied');
    }

    const responses = await this.responseRepository.find({
      where: { formId, status: ResponseStatus.SUBMITTED },
      relations: ['user', 'answers'],
    });

    // Generate CSV content
    const headers = ['Response ID', 'User', 'Submitted At', ...form.questions.map(q => q.text)];
    const rows = responses.map(response => {
      const row = [
        response.id,
        response.user.name,
        response.submittedAt.toISOString(),
      ];

      form.questions.forEach(question => {
        const answer = response.answers.find(a => a.questionId === question.id);
        row.push(answer ? answer.value : '');
      });

      return row;
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return {
      filename: `${form.title}-responses.csv`,
      content: csvContent,
      mimeType: 'text/csv',
    };
  }
}
