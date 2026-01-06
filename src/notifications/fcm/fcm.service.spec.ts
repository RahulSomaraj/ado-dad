import { Test, TestingModule } from '@nestjs/testing';
import { FcmService } from './fcm.service';
import { FcmTokenRepository } from './repositories/fcm-token.repo';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

jest.mock('firebase-admin');

describe('FcmService', () => {
    let service: FcmService;
    let tokenRepo: FcmTokenRepository;

    const mockTokenRepo = {
        upsert: jest.fn(),
        findActiveByUser: jest.fn(),
        deactivate: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn((key: string) => {
            if (key === 'FCM_CONFIG.API_KEY') return 'test-api-key';
            return null;
        }),
    };

    const mockFirebaseAdmin = {
        messaging: jest.fn().mockReturnValue({
            sendEachForMulticast: jest.fn().mockResolvedValue({
                successCount: 1,
                failureCount: 0,
                responses: [{ success: true }],
            }),
            send: jest.fn().mockResolvedValue('fake-message-id'),
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FcmService,
                { provide: FcmTokenRepository, useValue: mockTokenRepo },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: 'FIREBASE_ADMIN', useValue: mockFirebaseAdmin },
            ],
        }).compile();

        service = module.get<FcmService>(FcmService);
        tokenRepo = module.get<FcmTokenRepository>(FcmTokenRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should send push notification to user', async () => {
        const userId = 'user-123';
        const tokens = [{ token: 'token-1' }, { token: 'token-2' }];
        mockTokenRepo.findActiveByUser.mockResolvedValue(tokens);

        await service.sendToUser(userId, 'Title', 'Body');

        expect(mockTokenRepo.findActiveByUser).toHaveBeenCalledWith(userId);
        expect(mockFirebaseAdmin.messaging().sendEachForMulticast).toHaveBeenCalledWith({
            notification: { title: 'Title', body: 'Body' },
            data: {},
            tokens: ['token-1', 'token-2'],
        });
    });
});
