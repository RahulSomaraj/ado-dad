import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitGuard, RateLimitOptions } from './rate-limit.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, HttpException } from '@nestjs/common';

describe('RateLimitGuard', () => {
    let guard: RateLimitGuard;
    let reflector: Reflector;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RateLimitGuard,
                {
                    provide: Reflector,
                    useValue: {
                        get: jest.fn(),
                    },
                },
            ],
        }).compile();

        guard = module.get<RateLimitGuard>(RateLimitGuard);
        reflector = module.get<Reflector>(Reflector);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    describe('canActivate', () => {
        let mockContext: any;

        beforeEach(() => {
            mockContext = {
                getHandler: jest.fn(),
                switchToHttp: jest.fn().mockReturnThis(),
                getRequest: jest.fn(),
                switchToWs: jest.fn().mockReturnThis(),
                getClient: jest.fn(),
            };
        });

        it('should return true if no rate limit is configured', () => {
            jest.spyOn(reflector, 'get').mockReturnValue(null);
            expect(guard.canActivate(mockContext as ExecutionContext)).toBe(true);
        });

        it('should allow request within rate limit (HTTP)', () => {
            const options: RateLimitOptions = { maxRequests: 2, windowMs: 1000 };
            jest.spyOn(reflector, 'get').mockReturnValue(options);
            mockContext.getRequest.mockReturnValue({ user: { id: 'user1' } });

            expect(guard.canActivate(mockContext as ExecutionContext)).toBe(true);
            expect(guard.canActivate(mockContext as ExecutionContext)).toBe(true);
        });

        it('should throw HttpException if rate limit exceeded (HTTP)', () => {
            const options: RateLimitOptions = { maxRequests: 1, windowMs: 1000 };
            jest.spyOn(reflector, 'get').mockReturnValue(options);
            mockContext.getRequest.mockReturnValue({ user: { id: 'user2' } });

            guard.canActivate(mockContext as ExecutionContext); // First request
            expect(() => guard.canActivate(mockContext as ExecutionContext)).toThrow(HttpException);
        });

        it('should allow request within rate limit (WS)', () => {
            const options: RateLimitOptions = { maxRequests: 2, windowMs: 1000 };
            jest.spyOn(reflector, 'get').mockReturnValue(options);
            mockContext.getRequest.mockReturnValue(null);
            mockContext.getClient.mockReturnValue({ user: { id: 'user3' } });

            expect(guard.canActivate(mockContext as ExecutionContext)).toBe(true);
        });
    });
});
