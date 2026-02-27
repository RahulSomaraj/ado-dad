import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { BadRequestException } from '@nestjs/common';

describe('ChatController', () => {
    let controller: ChatController;
    let chatService: any;

    beforeEach(async () => {
        chatService = {
            createChatRoom: jest.fn(),
            getUserChatRooms: jest.fn(),
            getRoomMessages: jest.fn(),
            checkExistingChatRoom: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ChatController],
            providers: [
                {
                    provide: ChatService,
                    useValue: chatService,
                },
            ],
        }).compile();

        controller = module.get<ChatController>(ChatController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('createChatRoom', () => {
        it('should create a chat room successfully', async () => {
            const mockReq = { user: { id: 'user123' } };
            const dto = { adId: 'ad123' };
            const mockRoom = { roomId: 'room123', initiatorId: 'user123', adId: 'ad123' };
            chatService.createChatRoom.mockResolvedValue(mockRoom);

            const result = await controller.createChatRoom(mockReq, dto);

            expect(result.success).toBe(true);
            expect(result.data.roomId).toBe('room123');
            expect(chatService.createChatRoom).toHaveBeenCalledWith('user123', 'ad123');
        });

        it('should throw BadRequestException if user id is missing', async () => {
            const mockReq = { user: {} };
            const dto = { adId: 'ad123' };

            await expect(controller.createChatRoom(mockReq, dto)).rejects.toThrow(BadRequestException);
        });
    });

    describe('getUserChatRooms', () => {
        it('should retrieve user chat rooms', async () => {
            const mockReq = { user: { id: 'user123' } };
            const mockRooms = [{ roomId: 'room1' }];
            chatService.getUserChatRooms.mockResolvedValue(mockRooms);

            const result = await controller.getUserChatRooms(mockReq);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockRooms);
            expect(chatService.getUserChatRooms).toHaveBeenCalledWith('user123');
        });
    });

    describe('getRoomMessages', () => {
        it('should retrieve room messages with pagination', async () => {
            const roomId = 'room123';
            const mockResult = { messages: [], total: 0 };
            chatService.getRoomMessages.mockResolvedValue(mockResult);

            const result = await controller.getRoomMessages(roomId, '50', 'cursor123');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResult);
            expect(chatService.getRoomMessages).toHaveBeenCalledWith(roomId, 'cursor123', 50);
        });
    });
});
