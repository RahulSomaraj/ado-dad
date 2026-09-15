import { safeFilename } from '../common/security/path-safety.util';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
  HeadObjectCommand,
  DeleteObjectCommand,
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

      const fileKey = `${uuidv4()}-${safeFilename(file.originalname)}`;

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

  /** Public object URL for a key in this bucket. */
  getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }

  get bucket(): string {
    return this.bucketName;
  }

  /** Hostnames that serve this bucket's objects (plus optional CDN hosts from CHAT_MEDIA_HOSTS). */
  getMediaHosts(): string[] {
    const region = process.env.AWS_REGION;
    const extra = (process.env.CHAT_MEDIA_HOSTS || '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
    return [
      `${this.bucketName}.s3.${region}.amazonaws.com`,
      `${this.bucketName}.s3.amazonaws.com`,
      ...extra,
    ].map((h) => h.toLowerCase());
  }

  /** True when `rawUrl` is an https URL served from this bucket (see getMediaHosts). */
  isOwnMediaUrl(rawUrl: string): boolean {
    if (typeof rawUrl !== 'string' || rawUrl.length > 2048) return false;
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== 'https:') return false;
      return this.getMediaHosts().includes(url.hostname.toLowerCase());
    } catch {
      return false;
    }
  }

  /**
   * HEAD an object. Resolves null when it does not exist; rethrows anything else.
   */
  async headObject(
    key: string,
  ): Promise<{ contentLength: number; contentType: string } | null> {
    try {
      const out = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: key }),
      );
      return {
        contentLength: Number(out.ContentLength ?? 0),
        contentType: String(out.ContentType ?? '').toLowerCase(),
      };
    } catch (error: any) {
      const status = error?.$metadata?.httpStatusCode;
      if (status === 404 || error?.name === 'NotFound' || error?.name === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  }

  /** Delete an object; missing objects are not an error in S3. */
  async deleteObject(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
  }

  /**
   * Presigned PUT for an exact key chosen by the server. The client must send
   * exactly `contentType` as its Content-Type header (it is part of the signature).
   */
  async getPresignedPutUrlForKey(key: string, contentType: string, expiresIn = 300): Promise<string> {
    try {
      return await getSignedUrl(
        this.s3,
        new PutObjectCommand({ Bucket: this.bucketName, Key: key, ContentType: contentType }),
        { expiresIn },
      );
    } catch (error) {
      console.error('S3 Pre-signed URL Error:', (error as Error).message);
      throw new InternalServerErrorException('Error generating pre-signed URL.');
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
      const fileKey = `uploads/${uuidv4()}-${safeFilename(fileName)}`;

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
