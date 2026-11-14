import { ChatController } from './chat.controller';
import { ChatError, ChatErrorCode } from './chat-errors';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: any;
  let messaging: any;
  let uploads: any;
  let limiter: any;
  const req = { user: { id: 'u1' } };

  beforeEach(() => {
    chatService = {
      createChatRoom: jest.fn().mockResolvedValue({ roomId: 'r1' }),
      getRoomView: jest.fn().mockResolvedValue({ roomId: 'r1', unreadCount: 0 }),
      listRooms: jest.fn().mockResolvedValue({ rooms: [{ roomId: 'r1' }], nextCursor: 'c' }),
      getRoomMessages: jest.fn().mockResolvedValue({ messages: [], nextCursor: null, hasMore: false }),
      getRoomForParticipant: jest.fn().mockResolvedValue({ roomId: 'r1' }),
      getUnreadSummary: jest.fn().mockResolvedValue({ total: 3, rooms: 2 }),
      findExistingChatRoom: jest.fn().mockResolvedValue(null),
    };
    messaging = { send: jest.fn().mockResolvedValue({ id: 'm1' }), markRead: jest.fn().mockResolvedValue({ unreadCount: 0 }) };
    uploads = { createTicket: jest.fn().mockResolvedValue({ uploadUrl: 'u' }) };
    limiter = { consume: jest.fn().mockResolvedValue(undefined) };
    controller = new ChatController(chatService, messaging, uploads, limiter);
  });

  it('create returns the full room view', async () => {
    const res = await controller.createChatRoom(req, { adId: 'a1' });
    expect(res.data).toEqual({ roomId: 'r1', unreadCount: 0 });
    expect(chatService.createChatRoom).toHaveBeenCalledWith('u1', 'a1');
  });

  it('list keeps `data` as an array and adds nextCursor', async () => {
    const res = await controller.getUserChatRooms(req, { limit: 20 });
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.nextCursor).toBe('c');
  });

  it('send goes through the messaging service after rate limiting', async () => {
    await controller.sendMessage('r1', { content: 'hi', type: 'text' as any, clientMessageId: 'abcdefgh' }, req);
    expect(limiter.consume).toHaveBeenCalledWith('sendMessage', 'u1');
    expect(messaging.send).toHaveBeenCalledWith('r1', 'u1', expect.objectContaining({ content: 'hi' }));
  });

  it('read delegates to messaging', async () => {
    await controller.markRead('r1', { lastMessageId: undefined }, req);
    expect(messaging.markRead).toHaveBeenCalledWith('r1', 'u1', undefined);
  });

  it('upload checks participation before issuing a ticket', async () => {
    await controller.createUpload('r1', { kind: 'image', mimeType: 'image/jpeg', size: 100 }, req);
    expect(chatService.getRoomForParticipant).toHaveBeenCalledWith('r1', 'u1');
    expect(uploads.createTicket).toHaveBeenCalled();
  });

  it('keeps ChatError status codes (no blanket 400)', async () => {
    chatService.getRoomMessages.mockRejectedValue(new ChatError(ChatErrorCode.NOT_PARTICIPANT, 'no'));
    await expect(controller.getRoomMessages('r1', {}, req)).rejects.toMatchObject({ status: 403 });
  });

  it('throws UNAUTHORIZED without a user', async () => {
    await expect(controller.getUnreadCount({})).rejects.toMatchObject({ code: ChatErrorCode.UNAUTHORIZED });
  });
});
