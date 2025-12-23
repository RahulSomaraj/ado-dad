import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Param,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from './s3.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { UserType } from '../users/enums/user.types';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { join } from 'path';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SHOWROOM, UserType.USER, UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a file to S3 or local storage (Authenticated)',
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    try {
      // Try S3 first, fallback to local storage
      const fileUrl = await this.s3Service.uploadFile(file);
      return { fileUrl };
    } catch (error) {
      console.error(
        'S3 upload failed, falling back to local storage:',
        (error as any)?.message,
      );
      // Fallback to local storage
      const fileUrl = await this.uploadToLocal(file);
      return { fileUrl };
    }
  }

  // @Get('presigned-url')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserType.SHOWROOM, UserType.USER, UserType.SUPER_ADMIN, UserType.ADMIN)
  // @ApiBearerAuth()
  // @ApiOperation({
  //   summary: 'Get a presigned URL for file upload (Authenticated)',
  // })
  // async getPresignedUrl(
  //   @Query('fileName') fileName: string,
  //   @Query('fileType') fileType: string,
  // ) {
  //   try {
  //     console.log('here');

  //     // Try S3 first, fallback to local endpoint
  //     const url = await this.s3Service.getPresignedUrl(fileName, fileType);
  //     return { url };
  //   } catch (error) {
  //     console.log(
  //       'S3 presigned URL failed, using local endpoint:',
  //       error.message,
  //     );
  //     // Return local upload endpoint as fallback
  //     const fileKey = `${uuidv4()}-${fileName}`;
  //     const localUrl = `/upload/local/${fileKey}`;
  //     return {
  //       url: localUrl,
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': fileType,
  //       },
  //     };
  //   }
  // }

  // Public test endpoints for Swagger testing (no authentication required)
  @Post('test/file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Test file upload (No authentication required)' })
  async testUploadFile(@UploadedFile() file: Express.Multer.File) {
    try {
      // Try S3 first, fallback to local storage
      const fileUrl = await this.s3Service.uploadFile(file);
      return { fileUrl };
    } catch (error) {
      console.error(
        'S3 upload failed, falling back to local storage:',
        (error as any)?.message,
      );
      // Fallback to local storage
      const fileUrl = await this.uploadToLocal(file);
      return { fileUrl };
    }
  }

  @Get('presigned-url')
  @ApiOperation({
    summary: 'Test presigned URL generation (No authentication required)',
  })
  async testGetPresignedUrl(
    @Query('fileName') fileName: string,
    @Query('fileType') fileType: string,
  ) {
    try {
      // Try S3 first, fallback to local endpoint
      const url = await this.s3Service.getPresignedUrl(fileName, fileType);
      return { url };
    } catch (error) {
      console.error(
        'S3 presigned URL failed, using local endpoint:',
        (error as any)?.message,
      );
      // Return local upload endpoint as fallback
      const fileKey = `${uuidv4()}-${fileName}`;
      const localUrl = `/upload/local/${fileKey}`;
      return {
        url: localUrl,
        method: 'POST',
        headers: {
          'Content-Type': fileType,
        },
      };
    }
  }

  @Post('local/:fileKey')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload file to local storage' })
  async uploadToLocal(
    @UploadedFile() file: Express.Multer.File,
    @Param('fileKey') fileKey?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = join(__dirname, '..', '..', 'public', 'uploads');
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const uniqueFileName = fileKey || `${uuidv4()}-${file.originalname}`;
      const filePath = join(uploadsDir, uniqueFileName);

      // Write file to local storage
      writeFileSync(filePath, file.buffer);

      // Return local URL
      const fileUrl = `/uploads/${uniqueFileName}`;
      return { fileUrl };
    } catch (error) {
      console.error('Local upload error:', error);
      throw new BadRequestException('Failed to upload file to local storage');
    }
  }

  @Get('images/:filename')
  async serveImage(@Param('filename') filename: string, @Res() res: Response) {
    // Add CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Accept, Authorization',
    );
    res.header('Access-Control-Max-Age', '86400');

    const imagePath = join(
      __dirname,
      '..',
      '..',
      'public',
      'assets',
      'images',
      filename,
    );

    if (existsSync(imagePath)) {
      res.sendFile(imagePath);
    } else {
      res.status(404).json({ message: 'Image not found' });
    }
  }

  @Get('uploads/:filename')
  async serveUploadedFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Add CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Accept, Authorization',
    );
    res.header('Access-Control-Max-Age', '86400');

    const filePath = join(__dirname, '..', '..', 'public', 'uploads', filename);

    if (existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  }
}
