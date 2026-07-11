import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ChatService } from './chat.service';
import { ChatRoom, ChatRoomStatus, UserRole } from './schemas/chat-room.schema';
import { ChatMessage, MessageType } from './schemas/chat-message.schema';
import { Ad } from '../ads/schemas/ad.schema';
import { User } from '../users/schemas/user.schema';
import { ContentModerationService } from './services/content-moderation.service';
import { Types } from 'mongoose';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ChatService', () => {
    let service: ChatService;

    const mockChatRoom = {
        _id: new Types.ObjectId(),
        roomId: 'chat_ad123_user456_poster789',
        initiatorId: new Types.ObjectId(),
        adId: new Types.ObjectId(),
        adPosterId: new Types.ObjectId(),
        participants: [],
        userRoles: new Map(),
        status: ChatRoomStatus.ACTIVE,
        save: jest.fn().mockResolvedValue(true),
    };

    const mockAd = {
        _id: new Types.ObjectId(),
        postedBy: new Types.ObjectId(),
        isActive: true,
        category: 'Test Category',
        description: 'Test Description',
        price: 100,
        location: { type: 'Point', coordinates: [0, 0] },
        priceUnit: 'AED',
    };

    const createMockQuery = (data: any) => ({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(data),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
    });

    const mockChatRoomModel = {
        findOne: jest.fn(),
        create: jest.fn(),
        updateOne: jest.fn(),
        find: jest.fn(),
        findById: jest.fn(),
        aggregate: jest.fn(),
    };

    const mockChatMessageModel = {
        create: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        aggregate: jest.fn(),
        countDocuments: jest.fn(),
    };

    const mockAdModel = {
        findById: jest.fn(),
    };

    const mockUserModel = {
        findById: jest.fn(),
    };

    const mockContentModerationService = {
        moderateContent: jest.fn().mockResolvedValue({ isApproved: true }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatService,
                {
                    provide: getModelToken(ChatRoom.name),
                    useValue: mockChatRoomModel,
                },
                {
                    provide: getModelToken(ChatMessage.name),
                    useValue: mockChatMessageModel,
                },
                {
                    provide: getModelToken(Ad.name),
                    useValue: mockAdModel,
                },
                {
                    provide: getModelToken(User.name),
                    useValue: mockUserModel,
                },
                {
                    provide: ContentModerationService,
                    useValue: mockContentModerationService,
                },
            ],
        }).compile();

        service = module.get<ChatService>(ChatService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createChatRoom', () => {
        it('should throw NotFoundException if advertisement is not found', async () => {
            mockAdModel.findById.mockReturnValue(createMockQuery(null));

            await expect(service.createChatRoom(new Types.ObjectId().toString(), new Types.ObjectId().toString()))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if advertisement is inactive', async () => {
            mockAdModel.findById.mockReturnValue(createMockQuery({ ...mockAd, isActive: false }));

            await expect(service.createChatRoom(new Types.ObjectId().toString(), mockAd._id.toString()))
                .rejects.toThrow(BadRequestException);
        });

        it('should return existing room if it already exists', async () => {
            mockAdModel.findById.mockReturnValue(createMockQuery(mockAd));
            mockChatRoomModel.findOne.mockReturnValue(createMockQuery(mockChatRoom));

            const result = await service.createChatRoom(new Types.ObjectId().toString(), mockAd._id.toString());
            expect(result).toEqual(mockChatRoom);
        });

        it('should create a new room if it does not exist', async () => {
            mockAdModel.findById.mockReturnValue(createMockQuery(mockAd));
            mockChatRoomModel.findOne.mockReturnValue(createMockQuery(null));
            mockChatRoomModel.create.mockResolvedValue(mockChatRoom);

            const result = await service.createChatRoom(new Types.ObjectId().toString(), mockAd._id.toString());
            expect(result).toEqual(mockChatRoom);
            expect(mockChatRoomModel.create).toHaveBeenCalled();
        });
    });

    describe('sendMessage', () => {
        const roomId = 'chat_123';
        const senderId = new Types.ObjectId().toString();

        it('should throw NotFoundException if room does not exist', async () => {
            mockChatRoomModel.findOne.mockReturnValue(createMockQuery(null));

            await expect(service.sendMessage(roomId, senderId, 'Hello'))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if sender is not a participant', async () => {
            const room = {
                ...mockChatRoom,
                initiatorId: new Types.ObjectId(),
                adPosterId: new Types.ObjectId(),
            };
            mockChatRoomModel.findOne.mockReturnValue(createMockQuery(room));

            await expect(service.sendMessage(roomId, senderId, 'Hello'))
                .rejects.toThrow(ForbiddenException);
        });

        it('should send a text message successfully', async () => {
            const room = {
                ...mockChatRoom,
                initiatorId: new Types.ObjectId(senderId),
                adPosterId: new Types.ObjectId(),
            };
            mockChatRoomModel.findOne.mockReturnValue(createMockQuery(room));
            mockChatMessageModel.create.mockResolvedValue({ _id: new Types.ObjectId(), content: 'Hello' });

            const result = await service.sendMessage(roomId, senderId, 'Hello');
            expect(result.content).toBe('Hello');
            expect(mockChatMessageModel.create).toHaveBeenCalled();
        });

        it('should throw BadRequestException if text message has no content', async () => {
            const room = {
                ...mockChatRoom,
                initiatorId: new Types.ObjectId(senderId),
                adPosterId: new Types.ObjectId(),
            };
            mockChatRoomModel.findOne.mockReturnValue(createMockQuery(room));

            await expect(service.sendMessage(roomId, senderId, '', MessageType.TEXT))
                .rejects.toThrow(BadRequestException);
        });

        it('should send an image message successfully', async () => {
            const room = {
                ...mockChatRoom,
                initiatorId: new Types.ObjectId(senderId),
                adPosterId: new Types.ObjectId(),
            };
            mockChatRoomModel.findOne.mockReturnValue(createMockQuery(room));
            const attachments = [{ type: 'image', url: 'http://image.com' }];
            mockChatMessageModel.create.mockResolvedValue({ _id: new Types.ObjectId(), type: MessageType.IMAGE, attachments });

            const result = await service.sendMessage(roomId, senderId, undefined, MessageType.IMAGE, attachments);
            expect(result.type).toBe(MessageType.IMAGE);
            expect(result.attachments).toEqual(attachments);
        });

        it('should throw BadRequestException if content is rejected by moderation', async () => {
            const room = {
                ...mockChatRoom,
                initiatorId: new Types.ObjectId(senderId),
                adPosterId: new Types.ObjectId(),
            };
            mockChatRoomModel.findOne.mockReturnValue(createMockQuery(room));
            mockContentModerationService.moderateContent.mockResolvedValue({ isApproved: false, reason: 'Profanity' });

            await expect(service.sendMessage(roomId, senderId, 'bad word'))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('getUserChatRooms', () => {
        const userId = new Types.ObjectId();

        it('should return enhanced chat rooms for a user', async () => {
            const mockRooms = [{
                ...mockChatRoom,
                initiatorId: userId,
                adPosterId: new Types.ObjectId(),
                adId: new Types.ObjectId(),
                createdAt: new Date(),
            }];
            mockChatRoomModel.find.mockReturnValue(createMockQuery(mockRooms));
            mockUserModel.findById.mockReturnValue(createMockQuery({ name: 'Other User' }));
            mockChatMessageModel.findOne.mockReturnValue(createMockQuery({ content: 'Last msg' }));
            mockAdModel.findById.mockReturnValue(createMockQuery({ title: 'Ad Title' }));

            const result = await service.getUserChatRooms(userId.toString());
            expect(result).toHaveLength(1);
            expect(result[0].otherUser.name).toBe('Other User');
            expect(result[0].latestMessage.content).toBe('Last msg');
            expect(result[0].adDetails.title).toBe('Ad Title');
        });
    });

    describe('findExistingChatRoom', () => {
        const initiatorId = new Types.ObjectId();
        const adId = new Types.ObjectId();
        const otherUserId = new Types.ObjectId();

        it('should find room where user is initiator', async () => {
            mockChatRoomModel.findOne.mockReturnValue(createMockQuery(mockChatRoom));
            const result = await service.findExistingChatRoom(initiatorId, adId, otherUserId);
            expect(result).toEqual(mockChatRoom);
        });

        it('should return null if no room exists', async () => {
            mockChatRoomModel.findOne.mockReturnValue(createMockQuery(null));
            const result = await service.findExistingChatRoom(initiatorId, adId, otherUserId);
            expect(result).toBeNull();
        });
    });

    describe('getRoomMessages', () => {
        const roomId = 'rooms123';

        it('should return paginated messages with sender info', async () => {
            const mockMessages = [
                { _id: new Types.ObjectId(), content: 'Msg 1', sender: { name: 'User 1' } },
                { _id: new Types.ObjectId(), content: 'Msg 2', sender: { name: 'User 2' } },
            ];
            mockChatRoomModel.findOne.mockReturnValue(createMockQuery(mockChatRoom));
            mockChatMessageModel.countDocuments.mockResolvedValue(10);
            mockChatMessageModel.aggregate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockMessages)
            });

            const result = await service.getRoomMessages(roomId, undefined, 2);
            expect(result.messages).toHaveLength(2);
            expect(result.total).toBe(10);
            expect(result.messages[0].sender.name).toBe('User 1');
        });

        it('should allow a room participant to read messages', async () => {
            mockChatRoomModel.findOne.mockReturnValue(createMockQuery(mockChatRoom));
            mockChatMessageModel.countDocuments.mockResolvedValue(0);
            mockChatMessageModel.aggregate.mockReturnValue({
                exec: jest.fn().mockResolvedValue([]),
            });

            const participantId = mockChatRoom.initiatorId.toString();
            const result = await service.getRoomMessages(roomId, undefined, 50, participantId);
            expect(result.messages).toHaveLength(0);
        });

        it('should throw ForbiddenException when a non-participant reads messages', async () => {
            mockChatRoomModel.findOne.mockReturnValue(createMockQuery(mockChatRoom));

            const strangerId = new Types.ObjectId().toString();
            await expect(service.getRoomMessages(roomId, undefined, 50, strangerId))
                .rejects.toThrow(ForbiddenException);
        });
    });
});
