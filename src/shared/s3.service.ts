import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class S3Service {
  private s3: S3Client;
  private bucketName: string;

  constructor() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.AWS_S3_BUCKET_NAME) {
      throw new Error("Missing AWS configuration in environment variables.");
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

  async uploadFile(file: Express.Multer.File): Promise<string> {
    try {
      if (!file) {
        throw new Error("File is missing.");
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
      console.error("S3 Upload Error:", error);
      throw new InternalServerErrorException("Error uploading file to S3.");
    }
  }
}
