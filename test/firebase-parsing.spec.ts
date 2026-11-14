import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../src/firebase/firebase.service';
import * as admin from 'firebase-admin';

jest.mock('firebase-admin', () => ({
    apps: [],
    app: jest.fn(),
    credential: {
        cert: jest.fn(),
    },
    initializeApp: jest.fn(),
}));

describe('FirebaseService (Parsing Logic)', () => {
    let service: FirebaseService;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FirebaseService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<FirebaseService>(FirebaseService);
        configService = module.get<ConfigService>(ConfigService);

        // Clear mocks
        jest.clearAllMocks();
        (admin.apps as any) = [];
    });

    it('should correctly parse a key with escaped newlines', () => {
        const rawKey = '-----BEGIN PRIVATE KEY-----\\nMIIEv...\\n-----END PRIVATE KEY-----';
        const expectedKey = '-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----';

        configService.get = jest.fn((key: string) => {
            if (key === 'FIREBASE_PROJECT_ID') return 'test-project';
            if (key === 'FIREBASE_CLIENT_EMAIL') return 'test@email.com';
            if (key === 'FIREBASE_PRIVATE_KEY') return rawKey;
            return null;
        });

        service.onModuleInit();

        expect(admin.initializeApp).toHaveBeenCalledWith(
            expect.objectContaining({
                credential: expect.anything(),
            })
        );

        expect(admin.credential.cert).toHaveBeenCalledWith(
            expect.objectContaining({
                privateKey: expectedKey,
            })
        );
    });

    it('should correctly parse a key wrapped in literal quotes', () => {
        const rawKey = '"-----BEGIN PRIVATE KEY-----\\nMIIEv...\\n-----END PRIVATE KEY-----"';
        const expectedKey = '-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----';

        configService.get = jest.fn((key: string) => {
            if (key === 'FIREBASE_PROJECT_ID') return 'test-project';
            if (key === 'FIREBASE_CLIENT_EMAIL') return 'test@email.com';
            if (key === 'FIREBASE_PRIVATE_KEY') return rawKey;
            return null;
        });

        service.onModuleInit();

        expect(admin.credential.cert).toHaveBeenCalledWith(
            expect.objectContaining({
                privateKey: expectedKey,
            })
        );
    });

    it('should trim whitespace from the key', () => {
        const rawKey = '  -----BEGIN PRIVATE KEY-----\\n-----END PRIVATE KEY-----  ';
        const expectedKey = '-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----';

        configService.get = jest.fn((key: string) => {
            if (key === 'FIREBASE_PROJECT_ID') return 'test-project';
            if (key === 'FIREBASE_CLIENT_EMAIL') return 'test@email.com';
            if (key === 'FIREBASE_PRIVATE_KEY') return rawKey;
            return null;
        });

        service.onModuleInit();

        expect(admin.credential.cert).toHaveBeenCalledWith(
            expect.objectContaining({
                privateKey: expectedKey,
            })
        );
    });
});
