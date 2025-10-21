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

export interface IndividualRiskAnalysis {
  userId: string;
  userName: string;
  userEmail: string;
  alpha: number;
  beta1: number;
  beta2: number;
  riskAversionCoefficient: number;
  rSquared: number;
  normalizedRatings: number[];
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

  async getIndividualRiskAnalysis(responseId: string, userId: string): Promise<IndividualRiskAnalysis> {
    // Get the response
    const response = await this.responseRepository.findOne({
      where: { id: responseId },
      relations: ['user', 'form', 'answers', 'answers.question'],
    });

    if (!response) {
      throw new Error('Response not found');
    }

    // Check if user can access this response
    if (response.userId !== userId) {
      throw new Error('Access denied');
    }

    // Get form questions
    const questions = response.form.questions || [];
    
    // Calculate individual risk analysis
    return this.calculateIndividualRiskAnalysis(response, questions);
  }

  async performRiskAnalysis(): Promise<{
    results: any[];
    summary: any;
  }> {
    // Get all responses with trader performance data
    const responses = await this.responseRepository.find({
      relations: ['user', 'form', 'answers', 'answers.question'],
    });

    if (responses.length === 0) {
      return {
        results: [],
        summary: {
          totalUsers: 0,
          averageRiskCoefficient: 0,
          averageAlpha: 0,
          averageBeta1: 0,
          averageBeta2: 0,
          classificationDistribution: {
            'Very Risk Averse': 0,
            'Mild Risk Aversion': 0,
            'Low Risk Aversion': 0,
            'Risk Neutral': 0,
            'Risk seeking': 0,
          },
          averageRSquared: 0,
        }
      };
    }

    const analysisResults = [];
    let totalAlpha = 0;
    let totalBeta1 = 0;
    let totalBeta2 = 0;
    let totalRiskCoeff = 0;
    let totalRSquared = 0;
    const classificationCounts = {
      'Very Risk Averse': 0,
      'Mild Risk Aversion': 0,
      'Low Risk Aversion': 0,
      'Risk Neutral': 0,
      'Risk seeking': 0,
    };

    for (const response of responses) {
      try {
        const questions = response.form.questions || [];
        const individualAnalysis = await this.calculateIndividualRiskAnalysis(response, questions);
        
        // Classify risk aversion
        const riskClass = this.classifyRiskAversion(individualAnalysis.riskAversionCoefficient);
        classificationCounts[riskClass]++;
        
        analysisResults.push({
          userId: individualAnalysis.userId,
          userName: individualAnalysis.userName,
          userEmail: individualAnalysis.userEmail,
          responses: individualAnalysis.normalizedRatings,
          normalizedResponses: individualAnalysis.normalizedRatings,
          alpha: individualAnalysis.alpha,
          beta1: individualAnalysis.beta1,
          beta2: individualAnalysis.beta2,
          riskAversionCoefficient: individualAnalysis.riskAversionCoefficient,
          riskClassification: riskClass,
          rSquared: individualAnalysis.rSquared,
          meanResponse: individualAnalysis.normalizedRatings.reduce((sum, val) => sum + val, 0) / individualAnalysis.normalizedRatings.length,
          stdDevResponse: Math.sqrt(
            individualAnalysis.normalizedRatings.reduce((sum, val) => sum + Math.pow(val - (individualAnalysis.normalizedRatings.reduce((s, v) => s + v, 0) / individualAnalysis.normalizedRatings.length), 2), 0) / individualAnalysis.normalizedRatings.length
          ),
        });

        totalAlpha += individualAnalysis.alpha;
        totalBeta1 += individualAnalysis.beta1;
        totalBeta2 += individualAnalysis.beta2;
        totalRiskCoeff += individualAnalysis.riskAversionCoefficient;
        totalRSquared += individualAnalysis.rSquared;
      } catch (error) {
        console.error(`Error analyzing response ${response.id}:`, error);
        // Skip this response and continue
      }
    }

    const validResults = analysisResults.filter(r => !isNaN(r.alpha));
    const count = validResults.length;

    return {
      results: analysisResults,
      summary: {
        totalUsers: count,
        averageRiskCoefficient: count > 0 ? totalRiskCoeff / count : 0,
        averageAlpha: count > 0 ? totalAlpha / count : 0,
        averageBeta1: count > 0 ? totalBeta1 / count : 0,
        averageBeta2: count > 0 ? totalBeta2 / count : 0,
        classificationDistribution: classificationCounts,
        averageRSquared: count > 0 ? totalRSquared / count : 0,
      }
    };
  }

