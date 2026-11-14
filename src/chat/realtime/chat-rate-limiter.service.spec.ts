import { ChatRateLimiterService } from './chat-rate-limiter.service';

describe('ChatRateLimiterService', () => {
  it('uses Redis counts and throws RATE_LIMITED past the limit', async () => {
    let n = 0;
    const redis: any = { incrementRateLimit: jest.fn(async () => ++n) };
    const limiter = new ChatRateLimiterService(redis);
    for (let i = 0; i < 20; i++) await limiter.consume('sendMessage', 'u');
    await expect(limiter.consume('sendMessage', 'u')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('falls back to memory when Redis throws', async () => {
    const redis: any = { incrementRateLimit: jest.fn().mockRejectedValue(new Error('down')) };
    const limiter = new ChatRateLimiterService(redis);
    for (let i = 0; i < 10; i++) await limiter.consume('createRoom', 'u');
    await expect(limiter.consume('createRoom', 'u')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    await expect(limiter.consume('createRoom', 'other')).resolves.toBeUndefined();
  });
});
