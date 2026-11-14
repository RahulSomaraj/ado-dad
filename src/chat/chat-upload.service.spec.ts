import { ChatUploadService } from './chat-upload.service';
import { ChatErrorCode } from './chat-errors';

describe('ChatUploadService', () => {
  const s3: any = {
    getPresignedPutUrlForKey: jest.fn().mockResolvedValue('https://signed'),
    getPublicUrl: (k: string) => `https://bucket.s3.ap-south-1.amazonaws.com/${k}`,
  };
  const service = new ChatUploadService(s3);

  it('signs audio/m4a as audio/mp4 and returns the header to send (F-03)', async () => {
    const t = await service.createTicket('chat_a_b_c', { kind: 'audio', mimeType: 'audio/m4a', size: 1000 });
    expect(t.headers['Content-Type']).toBe('audio/mp4');
    expect(s3.getPresignedPutUrlForKey).toHaveBeenCalledWith(expect.stringMatching(/^chat\/chat_a_b_c\/.+\.m4a$/), 'audio/mp4', 300);
    expect(t.url).toContain('/chat/chat_a_b_c/');
  });

  it('rejects unsupported types and oversize files', async () => {
    await expect(service.createTicket('r', { kind: 'image', mimeType: 'image/svg+xml', size: 10 })).rejects.toMatchObject({ code: ChatErrorCode.ATTACHMENT_INVALID });
    await expect(service.createTicket('r', { kind: 'image', mimeType: 'image/jpeg', size: 11 * 1024 * 1024 })).rejects.toMatchObject({ code: ChatErrorCode.ATTACHMENT_INVALID });
  });
});
