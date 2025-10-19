import { Injectable, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<{ url: string; key: string }> {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'audio/mpeg',
      'audio/wav',
      'application/pdf',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('File type not allowed');
    }

    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large');
    }

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = join(this.uploadDir, fileName);
    const relativePath = `${this.uploadDir}/${fileName}`;

    try {
      await fs.writeFile(filePath, file.buffer);
      return {
        url: `/api/v1/files/${fileName}`,
        key: relativePath,
      };
    } catch (error) {
      throw new BadRequestException('File upload failed');
    }
  }

  async getFile(fileName: string): Promise<Buffer> {
    const filePath = join(this.uploadDir, fileName);
    
    try {
      await fs.access(filePath);
      return await fs.readFile(filePath);
    } catch (error) {
      throw new BadRequestException('File not found');
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    // For local storage, we don't need signed URLs
    // Return the direct URL to the file
    const fileName = key.split('/').pop();
    return `/api/v1/files/${fileName}`;
  }

  async deleteFile(key: string): Promise<void> {
    const fileName = key.split('/').pop();
    const filePath = join(this.uploadDir, fileName);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      throw new BadRequestException('Failed to delete file');
    }
  }

  async getFileInfo(fileName: string): Promise<{ size: number; mimetype: string }> {
    const filePath = join(this.uploadDir, fileName);
    
    try {
      const stats = await fs.stat(filePath);
      
      // Try to determine mimetype from file extension
      const extension = fileName.split('.').pop()?.toLowerCase();
      let mimetype = 'application/octet-stream';
      
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          mimetype = 'image/jpeg';
          break;
        case 'png':
          mimetype = 'image/png';
          break;
        case 'gif':
          mimetype = 'image/gif';
          break;
        case 'pdf':
          mimetype = 'application/pdf';
          break;
        case 'mp3':
          mimetype = 'audio/mpeg';
          break;
        case 'wav':
          mimetype = 'audio/wav';
          break;
      }

      return {
        size: stats.size,
        mimetype,
      };
    } catch (error) {
      throw new BadRequestException('File not found');
    }
  }
}