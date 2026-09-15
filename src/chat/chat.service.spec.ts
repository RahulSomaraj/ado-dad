import { Types } from 'mongoose';
import { ChatService } from './chat.service';
import { ChatRoomStatus } from './schemas/chat-room.schema';
import { MessageType } from './schemas/chat-message.schema';
import { ChatError, ChatErrorCode } from './chat-errors';
import { ModerationStatus } from '../users/schemas/user.schema';

const q = (data: any) => {
  const chain: any = {};
  for (const m of ['select', 'lean', 'sort', 'limit']) chain[m] = jest.fn(() => chain);
  chain.exec = jest.fn().mockResolvedValue(data);
  return chain;
};

describe('ChatService', () => {
  const buyer = new Types.ObjectId().toString();
  const seller = new Types.ObjectId().toString();
  const stranger = new Types.ObjectId().toString();
  const adId = new Types.ObjectId().toString();

  let roomModel: any;
  let msgModel: any;
  let adModel: any;
  let userModel: any;
  let moderation: any;
  let s3: any;
  let service: ChatService;
  let room: any;

  beforeEach(() => {
    room = {
      _id: new Types.ObjectId(),
      roomId: `chat_${adId}_${buyer}_${seller}`,
      initiatorId: new Types.ObjectId(buyer),
      adPosterId: new Types.ObjectId(seller),
      adId: new Types.ObjectId(adId),
      participants: [buyer, seller],
      status: ChatRoomStatus.ACTIVE,
      messageCount: 3,
      unreadCounts: new Map([[seller, 2]]),
    };
    roomModel = {
      findOne: jest.fn(() => q(room)),
      create: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
      updateMany: jest.fn().mockResolvedValue({}),
      aggregate: jest.fn(() => q([])),
      bulkWrite: jest.fn().mockResolvedValue({}),
    };
    msgModel = {
      findOne: jest.fn(() => q(null)),
      create: jest.fn(async (d: any) => ({ ...d, _id: new Types.ObjectId(), createdAt: new Date() })),
      aggregate: jest.fn(() => q([])),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
      countDocuments: jest.fn().mockResolvedValue(9),
    };
    adModel = { findById: jest.fn(() => q({ _id: adId, postedBy: seller, isActive: true })) };
    userModel = { findById: jest.fn(() => q({ moderationStatus: ModerationStatus.ACTIVE })) };
    moderation = { moderateContent: jest.fn().mockResolvedValue({ isApproved: true, flags: [], score: 0 }) };
    s3 = { getMediaHosts: () => ['bucket.s3.ap-south-1.amazonaws.com'], bucket: 'bucket' };
    service = new ChatService(roomModel, msgModel, adModel, userModel, moderation, s3);
  });

  const expectCode = async (p: Promise<any>, code: ChatErrorCode) => {
    await expect(p).rejects.toBeInstanceOf(ChatError);
    await p.catch((e) => expect(e.code).toBe(code));
  };

  describe('createChatRoom', () => {
    it('returns the existing room (idempotent)', async () => {
      await expect(service.createChatRoom(buyer, adId)).resolves.toBe(room);
      expect(roomModel.create).not.toHaveBeenCalled();
    });

    it('creates with lastMessageAt set and zeroed unread counters', async () => {
      roomModel.findOne = jest.fn(() => q(null));
      roomModel.create = jest.fn(async (d: any) => d);
      const created: any = await service.createChatRoom(buyer, adId);
      expect(created.lastMessageAt).toBeInstanceOf(Date);
      expect(created.unreadCounts.get(buyer)).toBe(0);
      expect(created.participants).toEqual([buyer, seller]);
    });

    it('refuses a sold ad for a new room', async () => {
      roomModel.findOne = jest.fn(() => q(null));
      adModel.findById = jest.fn(() => q({ _id: adId, postedBy: seller, isActive: true, soldOut: true }));
      await expectCode(service.createChatRoom(buyer, adId), ChatErrorCode.AD_UNAVAILABLE);
    });

    it('404s a missing ad', async () => {
      adModel.findById = jest.fn(() => q(null));
      await expectCode(service.createChatRoom(buyer, adId), ChatErrorCode.AD_NOT_FOUND);
    });
  });

  describe('sendMessage', () => {
    it('stores, updates preview and increments only the recipient unread', async () => {
      const res = await service.sendMessage(room.roomId, buyer, {
        type: MessageType.TEXT,
        content: 'Is it still available?',
        clientMessageId: 'abcDEF123456',
      });
      expect(res.created).toBe(true);
      expect(res.recipientId).toBe(seller);
      expect(res.message.clientMessageId).toBe('abcDEF123456');
      const update = roomModel.updateOne.mock.calls[0][1];
      expect(update.$inc).toEqual({ messageCount: 1, [`unreadCounts.${seller}`]: 1 });
      expect(update.$set.lastMessage.preview).toBe('Is it still available?');
    });

    it('replays an existing clientMessageId without writing', async () => {
      msgModel.findOne = jest.fn(() => q({ _id: new Types.ObjectId(), roomId: room.roomId, senderId: buyer, type: 'text', content: 'hi', clientMessageId: 'abcDEF123456' }));
      const res = await service.sendMessage(room.roomId, buyer, { type: MessageType.TEXT, content: 'hi', clientMessageId: 'abcDEF123456' });
      expect(res.created).toBe(false);
      expect(msgModel.create).not.toHaveBeenCalled();
      expect(roomModel.updateOne).not.toHaveBeenCalled();
    });

    it('rejects non-participants', async () => {
      await expectCode(
        service.sendMessage(room.roomId, stranger, { type: MessageType.TEXT, content: 'hey' }),
        ChatErrorCode.NOT_PARTICIPANT,
      );
    });

    it('rejects closed rooms', async () => {
      room.status = ChatRoomStatus.INACTIVE;
      await expectCode(service.sendMessage(room.roomId, buyer, { type: MessageType.TEXT, content: 'x' }), ChatErrorCode.ROOM_CLOSED);
    });

    it('rejects suspended senders', async () => {
      userModel.findById = jest.fn(() => q({ moderationStatus: ModerationStatus.SUSPENDED, suspendedUntil: new Date(Date.now() + 1e6) }));
      await expectCode(service.sendMessage(room.roomId, buyer, { type: MessageType.TEXT, content: 'x' }), ChatErrorCode.SUSPENDED);
    });

    it('maps moderation blocks to CONTENT_BLOCKED', async () => {
      moderation.moderateContent.mockResolvedValue({ isApproved: false, flags: ['profanity_detected'], score: 100, reason: 'nope' });
      await expectCode(service.sendMessage(room.roomId, buyer, { type: MessageType.TEXT, content: 'bad' }), ChatErrorCode.CONTENT_BLOCKED);
    });

    it('rejects attachments hosted elsewhere', async () => {
      await expectCode(
        service.sendMessage(room.roomId, buyer, {
          type: MessageType.IMAGE,
          attachments: [{ type: 'image', url: 'https://evil.example/pixel.png', mimeType: 'image/png', size: 10 }],
        }),
        ChatErrorCode.ATTACHMENT_INVALID,
      );
    });

    it('accepts own-bucket audio with client duration and normalises m4a', async () => {
      const res = await service.sendMessage(room.roomId, buyer, {
        type: MessageType.AUDIO,
        attachments: [{ type: 'audio', url: 'https://bucket.s3.ap-south-1.amazonaws.com/chat/x/a.m4a', mimeType: 'audio/m4a', size: 1000, duration: 12 }],
      });
      expect(res.message.attachments[0].mimeType).toBe('audio/mp4');
      expect(res.message.attachments[0].duration).toBe(12);
      expect(roomModel.updateOne.mock.calls[0][1].$set.lastMessage.preview).toBe('Voice message');
    });

    it('does not create unread for self-chat', async () => {
      room.adPosterId = new Types.ObjectId(buyer);
      await service.sendMessage(room.roomId, buyer, { type: MessageType.TEXT, content: 'note to self' });
      expect(roomModel.updateOne.mock.calls[0][1].$inc).toEqual({ messageCount: 1 });
    });
  });

  describe('markRoomRead', () => {
    it('marks only the other party messages and resets my counter', async () => {
      const res = await service.markRoomRead(room.roomId, seller);
      expect(res.otherUserId).toBe(buyer);
      expect(String(msgModel.updateMany.mock.calls[0][0].senderId)).toBe(buyer);
      expect(roomModel.updateOne.mock.calls[0][1].$set[`unreadCounts.${seller}`]).toBe(0);
    });

    it('rejects non-participants', async () => {
      await expectCode(service.markRoomRead(room.roomId, stranger), ChatErrorCode.NOT_PARTICIPANT);
    });
  });

  describe('getRoomMessages', () => {
    it('requires participation', async () => {
      await expectCode(service.getRoomMessages(room.roomId, stranger), ChatErrorCode.NOT_PARTICIPANT);
    });

    it('sorts and limits before the sender lookup, and skips count by default', async () => {
      await service.getRoomMessages(room.roomId, buyer, { limit: 20 });
      const pipeline = msgModel.aggregate.mock.calls[0][0];
      expect(Object.keys(pipeline[1])[0]).toBe('$sort');
      expect(pipeline[2]).toEqual({ $limit: 21 });
      expect(Object.keys(pipeline[3])[0]).toBe('$lookup');
      expect(msgModel.countDocuments).not.toHaveBeenCalled();
    });

    it('uses ascending order for `after` catch-up', async () => {
      const after = new Types.ObjectId().toString();
      const res = await service.getRoomMessages(room.roomId, buyer, { after });
      expect(msgModel.aggregate.mock.calls[0][0][1]).toEqual({ $sort: { _id: 1 } });
      expect(res.order).toBe('asc');
    });

    it('strips moderation fields and never selects email', async () => {
      await service.getRoomMessages(room.roomId, buyer);
      const pipeline = JSON.stringify(msgModel.aggregate.mock.calls[0][0]);
      expect(pipeline).not.toContain('email');
      expect(pipeline).toContain('"moderationFlags":0');
    });
  });

  describe('listRooms', () => {
    it('builds a view with per-user unread, role, availability and no email', async () => {
      roomModel.aggregate = jest.fn(() =>
        q([
          {
            ...room,
            lastMessage: { id: new Types.ObjectId(), type: 'text', preview: 'Can you do 5 lakh?', senderId: new Types.ObjectId(buyer), createdAt: new Date() },
            unreadCounts: { [seller]: 2 },
            other: [{ _id: new Types.ObjectId(buyer), name: 'Anand K', profilePic: 'p', phoneNumber: '9847012345', countryCode: '+91' }],
            adDoc: [{ _id: new Types.ObjectId(adId), title: 'Maruti Swift VXI', price: 540000, isActive: true, soldOut: true, image: 'img' }],
          },
        ]),
      );
      const { rooms, nextCursor } = await service.listRooms(seller, { limit: 20 });
      expect(nextCursor).toBeNull();
      expect(rooms[0]).toMatchObject({
        unreadCount: 2,
        myRole: 'selling',
        ad: { title: 'Maruti Swift VXI', price: 540000, status: 'sold', image: 'img' },
        otherUser: { name: 'Anand K', phoneNumber: '9847012345' },
        latestMessage: { content: 'Can you do 5 lakh?' },
      });
      expect(JSON.stringify(rooms[0])).not.toContain('email');
    });

    it('filters unread on the per-user counter and paginates with a cursor', async () => {
      const docs = Array.from({ length: 3 }, (_, i) => ({ ...room, _id: new Types.ObjectId(), lastMessageAt: new Date(Date.now() - i * 1000), other: [], adDoc: [] }));
      roomModel.aggregate = jest.fn(() => q(docs));
      const res = await service.listRooms(seller, { limit: 2, filter: 'unread' });
      const match = roomModel.aggregate.mock.calls[0][0][0].$match;
      expect(match[`unreadCounts.${seller}`]).toEqual({ $gt: 0 });
      expect(res.rooms).toHaveLength(2);
      expect(res.nextCursor).toEqual(expect.any(String));

      await service.listRooms(seller, { limit: 2, cursor: res.nextCursor! });
      expect(roomModel.aggregate.mock.calls[1][0][0].$match.$and).toBeDefined();
    });

    it('rejects a garbage cursor', async () => {
      await expectCode(service.listRooms(seller, { limit: 2, cursor: 'nope' }), ChatErrorCode.VALIDATION);
    });
  });

  describe('previewFor', () => {
    it('summarises each type', () => {
      expect(ChatService.previewFor('image')).toBe('Photo');
      expect(ChatService.previewFor('audio')).toBe('Voice message');
      expect(ChatService.previewFor('text', '  multi\n line  ')).toBe('multi line');
    });
  });
});