  private classifyRiskAversion(coefficient: number): 'Very Risk Averse' | 'Mild Risk Aversion' | 'Low Risk Aversion' | 'Risk Neutral' | 'Risk seeking' {
    if (coefficient >= 2) return 'Very Risk Averse';
    if (coefficient >= 1) return 'Mild Risk Aversion';
    if (coefficient >= 0.5) return 'Low Risk Aversion';
    if (coefficient >= -0.5) return 'Risk Neutral';
    return 'Risk seeking';
  }

  private async calculateIndividualRiskAnalysis(response: Response, questions: any[]): Promise<IndividualRiskAnalysis> {
    const user = response.user;
    
    console.log('Calculating individual risk analysis for user:', user.name);
    console.log('Response answers:', response.answers.length);
    console.log('Questions:', questions.length);
    
    // Extract trader performance data and user ratings
    const traderData = [];
    const userRatings = [];
    
    for (const answer of response.answers) {
      const question = questions.find(q => q.id === answer.questionId);
      console.log('Processing answer:', {
        questionId: answer.questionId,
        value: answer.value,
        hasTraderConfig: !!question?.config?.traderPerformance
      });
      
      if (question?.config?.traderPerformance) {
        const trader = question.config.traderPerformance;
        const rating = Array.isArray(answer.value) ? parseFloat(answer.value[0]) : parseFloat(answer.value);
        
        console.log('Trader data:', {
          traderName: trader.traderName,
          mean: trader.mean,
          stdDev: trader.stdDev,
          rating: rating,
          isValidRating: !isNaN(rating)
        });
        
        if (!isNaN(rating)) {
          traderData.push({
            traderId: question.id,
            traderName: trader.traderName,
            mean: trader.mean,
            stdDev: trader.stdDev,
            rating: rating
          });
          userRatings.push(rating);
        }
      }
    }

    console.log('Final trader data:', traderData);
    console.log('Final user ratings:', userRatings);

    if (traderData.length === 0) {
      throw new Error('No trader performance data found');
    }

    // Calculate z-score normalized ratings
    const meanRating = userRatings.reduce((sum, rating) => sum + rating, 0) / userRatings.length;
    const stdDevRating = Math.sqrt(
      userRatings.reduce((sum, rating) => sum + Math.pow(rating - meanRating, 2), 0) / userRatings.length
    );
    
    const normalizedRatings = userRatings.map(rating => 
      stdDevRating === 0 ? 0 : (rating - meanRating) / stdDevRating
    );

    // Prepare data for multivariate OLS regression
    // y = alpha + beta1*returns + beta2*stdDev + error
    const X = traderData.map(trader => [1, trader.mean, trader.stdDev]); // [1, returns, stdDev]
    const y = normalizedRatings;

    // Perform multivariate OLS regression
    const regression = this.performMultivariateOLS(X, y);

    // Calculate risk aversion coefficient: -2*beta1/beta2
    const riskAversionCoefficient = regression.beta2 === 0 ? 0 : -2 * regression.beta1 / regression.beta2;

    return {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      alpha: regression.alpha,
      beta1: regression.beta1,
      beta2: regression.beta2,
      riskAversionCoefficient,
      rSquared: regression.rSquared,
      normalizedRatings,
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

  private performMultivariateOLS(X: number[][], y: number[]): {
    alpha: number;
    beta1: number;
    beta2: number;
    rSquared: number;
  } {
    const n = X.length;
    const m = X[0].length; // Should be 3: [1, returns, stdDev]

    console.log('Multivariate OLS Input:');
    console.log('X matrix:', X);
    console.log('y vector:', y);
    console.log('n (samples):', n, 'm (variables):', m);

    if (n < 3) {
      console.log('Not enough data points for multivariate regression');
      return { alpha: 0, beta1: 0, beta2: 0, rSquared: 0 };
    }

    // Convert to matrix format
    const XMatrix = X;
    const yVector = y;

    // Calculate X'X
    const XTX = Array(m).fill(null).map(() => Array(m).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        for (let k = 0; k < n; k++) {
          XTX[i][j] += XMatrix[k][i] * XMatrix[k][j];
        }
      }
    }

    console.log('X\'X matrix:', XTX);

    // Calculate X'y
    const XTy = Array(m).fill(0);
    for (let i = 0; i < m; i++) {
      for (let k = 0; k < n; k++) {
        XTy[i] += XMatrix[k][i] * yVector[k];
      }
    }

    console.log('X\'y vector:', XTy);

    try {
      // Calculate (X'X)^-1
      const XTXInv = this.invertMatrix(XTX);
      console.log('(X\'X)^-1 matrix:', XTXInv);

      // Calculate beta = (X'X)^-1 X'y
      const beta = Array(m).fill(0);
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < m; j++) {
          beta[i] += XTXInv[i][j] * XTy[j];
        }
      }

      console.log('Beta coefficients:', beta);

      // Calculate R-squared
      const yMean = yVector.reduce((sum, val) => sum + val, 0) / n;
      const yPred = XMatrix.map(row => 
        beta[0] + beta[1] * row[1] + beta[2] * row[2]
      );
      
      const ssRes = yVector.reduce((sum, val, i) => sum + Math.pow(val - yPred[i], 2), 0);
      const ssTot = yVector.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
      const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

      console.log('R-squared:', rSquared);

      return {
        alpha: beta[0],
        beta1: beta[1],
        beta2: beta[2],
        rSquared: Math.max(0, Math.min(1, rSquared))
      };
    } catch (error) {
      console.error('Matrix inversion failed:', error);
      // Fallback to simple linear regression
      return this.performSimpleRegression(X, y);
    }
  }

  private performSimpleRegression(X: number[][], y: number[]): {
    alpha: number;
    beta1: number;
    beta2: number;
    rSquared: number;
  } {
    console.log('Falling back to simple regression');
    
    // Simple linear regression: y = alpha + beta1 * returns + beta2 * stdDev
    const n = X.length;
    
    // Calculate means
    const x1Mean = X.reduce((sum, row) => sum + row[1], 0) / n; // returns mean
    const x2Mean = X.reduce((sum, row) => sum + row[2], 0) / n; // stdDev mean
    const yMean = y.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate coefficients using normal equations
    let sumX1X1 = 0, sumX1X2 = 0, sumX2X2 = 0;
    let sumX1Y = 0, sumX2Y = 0;
    
    for (let i = 0; i < n; i++) {
      const x1 = X[i][1] - x1Mean;
      const x2 = X[i][2] - x2Mean;
      const yVal = y[i] - yMean;
      
      sumX1X1 += x1 * x1;
      sumX1X2 += x1 * x2;
      sumX2X2 += x2 * x2;
      sumX1Y += x1 * yVal;
      sumX2Y += x2 * yVal;
    }
    
    // Solve for beta1 and beta2
    const det = sumX1X1 * sumX2X2 - sumX1X2 * sumX1X2;
    if (Math.abs(det) < 1e-10) {
      console.log('Determinant too small, using zero coefficients');
      return { alpha: yMean, beta1: 0, beta2: 0, rSquared: 0 };
    }
    
    const beta1 = (sumX1Y * sumX2X2 - sumX2Y * sumX1X2) / det;
    const beta2 = (sumX2Y * sumX1X1 - sumX1Y * sumX1X2) / det;
    const alpha = yMean - beta1 * x1Mean - beta2 * x2Mean;
    
    // Calculate R-squared
    const yPred = X.map(row => alpha + beta1 * row[1] + beta2 * row[2]);
    const ssRes = y.reduce((sum, val, i) => sum + Math.pow(val - yPred[i], 2), 0);
    const ssTot = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
    
    console.log('Simple regression results:', { alpha, beta1, beta2, rSquared });
    
    return {
      alpha,
      beta1,
      beta2,
      rSquared: Math.max(0, Math.min(1, rSquared))
    };
  }

  private invertMatrix(matrix: number[][]): number[][] {
    const n = matrix.length;
    const identity = Array(n).fill(null).map((_, i) => 
      Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
    );

    // Create augmented matrix [A|I]
    const augmented = matrix.map((row, i) => [...row, ...identity[i]]);

    // Gaussian elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      
      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      // Make diagonal 1
      const pivot = augmented[i][i];
      if (Math.abs(pivot) < 1e-10) {
        throw new Error('Matrix is singular');
      }
      
      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }

      // Eliminate column
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }

    // Extract inverse matrix
    return augmented.map(row => row.slice(n));
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
