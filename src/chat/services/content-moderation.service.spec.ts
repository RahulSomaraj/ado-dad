import { Test, TestingModule } from '@nestjs/testing';
import { ContentModerationService } from './content-moderation.service';

describe('ContentModerationService', () => {
    let service: ContentModerationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ContentModerationService],
        }).compile();

        service = module.get<ContentModerationService>(ContentModerationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('moderateContent', () => {
        it('should approve clean content', async () => {
            const result = await service.moderateContent('Hello, how are you?', 'user123');
            expect(result.isApproved).toBe(true);
            expect(result.flags).toHaveLength(0);
        });

        it('should flag and reject profanity', async () => {
            const result = await service.moderateContent('You are a fucking asshole', 'user123');
            expect(result.isApproved).toBe(false);
            expect(result.flags).toContain('profanity_detected');
        });

        it('should flag spam indicators', async () => {
            const result = await service.moderateContent('Buy now, click here for limited time offer!', 'user123');
            expect(result.flags).toContain('spam_indicators');
        });

        it('should flag PII', async () => {
            const result = await service.moderateContent('My phone is 123-456-7890 and email is test@test.com', 'user123');
            expect(result.flags).toContain('pii_detected');
        });

        it('should flag excessive repetition', async () => {
            const result = await service.moderateContent('hello hello hello hello hello hello hello', 'user123');
            expect(result.flags).toContain('excessive_repetition');
        });

        it('should flag excessive caps', async () => {
            const result = await service.moderateContent('HELLO THIS IS A VERY LOUD MESSAGE', 'user123');
            expect(result.flags).toContain('excessive_caps');
        });
    });

    describe('moderateFile', () => {
        it('should approve small valid images', async () => {
            const mockFile = {
                size: 1024,
                mimetype: 'image/jpeg',
                originalname: 'test.jpg',
            } as any;
            const result = await service.moderateFile(mockFile);
            expect(result.isApproved).toBe(true);
        });

        it('should reject large files', async () => {
            const mockFile = {
                size: 20 * 1024 * 1024,
                mimetype: 'image/jpeg',
                originalname: 'large.jpg',
            } as any;
            const result = await service.moderateFile(mockFile);
            expect(result.flags).toContain('file_too_large');
        });

        it('should reject invalid file types', async () => {
            const mockFile = {
                size: 1024,
                mimetype: 'application/octet-stream',
                originalname: 'test.exe',
            } as any;
            const result = await service.moderateFile(mockFile);
            expect(result.flags).toContain('invalid_file_type');
        });

        it('should reject suspicious filenames', async () => {
            const mockFile = {
                size: 1024,
                mimetype: 'image/jpeg',
                originalname: 'virus.exe.jpg',
            } as any;
            const result = await service.moderateFile(mockFile);
            expect(result.flags).toContain('suspicious_filename');
        });
    });
});
