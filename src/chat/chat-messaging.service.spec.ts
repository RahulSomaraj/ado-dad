import { ChatMessagingService } from './chat-messaging.service';

describe('ChatMessagingService', () => {
  const lean = (d: any) => ({ select: () => ({ lean: () => ({ exec: async () => d }) }) });
  let chatService: any;
  let events: any;
  let notifier: any;
  let userModel: any;
  let svc: ChatMessagingService;

  beforeEach(() => {
    chatService = {
      sendMessage: jest.fn().mockResolvedValue({ message: { id: 'm1', type: 'text', content: 'hi' }, room: { roomId: 'r1' }, recipientId: 'u2', created: true }),
      markRoomRead: jest.fn().mockResolvedValue({ room: { roomId: 'r1' }, lastReadAt: new Date(), otherUserId: 'u2' }),
      getRoomView: jest.fn(async (_r: string, uid: string) => ({ roomId: 'r1', viewer: uid })),
    };
    events = { toRoom: jest.fn(), toUser: jest.fn() };
    notifier = { notifyNewMessage: jest.fn() };
    userModel = { findById: jest.fn(() => lean({ name: 'Anand K' })) };
    svc = new ChatMessagingService(chatService, events, notifier, userModel);
  });

  it('broadcasts, fans out a per-user view to both users and pushes', async () => {
    await svc.send('r1', 'u1', { content: 'hi' } as any);
    await new Promise((r) => setImmediate(r));
    expect(events.toRoom).toHaveBeenCalledWith('r1', 'message', expect.objectContaining({ id: 'm1' }));
    expect(events.toUser).toHaveBeenCalledWith('u1', 'conversation_updated', { roomId: 'r1', viewer: 'u1' });
    expect(events.toUser).toHaveBeenCalledWith('u2', 'conversation_updated', { roomId: 'r1', viewer: 'u2' });
    expect(notifier.notifyNewMessage).toHaveBeenCalledWith({ roomId: 'r1', recipientId: 'u2', senderName: 'Anand K', preview: 'hi' });
  });

  it('does not re-broadcast or re-push an idempotent replay', async () => {
    chatService.sendMessage.mockResolvedValue({ message: { id: 'm1' }, room: { roomId: 'r1' }, recipientId: 'u2', created: false });
    await svc.send('r1', 'u1', { content: 'hi' } as any);
    expect(events.toRoom).not.toHaveBeenCalled();
    expect(notifier.notifyNewMessage).not.toHaveBeenCalled();
  });

  it('markRead emits messages_read to the room', async () => {
    const res = await svc.markRead('r1', 'u1');
    expect(res.unreadCount).toBe(0);
    expect(events.toRoom).toHaveBeenCalledWith('r1', 'messages_read', expect.objectContaining({ userId: 'u1' }));
  });
});
