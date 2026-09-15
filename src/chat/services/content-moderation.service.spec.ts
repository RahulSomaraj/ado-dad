import { ContentModerationService } from './content-moderation.service';

describe('ContentModerationService', () => {
  const service = new ContentModerationService();

  it('approves clean content', async () => {
    const r = await service.moderateContent('Hello, how are you?', 'u');
    expect(r).toMatchObject({ isApproved: true, flags: [] });
  });

  it('blocks strong profanity', async () => {
    const r = await service.moderateContent('You are a fucking asshole', 'u');
    expect(r.isApproved).toBe(false);
    expect(r.flags).toContain('profanity_detected');
  });

  it.each([
    ["I'd hate to miss this one, can I come today?", 'violent_language'],
    ['My number is 98470 12345', 'phone'],
    ['Call +91 9847012345', 'phone'],
    ['mail me at buyer@example.com', 'email'],
    ['photos here https://example.com/car', 'link'],
  ])('flags but delivers: %s', async (text, flag) => {
    const r = await service.moderateContent(text, 'u');
    expect(r.isApproved).toBe(true);
    expect(r.flags).toContain(flag);
  });

  it('does not flag prices as phone numbers', async () => {
    const r = await service.moderateContent('Final price 5,40,000 or 540000', 'u');
    expect(r.flags).not.toContain('phone');
  });

  it('flags excessive repetition and caps without blocking', async () => {
    const rep = await service.moderateContent(Array(10).fill('hello').join(' '), 'u');
    expect(rep.flags).toContain('excessive_repetition');
    const caps = await service.moderateContent('HELLO THIS IS A VERY LOUD MESSAGE', 'u');
    expect(caps).toMatchObject({ isApproved: true });
    expect(caps.flags).toContain('excessive_caps');
  });
});
