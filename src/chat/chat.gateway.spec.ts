import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Socket, Server } from 'socket.io';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageType } from './schemas/chat-message.schema';

describe('ChatGateway', () => {
    let gateway: ChatGateway;
    let chatService: any;
    let mockServer: any;
    let mockSocket: any;

    beforeEach(async () => {
        chatService = {
            createChatRoom: jest.fn(),
            sendMessage: jest.fn(),
            getUserChatRooms: jest.fn(),
            getRoomMessages: jest.fn(),
            getChatRoom: jest.fn(),
            getUserRole: jest.fn(),
        };

        mockServer = {
            emit: jest.fn(),
            to: jest.fn().mockReturnThis(),
            on: jest.fn(),
        };

        mockSocket = {
            id: 'test-socket-id',
            handshake: {
                auth: { token: 'valid-token' },
                headers: {},
            },
            emit: jest.fn(),
            join: jest.fn(),
            leave: jest.fn(),
            user: { id: 'test-user-id', type: 'user' },
            on: jest.fn(),
            onAny: jest.fn(),
            to: jest.fn().mockReturnThis(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatGateway,
                {
                    provide: ChatService,
                    useValue: chatService,
                },
            ],
        }).compile();

        gateway = module.get<ChatGateway>(ChatGateway);
        gateway.server = mockServer as Server;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('handleCreateChatRoom', () => {
        it('should create a room and emit chatRoomCreated', async () => {
            const dto: CreateChatRoomDto = { adId: 'ad123' };
            const mockRoom = { roomId: 'room123' };
            chatService.createChatRoom.mockResolvedValue(mockRoom);

            await gateway.handleCreateChatRoom(mockSocket as Socket, dto);

            expect(chatService.createChatRoom).toHaveBeenCalledWith('test-user-id', 'ad123');
            expect(mockServer.emit).toHaveBeenCalledWith('chatRoomCreated', expect.objectContaining({
                success: true,
                data: expect.objectContaining({ roomId: 'room123' })
            }));
        });
    });

    describe('handleSendMessage', () => {
        it('should send a message and broadcast it', async () => {
            const dto: SendMessageDto = {
                roomId: 'room123',
                content: 'Hello',
                type: MessageType.TEXT,
            };
            const mockMessage = {
                _id: 'msg123',
                content: 'Hello',
                type: MessageType.TEXT,
                attachments: [],
                createdAt: new Date(),
            };
            chatService.sendMessage.mockResolvedValue(mockMessage);

            const callback = jest.fn();
            await gateway.handleSendMessage(mockSocket as Socket, dto, callback);

            expect(chatService.sendMessage).toHaveBeenCalledWith(
                'room123',
                'test-user-id',
                'Hello',
                MessageType.TEXT,
                [],
            );
            expect(mockServer.to).toHaveBeenCalledWith('room123');
            expect(mockServer.emit).toHaveBeenCalledWith('message', expect.objectContaining({ content: 'Hello', roomId: 'room123' }));
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('handleGetUserChatRooms', () => {
        it('should fetch user chat rooms and emit response', async () => {
            const mockRooms = [{ roomId: 'room1' }];
            chatService.getUserChatRooms.mockResolvedValue(mockRooms);

            await gateway.handleGetUserChatRooms(mockSocket as Socket, {});

            expect(chatService.getUserChatRooms).toHaveBeenCalledWith('test-user-id');
            expect(mockSocket.emit).toHaveBeenCalledWith('getUserChatRoomsResponse', expect.objectContaining({ success: true, chatRooms: mockRooms }));
        });
    });

    describe('Voice Message Validation', () => {
        it('should return error for invalid attachment count', async () => {
            const dto: SendMessageDto = {
                roomId: 'room123',
                type: MessageType.AUDIO,
                attachments: [] // Missing attachment
            };
            const callback = jest.fn();
            await gateway.handleSendMessage(mockSocket as Socket, dto, callback);
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: 'Audio message must contain exactly one attachment' }));
        });

        it('should return error for invalid mime type', async () => {
            const dto: SendMessageDto = {
                roomId: 'room123',
                type: MessageType.AUDIO,
                attachments: [{
                    type: 'audio' as any,
                    url: 'url',
                    mimeType: 'audio/invalid',
                    size: 1000,
                    duration: 10
                }]
            };
            const callback = jest.fn();
            await gateway.handleSendMessage(mockSocket as Socket, dto, callback);
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: 'Invalid audio format: audio/invalid' }));
        });

        it('should return error for duration > 180s', async () => {
            const dto: SendMessageDto = {
                roomId: 'room123',
                type: MessageType.AUDIO,
                attachments: [{
                    type: 'audio' as any,
                    url: 'url',
                    mimeType: 'audio/webm',
                    size: 1000,
                    duration: 200
                }]
            };
            const callback = jest.fn();
            await gateway.handleSendMessage(mockSocket as Socket, dto, callback);
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: 'Voice message cannot exceed 3 minutes (180s)' }));
        });

        it('should validate duration successfully', async () => {
            const dto: SendMessageDto = {
                roomId: 'room123',
                type: MessageType.AUDIO,
                attachments: [{
                    type: 'audio' as any,
                    url: 'url',
                    mimeType: 'audio/webm',
                    size: 1000,
                    duration: 10
                }]
            };
            chatService.sendMessage.mockResolvedValue({ _id: 'msg1' });
            await gateway.handleSendMessage(mockSocket as Socket, dto);
            expect(chatService.sendMessage).toHaveBeenCalled();
        });

        it('should accept audio/mp4 (M4A) format', async () => {
            const dto: SendMessageDto = {
                roomId: 'room123',
                type: MessageType.AUDIO,
                attachments: [{
                    type: 'audio' as any,
                    url: 'url',
                    mimeType: 'audio/mp4',
                    size: 1000,
                    duration: 10
                }]
            };
            chatService.sendMessage.mockResolvedValue({ _id: 'msg1' });
            await gateway.handleSendMessage(mockSocket as Socket, dto);
            expect(chatService.sendMessage).toHaveBeenCalled();
        });

        it('should accept audio/amr format', async () => {
            const dto: SendMessageDto = {
                roomId: 'room123',
                type: MessageType.AUDIO,
                attachments: [{
                    type: 'audio' as any,
                    url: 'url',
                    mimeType: 'audio/amr',
                    size: 1000,
                    duration: 10
                }]
            };
            chatService.sendMessage.mockResolvedValue({ _id: 'msg1' });
            await gateway.handleSendMessage(mockSocket as Socket, dto);
            expect(chatService.sendMessage).toHaveBeenCalled();
        });
    });

    describe('handleJoinChatRoom', () => {
        it('should allow participant to join', async () => {
            const room = { roomId: 'room1', participants: ['test-user-id'] };
            chatService.getChatRoom.mockResolvedValue(room);
            chatService.getUserRole.mockResolvedValue('initiator');

            const callback = jest.fn();
            await gateway.handleJoinChatRoom(mockSocket as Socket, { roomId: 'room1' }, callback);

            expect(mockSocket.join).toHaveBeenCalledWith('room1');
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should reject non-participant', async () => {
            const room = { roomId: 'room1', participants: ['other-user'] };
            chatService.getChatRoom.mockResolvedValue(room);

            const callback = jest.fn();
            await gateway.handleJoinChatRoom(mockSocket as Socket, { roomId: 'room1' }, callback);

            expect(mockSocket.join).not.toHaveBeenCalled();
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        });
    });
});
