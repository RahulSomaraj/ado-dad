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
import { existsSync } from 'fs';

@ApiTags('Upload')
@Controller('upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SHOWROOM, UserType.USER, UserType.SUPER_ADMIN, UserType.ADMIN)
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file to S3' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const fileUrl = await this.s3Service.uploadFile(file);
    return { fileUrl };
  }

  @Get('presigned-url')
  @ApiOperation({ summary: 'Get a presigned URL for file upload' })
  async getPresignedUrl(
    @Query('fileName') fileName: string,
    @Query('fileType') fileType: string,
  ) {
    return { url: await this.s3Service.getPresignedUrl(fileName, fileType) };
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
}
