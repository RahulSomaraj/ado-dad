import { Injectable, Logger } from '@nestjs/common';

export interface ModerationResult {
  isApproved: boolean;
  flags: string[];
  score: number; // 0-100, higher = more concerning
  reason?: string;
}

/**
 * Chat text moderation.
 *
 * Policy (chat redesign D6): only strong profanity/abuse BLOCKS a message.
 * Everything else — links, phone numbers, emails, "hate/kill/die", repetition,
 * caps — is recorded in `flags` for review but the message is delivered.
 * Buyers and sellers legitimately share numbers and say "I'd hate to miss this".
 */
@Injectable()
export class ContentModerationService {
  private readonly logger = new Logger(ContentModerationService.name);

  /** Blocking: strong profanity / slurs only. */
  private readonly blockingPatterns = [
    /\b(fuck(?:ing|er|ed)?|motherfucker|bitch|asshole|cunt|dickhead|pussy)\b/i,
  ];

  /** Non-blocking signals, name → pattern. */
  private readonly flagPatterns: Array<[string, RegExp]> = [
    ['mild_profanity', /\b(shit|shitty|dick)\b/i],
    ['violent_language', /\b(kill|die|hate)\b/i],
    ['link', /(https?:\/\/[^\s]+|www\.[^\s]+)/i],
    ['email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/],
    // Indian and international phone shapes: 98470 12345, +91 9847012345, 0484-2345678
    ['phone', /(?:\+?\d[\s-]?){10,13}/],
    ['very_long_word', /\w{30,}/],
  ];

  async moderateContent(content: string, userId: string): Promise<ModerationResult> {
    const flags: string[] = [];
    let score = 0;

    try {
      if (this.blockingPatterns.some((p) => p.test(content))) {
        flags.push('profanity_detected');
        score = 100;
      }

      for (const [flag, pattern] of this.flagPatterns) {
        if (pattern.test(content)) {
          flags.push(flag);
          score += 10;
        }
      }

      const words = content.toLowerCase().split(/\s+/).filter(Boolean);
      if (words.length) {
        const counts = new Map<string, number>();
        for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
        if (Math.max(...counts.values()) > 8) {
          flags.push('excessive_repetition');
          score += 10;
        }
      }

      const letters = content.replace(/[^A-Za-z]/g, '');
      if (letters.length > 12 && (content.match(/[A-Z]/g) || []).length / letters.length > 0.8) {
        flags.push('excessive_caps');
        score += 5;
      }

      const isApproved = !flags.includes('profanity_detected');
      if (!isApproved) {
        // Log the decision, never the content.
        this.logger.warn(`Chat message blocked for user ${userId}: flags=${flags.join(',')}`);
      }

      return {
        isApproved,
        flags,
        score: Math.min(score, 100),
        reason: isApproved ? undefined : 'Message contains language that is not allowed',
      };
    } catch (error) {
      this.logger.error(`Error in content moderation: ${(error as Error).message}`);
      // Fail open — never lose a message because moderation crashed.
      return { isApproved: true, flags: ['moderation_error'], score: 0 };
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
