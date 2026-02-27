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
            expect(mockServer.emit).toHaveBeenCalledWith('chatRoomCreated', expect.objectContaining({ roomId: 'room123' }));
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

            await gateway.handleSendMessage(mockSocket as Socket, dto);

            expect(chatService.sendMessage).toHaveBeenCalledWith(
                'room123',
                'test-user-id',
                'Hello',
                MessageType.TEXT,
                [],
            );
            expect(mockServer.to).toHaveBeenCalledWith('room123');
            expect(mockServer.emit).toHaveBeenCalledWith('message', expect.objectContaining({ content: 'Hello' }));
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
});
