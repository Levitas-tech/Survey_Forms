import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Param,
  Get,
  Delete,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Response } from 'express';

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.filesService.uploadFile(file);
  }

  @Get('signed-url/:key')
  @ApiOperation({ summary: 'Get signed URL for file access' })
  @ApiResponse({ status: 200, description: 'Signed URL generated successfully' })
  async getSignedUrl(@Param('key') key: string) {
    const url = await this.filesService.getSignedUrl(key);
    return { url };
  }

  @Get(':fileName')
  @ApiOperation({ summary: 'Get file content' })
  @ApiResponse({ status: 200, description: 'File content retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(@Param('fileName') fileName: string, @Res() res: Response) {
    try {
      const fileBuffer = await this.filesService.getFile(fileName);
      const fileInfo = await this.filesService.getFileInfo(fileName);
      
      res.set({
        'Content-Type': fileInfo.mimetype,
        'Content-Length': fileInfo.size.toString(),
      });
      
      res.send(fileBuffer);
    } catch (error) {
      throw new NotFoundException('File not found');
    }
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async deleteFile(@Param('key') key: string) {
    await this.filesService.deleteFile(key);
    return { message: 'File deleted successfully' };
  }
}
