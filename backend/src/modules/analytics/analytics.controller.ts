import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('risk-aversion/:formId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get risk aversion analysis for a form (Admin only)' })
  @ApiResponse({ status: 200, description: 'Risk aversion analysis retrieved successfully' })
  async getRiskAversionAnalysis(@Param('formId') formId: string) {
    return this.analyticsService.getRiskAversionAnalysis(formId);
  }

  @Get('risk-aversion/:formId/chart')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get risk aversion chart data for a form (Admin only)' })
  @ApiResponse({ status: 200, description: 'Risk aversion chart data retrieved successfully' })
  async getRiskAversionChartData(@Param('formId') formId: string) {
    return this.analyticsService.getRiskAversionChartData(formId);
  }

  @Get('individual-risk/:responseId')
  @ApiOperation({ summary: 'Get individual risk analysis for a response' })
  @ApiResponse({ status: 200, description: 'Individual risk analysis retrieved successfully' })
  async getIndividualRiskAnalysis(
    @Param('responseId') responseId: string,
    @Request() req
  ) {
    return this.analyticsService.getIndividualRiskAnalysis(responseId, req.user.id);
  }

  @Post('admin/risk-analysis')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Perform risk analysis on all responses (Admin only)' })
  @ApiResponse({ status: 200, description: 'Risk analysis completed successfully' })
  async performRiskAnalysis() {
    return this.analyticsService.performRiskAnalysis();
  }
}
