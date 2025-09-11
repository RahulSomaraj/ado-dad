import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  BadRequestException,
  UseGuards,
  Request,
  UseFilters,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { HttpExceptionFilter } from '../shared/exception-service';
import { Roles } from '../roles/roles.decorator';
import { UserType } from '../users/enums/user.types';
import { RolesGuard } from '../roles/roles.guard';

@ApiTags('Chat')
@Controller('chats')
@UseFilters(new HttpExceptionFilter('Chat'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Create a new chat room
  @Post('rooms')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER, UserType.SHOWROOM, UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiBody({
    description: 'Create a new chat room',
    type: CreateChatRoomDto,
  })
  @ApiResponse({ status: 201, description: 'Chat room created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createChatRoom(
    @Request() req: any,
    @Body() createChatRoomDto: CreateChatRoomDto,
  ) {
    const userId = req.user.id || req.user._id;

    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }

    try {
      const chatRoom = await this.chatService.createChatRoom(
        userId,
        createChatRoomDto.adId,
      );

      return {
        success: true,
        data: {
          roomId: chatRoom.roomId,
          initiatorId: chatRoom.initiatorId,
          adId: chatRoom.adId,
          adPosterId: chatRoom.adPosterId,
          participants: chatRoom.participants,
          status: chatRoom.status,
          createdAt: (chatRoom as any).createdAt,
        },
        message: 'Chat room created successfully',
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  // Get user's chat rooms
  @Get('rooms')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER, UserType.SHOWROOM, UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiResponse({
    status: 200,
    description: 'User chat rooms retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserChatRooms(@Request() req: any) {
    const userId = req.user.id || req.user._id;

    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }

    try {
      const chatRooms = await this.chatService.getUserChatRooms(userId);

      return {
        success: true,
        data: chatRooms.map((room) => ({
          roomId: room.roomId,
          initiatorId: room.initiatorId,
          adId: room.adId,
          adPosterId: room.adPosterId,
          participants: room.participants,
          status: room.status,
          lastMessageAt: room.lastMessageAt,
          messageCount: room.messageCount,
          createdAt: (room as any).createdAt,
        })),
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  // Get messages for a room
  @Get('rooms/:roomId/messages')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER, UserType.SHOWROOM, UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiParam({ name: 'roomId', description: 'Chat room ID' })
  @ApiQuery({
    name: 'limit',
    description: 'Number of messages to retrieve',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Room messages retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRoomMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit = '50',
  ) {
    try {
      const messages = await this.chatService.getRoomMessages(
        roomId,
        undefined, // cursor
        parseInt(limit, 10),
      );

      return {
        success: true,
        data: messages,
        roomId,
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  // Check if chat room exists for an ad
  @Get('rooms/check/:adId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER, UserType.SHOWROOM, UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiParam({
    name: 'adId',
    description: 'Ad ID to check for existing chat room',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat room existence checked successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid ad ID' })
  async checkExistingChatRoom(
    @Param('adId') adId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id || req.user._id;

    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }

    try {
      const existingRoom = await this.chatService.findExistingChatRoom(
        userId,
        adId,
      );

      return {
        success: true,
        data: {
          exists: !!existingRoom,
          roomId: existingRoom?.roomId || null,
        },
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}
