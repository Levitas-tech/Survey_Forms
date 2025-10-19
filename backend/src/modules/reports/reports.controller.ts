import { Controller, Get, Param, UseGuards, Res, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('forms/:formId/aggregate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.REVIEWER)
  @ApiOperation({ summary: 'Get aggregated report for a form (Admin only)' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  async getAggregateReport(@Param('formId') formId: string, @Request() req) {
    return this.reportsService.getAggregateReport(formId, req.user);
  }

  @Get('forms/:formId/export')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export form responses to CSV (Admin only)' })
  @ApiResponse({ status: 200, description: 'CSV export generated successfully' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  async exportToCSV(@Param('formId') formId: string, @Request() req, @Res() res: Response) {
    const exportData = await this.reportsService.exportToCSV(formId, req.user);
    
    res.setHeader('Content-Type', exportData.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.send(exportData.content);
  }
}
