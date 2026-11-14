import { ChatGateway } from './chat.gateway';
import { ChatError, ChatErrorCode } from './chat-errors';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: any;
  let messaging: any;
  let events: any;
  let auth: any;
  let limiter: any;
  let client: any;

  beforeEach(() => {
    chatService = {
      getRoomForParticipant: jest.fn().mockResolvedValue({ roomId: 'r1', initiatorId: 'u1', adPosterId: 'u2' }),
      isParticipant: jest.fn().mockReturnValue(true),
      createChatRoom: jest.fn().mockResolvedValue({ roomId: 'r1' }),
      getRoomView: jest.fn().mockResolvedValue({ roomId: 'r1' }),
      getUserChatRooms: jest.fn().mockResolvedValue([]),
      getRoomMessages: jest.fn().mockResolvedValue({ messages: [{ id: 'm' }], nextCursor: null, hasMore: false }),
    };
    messaging = { send: jest.fn().mockResolvedValue({ id: 'm1' }), markRead: jest.fn().mockResolvedValue({ unreadCount: 0 }) };
    events = { attach: jest.fn() };
    auth = {
      authenticate: jest.fn().mockResolvedValue({ ok: true, user: { id: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 } }),
      isExpired: jest.fn((u: any) => !!u?.exp && u.exp * 1000 <= Date.now()),
    };
    limiter = { consume: jest.fn().mockResolvedValue(undefined) };
    gateway = new ChatGateway(chatService, messaging, events, auth, limiter);
    client = {
      id: 's1',
      data: { user: { id: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 } },
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    };
  });

  describe('handleConnection', () => {
    it('joins the user channel on success', async () => {
      client.data = {};
      await gateway.handleConnection(client);
      expect(client.join).toHaveBeenCalledWith('user:u1');
      expect(client.emit).toHaveBeenCalledWith('connected', expect.objectContaining({ userId: 'u1' }));
    });

    it('emits auth_error with the reason and disconnects', async () => {
      auth.authenticate.mockResolvedValue({ ok: false, code: ChatErrorCode.TOKEN_EXPIRED });
      await gateway.handleConnection(client);
      expect(client.emit).toHaveBeenCalledWith('auth_error', { code: 'TOKEN_EXPIRED' });
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('sendMessage', () => {
    it('acks with the stored message', async () => {
      const ack = await gateway.handleSendMessage(client, { roomId: 'r1', content: 'hi', type: 'text' as any, clientMessageId: 'abcdefgh' });
      expect(ack).toEqual({ success: true, message: { id: 'm1' } });
      expect(messaging.send).toHaveBeenCalledWith('r1', 'u1', { content: 'hi', type: 'text', clientMessageId: 'abcdefgh' });
      expect(client.emit).toHaveBeenCalledWith('sendMessageResponse', ack);
    });

    it('acks errors with a code instead of staying silent (F-01)', async () => {
      messaging.send.mockRejectedValue(new ChatError(ChatErrorCode.CONTENT_BLOCKED, 'Message not allowed'));
      const ack = await gateway.handleSendMessage(client, { roomId: 'r1', content: 'x', type: 'text' as any });
      expect(ack).toEqual({ success: false, code: 'CONTENT_BLOCKED', error: 'Message not allowed' });
    });

    it('rejects an expired session with auth_error (F-02)', async () => {
      client.data.user.exp = Math.floor(Date.now() / 1000) - 5;
      const ack = await gateway.handleSendMessage(client, { roomId: 'r1', content: 'x', type: 'text' as any });
      expect(ack).toMatchObject({ success: false, code: 'TOKEN_EXPIRED' });
      expect(client.emit).toHaveBeenCalledWith('auth_error', { code: 'TOKEN_EXPIRED' });
      expect(messaging.send).not.toHaveBeenCalled();
    });

    it('returns RATE_LIMITED acks', async () => {
      limiter.consume.mockRejectedValue(new ChatError(ChatErrorCode.RATE_LIMITED, 'slow down'));
      const ack = await gateway.handleSendMessage(client, { roomId: 'r1', content: 'x', type: 'text' as any });
      expect(ack).toMatchObject({ success: false, code: 'RATE_LIMITED' });
    });
  });

  it('joinChatRoom acks and still emits the legacy response', async () => {
    const ack = await gateway.handleJoinChatRoom(client, { roomId: 'r1' });
    expect(ack).toMatchObject({ success: true, roomId: 'r1', userRole: 'initiator' });
    expect(client.join).toHaveBeenCalledWith('r1');
    expect(client.emit).toHaveBeenCalledWith('joinChatRoomResponse', ack);
  });

  it('joinChatRoom refuses non-participants', async () => {
    chatService.getRoomForParticipant.mockRejectedValue(new ChatError(ChatErrorCode.NOT_PARTICIPANT, 'no'));
    const ack = await gateway.handleJoinChatRoom(client, { roomId: 'r1' });
    expect(ack).toMatchObject({ success: false, code: 'NOT_PARTICIPANT' });
    expect(client.join).not.toHaveBeenCalled();
  });

  it('markChatRoomRead is handled (was missing)', async () => {
    const ack = await gateway.handleMarkRead(client, { roomId: 'r1' });
    expect(ack).toMatchObject({ success: true, unreadCount: 0 });
  });

  it('legacy getRoomMessages returns both `messages` and `data`', async () => {
    const ack: any = await gateway.handleGetRoomMessages(client, { roomId: 'r1' });
    expect(ack.messages).toEqual(ack.data);
  });

  it('createChatRoom acks the room view', async () => {
    const ack: any = await gateway.handleCreateChatRoom(client, { adId: '507f1f77bcf86cd799439011' });
    expect(ack).toMatchObject({ success: true, data: { roomId: 'r1' } });
  });
});
