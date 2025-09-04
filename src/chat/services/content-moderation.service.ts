import { Injectable, Logger } from '@nestjs/common';

export interface ModerationResult {
  isApproved: boolean;
  flags: string[];
  score: number; // 0-100, higher = more concerning
  reason?: string;
}

@Injectable()
export class ContentModerationService {
  private readonly logger = new Logger(ContentModerationService.name);

  // Simple profanity filter (in production, use a proper library)
  private readonly profanityPatterns = [
    /\b(fuck|shit|bitch|asshole|dick|pussy)\b/gi,
    /\b(kill|die|hate)\b/gi,
  ];

  // Spam patterns
  private readonly spamPatterns = [
    /\b(buy\s+now|click\s+here|limited\s+time|act\s+now)\b/gi,
    /(https?:\/\/[^\s]+)/g, // URLs
    /(\w{20,})/g, // Very long words
  ];

  // PII patterns
  private readonly piiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{3}-\d{3}-\d{4}\b/g, // Phone
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  ];

  async moderateContent(
    content: string,
    userId: string,
  ): Promise<ModerationResult> {
    const flags: string[] = [];
    let score = 0;

    try {
      // Check content length
      if (content.length > 1000) {
        flags.push('content_too_long');
        score += 20;
      }

      if (content.length < 2) {
        flags.push('content_too_short');
        score += 10;
      }

      // Check for profanity
      const profanityFound = this.profanityPatterns.some((pattern) =>
        pattern.test(content),
      );
      if (profanityFound) {
        flags.push('profanity_detected');
        score += 40;
      }

      // Check for spam indicators
      const spamFound = this.spamPatterns.some((pattern) =>
        pattern.test(content),
      );
      if (spamFound) {
        flags.push('spam_indicators');
        score += 30;
      }

      // Check for PII
      const piiFound = this.piiPatterns.some((pattern) =>
        pattern.test(content),
      );
      if (piiFound) {
        flags.push('pii_detected');
        score += 50;
      }

      // Check for excessive repetition
      const words = content.toLowerCase().split(/\s+/);
      const wordCount = new Map<string, number>();
      words.forEach((word) => {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      });

      const maxRepetition = Math.max(...wordCount.values());
      if (maxRepetition > 5) {
        flags.push('excessive_repetition');
        score += 25;
      }

      // Check for all caps
      const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
      if (capsRatio > 0.7 && content.length > 10) {
        flags.push('excessive_caps');
        score += 15;
      }

      // Determine if content is approved
      const isApproved = score < 70; // Threshold for approval

      // Log moderation results for monitoring
      this.logger.log(
        `Content moderation for user ${userId}: score=${score}, approved=${isApproved}, flags=${flags.join(',')}`,
      );

      return {
        isApproved,
        flags,
        score,
        reason:
          flags.length > 0 ? `Content flagged: ${flags.join(', ')}` : undefined,
      };
    } catch (error) {
      this.logger.error(`Error in content moderation: ${error.message}`);
      // Fail open - approve content if moderation fails
      return {
        isApproved: true,
        flags: ['moderation_error'],
        score: 0,
        reason: 'Moderation service error, content approved',
      };
    }
  }

  async moderateFile(file: Express.Multer.File): Promise<ModerationResult> {
    const flags: string[] = [];
    let score = 0;

    try {
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        flags.push('file_too_large');
        score += 40;
      }

      // Check file type
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        flags.push('invalid_file_type');
        score += 50;
      }

      // Check filename for suspicious patterns
      const suspiciousPatterns = [
        /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|msi|dll|sys)$/i,
        /(virus|malware|hack|crack|keygen)/i,
      ];

      const filenameSuspicious = suspiciousPatterns.some((pattern) =>
        pattern.test(file.originalname),
      );
      if (filenameSuspicious) {
        flags.push('suspicious_filename');
        score += 60;
      }

      const isApproved = score < 70;

      this.logger.log(
        `File moderation: score=${score}, approved=${isApproved}, flags=${flags.join(',')}`,
      );

      return {
        isApproved,
        flags,
        score,
        reason:
          flags.length > 0 ? `File flagged: ${flags.join(', ')}` : undefined,
      };
    } catch (error) {
      this.logger.error(`Error in file moderation: ${error.message}`);
      return {
        isApproved: true,
        flags: ['moderation_error'],
        score: 0,
        reason: 'File moderation service error, file approved',
      };
    }
  }

  // Get moderation statistics for monitoring
  getModerationStats() {
    return {
      totalChecks: 0, // Would be implemented with actual tracking
      flaggedContent: 0,
      averageScore: 0,
      topFlags: [],
    };
  }
}
