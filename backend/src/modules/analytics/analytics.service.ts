import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response, ResponseStatus } from '../../entities/response.entity';
import { Answer } from '../../entities/answer.entity';
import { User } from '../../entities/user.entity';
import { Form } from '../../entities/form.entity';

export interface RiskAversionAnalysis {
  userId: string;
  userName: string;
  userEmail: string;
  normalizedRatings: number[];
  riskAversionCoefficient: number;
  riskCategory: 'Conservative' | 'Moderate' | 'Aggressive' | 'Very Aggressive';
  rSquared: number;
  meanRating: number;
  stdDevRating: number;
  traderPerformance: {
    traderId: string;
    traderName: string;
    mean: number;
    stdDev: number;
    rating: number;
    normalizedRating: number;
  }[];
}

export interface RiskAversionSummary {
  totalUsers: number;
  riskDistribution: {
    Conservative: number;
    Moderate: number;
    Aggressive: number;
    'Very Aggressive': number;
  };
  averageRiskAversion: number;
  riskAversionRange: {
    min: number;
    max: number;
  };
  analysis: RiskAversionAnalysis[];
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Response)
    private responseRepository: Repository<Response>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Form)
    private formRepository: Repository<Form>,
  ) {}

  async getRiskAversionAnalysis(formId: string): Promise<RiskAversionSummary> {
    // Get all responses for the trader performance form
    const responses = await this.responseRepository.find({
      where: { formId, status: ResponseStatus.SUBMITTED },
      relations: ['user', 'answers', 'answers.question'],
    });

    if (responses.length === 0) {
      return {
        totalUsers: 0,
        riskDistribution: { Conservative: 0, Moderate: 0, Aggressive: 0, 'Very Aggressive': 0 },
        averageRiskAversion: 0,
        riskAversionRange: { min: 0, max: 0 },
        analysis: []
      };
    }

    // Get form questions to extract trader performance data
    const form = await this.formRepository.findOne({
      where: { id: formId },
      relations: ['questions'],
    });

    if (!form) {
      throw new Error('Form not found');
    }

    const analysis: RiskAversionAnalysis[] = [];

    for (const response of responses) {
      const userAnalysis = await this.calculateUserRiskAversion(response, form.questions);
      analysis.push(userAnalysis);
    }

    // Calculate summary statistics
    const riskAversionCoefficients = analysis.map(a => a.riskAversionCoefficient);
    const averageRiskAversion = riskAversionCoefficients.reduce((sum, coeff) => sum + coeff, 0) / riskAversionCoefficients.length;

    const riskDistribution = {
      Conservative: analysis.filter(a => a.riskCategory === 'Conservative').length,
      Moderate: analysis.filter(a => a.riskCategory === 'Moderate').length,
      Aggressive: analysis.filter(a => a.riskCategory === 'Aggressive').length,
      'Very Aggressive': analysis.filter(a => a.riskCategory === 'Very Aggressive').length,
    };

    return {
      totalUsers: analysis.length,
      riskDistribution,
      averageRiskAversion,
      riskAversionRange: {
        min: Math.min(...riskAversionCoefficients),
        max: Math.max(...riskAversionCoefficients)
      },
      analysis: analysis.sort((a, b) => b.riskAversionCoefficient - a.riskAversionCoefficient)
    };
  }

  private async calculateUserRiskAversion(response: Response, questions: any[]): Promise<RiskAversionAnalysis> {
    const user = response.user;
    const answers = response.answers;

    // Extract trader performance data and user ratings
    const traderData = questions.map(question => {
      const answer = answers.find(a => a.questionId === question.id);
      const rating = answer ? parseFloat(answer.value[0]) : 0;
      
      // Extract trader performance metrics from question data
      const traderPerformance = question.traderPerformance || {};
      
      return {
        traderId: question.id,
        traderName: traderPerformance.traderName || `Trader ${question.id}`,
        mean: traderPerformance.mean || 0,
        stdDev: traderPerformance.stdDev || 0,
        rating: rating
      };
    }).filter(trader => trader.rating > 0); // Only include rated traders

    if (traderData.length === 0) {
      return {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        normalizedRatings: [],
        riskAversionCoefficient: 0,
        riskCategory: 'Moderate',
        rSquared: 0,
        meanRating: 0,
        stdDevRating: 0,
        traderPerformance: []
      };
    }

    // Calculate z-scores for normalization
    const ratings = traderData.map(t => t.rating);
    const meanRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    const variance = ratings.reduce((sum, rating) => sum + Math.pow(rating - meanRating, 2), 0) / ratings.length;
    const stdDevRating = Math.sqrt(variance);

    const normalizedRatings = ratings.map(rating => 
      stdDevRating > 0 ? (rating - meanRating) / stdDevRating : 0
    );

    // Prepare data for OLS regression
    // We'll regress normalized ratings against trader performance metrics
    const regressionData = traderData.map((trader, index) => ({
      x: trader.stdDev, // Risk (standard deviation)
      y: normalizedRatings[index], // Normalized rating
      mean: trader.mean, // Expected return
      traderName: trader.traderName
    }));

    // Perform OLS regression: Rating = α + β * Risk + ε
    const regression = this.performOLSRegression(regressionData);

    // Calculate risk aversion coefficient
    // Higher negative coefficient = more risk averse
    const riskAversionCoefficient = -regression.slope; // Negative because higher risk should lead to lower ratings for risk-averse users

    // Classify risk category based on coefficient
    const riskCategory = this.classifyRiskCategory(riskAversionCoefficient);

    return {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      normalizedRatings,
      riskAversionCoefficient,
      riskCategory,
      rSquared: regression.rSquared,
      meanRating,
      stdDevRating,
      traderPerformance: traderData.map((trader, index) => ({
        traderId: trader.traderId,
        traderName: trader.traderName,
        mean: trader.mean,
        stdDev: trader.stdDev,
        rating: trader.rating,
        normalizedRating: normalizedRatings[index]
      }))
    };
  }

  private performOLSRegression(data: Array<{x: number, y: number}>): {
    slope: number;
    intercept: number;
    rSquared: number;
  } {
    const n = data.length;
    if (n < 2) {
      return { slope: 0, intercept: 0, rSquared: 0 };
    }

    // Calculate means
    const xMean = data.reduce((sum, point) => sum + point.x, 0) / n;
    const yMean = data.reduce((sum, point) => sum + point.y, 0) / n;

    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;

    for (const point of data) {
      const xDiff = point.x - xMean;
      const yDiff = point.y - yMean;
      numerator += xDiff * yDiff;
      denominator += xDiff * xDiff;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Calculate R-squared
    let totalSumSquares = 0;
    let residualSumSquares = 0;

    for (const point of data) {
      const yPredicted = slope * point.x + intercept;
      const yDiff = point.y - yMean;
      const residual = point.y - yPredicted;
      
      totalSumSquares += yDiff * yDiff;
      residualSumSquares += residual * residual;
    }

    const rSquared = totalSumSquares !== 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

    return { slope, intercept, rSquared };
  }

  private classifyRiskCategory(coefficient: number): 'Conservative' | 'Moderate' | 'Aggressive' | 'Very Aggressive' {
    if (coefficient >= 0.5) {
      return 'Very Aggressive';
    } else if (coefficient >= 0.2) {
      return 'Aggressive';
    } else if (coefficient >= -0.2) {
      return 'Moderate';
    } else {
      return 'Conservative';
    }
  }

  async getRiskAversionChartData(formId: string): Promise<{
    scatterData: Array<{
      x: number; // Risk aversion coefficient
      y: number; // Average normalized rating
      userName: string;
      riskCategory: string;
      userId: string;
    }>;
    riskCategories: Array<{
      category: string;
      count: number;
      color: string;
    }>;
  }> {
    const analysis = await this.getRiskAversionAnalysis(formId);
    
    const scatterData = analysis.analysis.map(user => ({
      x: user.riskAversionCoefficient,
      y: user.normalizedRatings.reduce((sum, rating) => sum + rating, 0) / user.normalizedRatings.length,
      userName: user.userName,
      riskCategory: user.riskCategory,
      userId: user.userId
    }));

    const riskCategories = [
      { category: 'Conservative', count: analysis.riskDistribution.Conservative, color: '#ef4444' },
      { category: 'Moderate', count: analysis.riskDistribution.Moderate, color: '#f59e0b' },
      { category: 'Aggressive', count: analysis.riskDistribution.Aggressive, color: '#10b981' },
      { category: 'Very Aggressive', count: analysis.riskDistribution['Very Aggressive'], color: '#3b82f6' }
    ];

    return { scatterData, riskCategories };
  }
}
