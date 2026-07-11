import { safeFilename } from '../common/security/path-safety.util';
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
  constructor(private readonly s3Service: S3Service) { }

  @Post('file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SHOWROOM, UserType.USER, UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a file to S3 or local storage (Authenticated)',
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    this.validateUploadedFile(file);
    try {
      // Normalize MIME type for m4a files
      if (file && (file.mimetype === 'audio/x-m4a' || file.mimetype === 'audio/m4a')) {
        file.mimetype = 'audio/mp4';
      }

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SHOWROOM, UserType.USER, UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Test file upload (No authentication required)' })
  async testUploadFile(@UploadedFile() file: Express.Multer.File) {
    this.validateUploadedFile(file);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SHOWROOM, UserType.USER, UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Test presigned URL generation (No authentication required)',
  })
  async testGetPresignedUrl(
    @Query('fileName') fileName: string,
    @Query('fileType') fileType: string,
  ) {
    try {
      // Normalize M4A mime types to audio/mp4 as recommended for better compatibility
      let normalizedType = fileType;
      if (['audio/x-m4a', 'audio/m4a', 'application/octet-stream'].includes(fileType)) {
        // If it's a known M4A type or a generic stream (which mobile often uses), 
        // and its extension (if we had it) would be .m4a or .mp4, we'd normalize here.
        // For presigned URL, we rely mostly on the requested type.
        if (fileType !== 'application/octet-stream') {
          normalizedType = 'audio/mp4';
        }
      }

      // Try S3 first, fallback to local endpoint
      const url = await this.s3Service.getPresignedUrl(fileName, normalizedType);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SHOWROOM, UserType.USER, UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
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
      this.validateUploadedFile(file);
      const uniqueFileName = fileKey
        ? safeFilename(fileKey)
        : `${uuidv4()}-${safeFilename(file.originalname)}`;
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

  private validateUploadedFile(file?: Express.Multer.File): void {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > 15 * 1024 * 1024) {
      throw new BadRequestException('File exceeds the 15MB limit');
    }
    const mt = (file.mimetype || '').toLowerCase();
    const allowed =
      /^(image\/(jpeg|png|webp|gif)|audio\/|video\/|application\/pdf)$/i.test(mt) ||
      mt === 'application/octet-stream';
    if (!allowed) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
    if (
      /\.(exe|bat|cmd|com|sh|js|mjs|php|phtml|jsp|asp|aspx|html?|svg|dll|jar|msi|scr|vbs|ps1)$/i.test(
        file.originalname || '',
      )
    ) {
      throw new BadRequestException('Disallowed file extension');
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

    filename = safeFilename(filename);
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

    filename = safeFilename(filename);
    const filePath = join(__dirname, '..', '..', 'public', 'uploads', filename);

    if (existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  }
}
