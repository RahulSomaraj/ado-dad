import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class S3Service {
  private s3: S3Client;
  private bucketName: string;

  constructor() {
    if (
      !process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY ||
      !process.env.AWS_REGION ||
      !process.env.AWS_S3_BUCKET_NAME
    ) {
      throw new Error('Missing AWS configuration in environment variables.');
    }

    this.s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    this.bucketName = process.env.AWS_S3_BUCKET_NAME;
  }

  /**
   * Directly uploads a file to S3 using the file buffer.
   * @param file - Express.Multer.File containing file data.
   * @returns The public URL of the uploaded file.
   */
  async uploadFile(file: Express.Multer.File): Promise<string> {
    try {
      if (!file) {
        throw new Error('File is missing.');
      }

      const fileKey = `${uuidv4()}-${file.originalname}`;

      const params: PutObjectCommandInput = {
        Bucket: this.bucketName,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // Make files public (if needed)
      };

      await this.s3.send(new PutObjectCommand(params));

      return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    } catch (error) {
      console.error('S3 Upload Error:', error);
      throw new InternalServerErrorException('Error uploading file to S3.');
    }
  }

  /**
   * Generates a pre-signed URL for uploading files to S3.
   * The URL will be valid for 60 seconds.
   *
   * @param fileName - The original name of the file.
   * @param fileType - The MIME type of the file.
   * @returns A promise that resolves to a pre-signed URL.
   */
  async getPresignedUrl(fileName: string, fileType: string): Promise<string> {
    try {
      // Create a unique file key with a UUID prefix
      const fileKey = `uploads/${uuidv4()}-${fileName}`;

      const params = {
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: fileType,
        // Optionally, include ACL if needed (ensure your bucket policy allows it)
        // ACL: 'public-read',
      };

      const signedUrl = await getSignedUrl(
        this.s3,
        new PutObjectCommand(params),
        { expiresIn: 60 }, // URL expires in 60 seconds
      );

      return signedUrl;
    } catch (error) {
      console.error('S3 Pre-signed URL Error:', error);
      throw new InternalServerErrorException(
        'Error generating pre-signed URL.',
      );
    }
  }
}
