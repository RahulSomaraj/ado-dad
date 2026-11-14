import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { Roles } from '../roles/roles.decorator';
import { UserType } from '../users/enums/user.types';
import { RolesGuard } from '../roles/roles.guard';
import { SendMessageBodyDto } from './dto/send-message.dto';
import {
  CreateChatUploadDto,
  ListRoomsQueryDto,
  MarkReadDto,
  MessagesQueryDto,
} from './dto/chat-query.dto';
import { ChatError, ChatErrorCode } from './chat-errors';
import { ChatMessagingService } from './chat-messaging.service';
import { ChatUploadService } from './chat-upload.service';
import { ChatRateLimiterService } from './realtime/chat-rate-limiter.service';

const CHAT_ROLES = [UserType.USER, UserType.SHOWROOM, UserType.ADMIN, UserType.SUPER_ADMIN];

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CHAT_ROLES)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly messaging: ChatMessagingService,
    private readonly uploads: ChatUploadService,
    private readonly rateLimiter: ChatRateLimiterService,
  ) {}

  private userId(req: any): string {
    const id = req?.user?.id || req?.user?._id;
    if (!id) throw new ChatError(ChatErrorCode.UNAUTHORIZED, 'Not authenticated');
    return String(id);
  }

  @Post('rooms')
  @ApiOperation({ summary: 'Get or create the conversation for an ad (idempotent)' })
  async createChatRoom(@Request() req: any, @Body() dto: CreateChatRoomDto) {
    const userId = this.userId(req);
    await this.rateLimiter.consume('createRoom', userId);
    const room = await this.chatService.createChatRoom(userId, dto.adId);
    const view = await this.chatService.getRoomView(room.roomId, userId);
    return { success: true, data: view, message: 'Chat room created successfully' };
  }

  @Get('rooms')
  @ApiOperation({
    summary: 'List conversations',
    description:
      'With `limit`: paged (use `nextCursor`), supports `filter` (all|unread|buying|selling) and `q`. ' +
      'Without `limit`: legacy full list (capped at 200).',
  })
  async getUserChatRooms(@Request() req: any, @Query() query: ListRoomsQueryDto) {
    const { rooms, nextCursor } = await this.chatService.listRooms(this.userId(req), query);
    return { success: true, data: rooms, nextCursor };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Total unread messages (nav badge)' })
  async getUnreadCount(@Request() req: any) {
    return { success: true, data: await this.chatService.getUnreadSummary(this.userId(req)) };
  }

  @Get('rooms/check/:adId/:otherUserId')
  @ApiOperation({ summary: 'Legacy: does a room exist for this ad and user?' })
  async checkExistingChatRoom(
    @Param('adId') adId: string,
    @Param('otherUserId') otherUserId: string,
    @Request() req: any,
  ) {
    const userId = this.userId(req);
    const room = await this.chatService.findExistingChatRoom(userId, adId, otherUserId);
    return {
      success: true,
      data: { exists: !!room, roomId: room?.roomId ?? null, participants: [userId, otherUserId] },
    };
  }

  @Get('rooms/:roomId')
  @ApiParam({ name: 'roomId' })
  @ApiOperation({ summary: 'One conversation (participants only)' })
  async getRoom(@Param('roomId') roomId: string, @Request() req: any) {
    return { success: true, data: await this.chatService.getRoomView(roomId, this.userId(req)) };
  }

  @Get('rooms/:roomId/messages')
  @ApiOperation({
    summary: 'Message history',
    description: '`cursor` → older messages (newest first). `after` → newer messages (oldest first) for catch-up.',
  })
  async getRoomMessages(@Param('roomId') roomId: string, @Query() query: MessagesQueryDto, @Request() req: any) {
    const result = await this.chatService.getRoomMessages(roomId, this.userId(req), {
      cursor: query.cursor,
      after: query.after,
      limit: query.limit,
      includeTotal: query.includeTotal === 'true',
    });
    return { success: true, data: result, roomId };
  }

  @Post('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Send a message (idempotent on clientMessageId)' })
  async sendMessage(@Param('roomId') roomId: string, @Body() body: SendMessageBodyDto, @Request() req: any) {
    const userId = this.userId(req);
    await this.rateLimiter.consume('sendMessage', userId);
    return { success: true, data: await this.messaging.send(roomId, userId, body) };
  }

  @Post('rooms/:roomId/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark the conversation as read for the current user' })
  async markRead(@Param('roomId') roomId: string, @Body() body: MarkReadDto, @Request() req: any) {
    const userId = this.userId(req);
    await this.rateLimiter.consume('markRead', userId);
    return { success: true, data: await this.messaging.markRead(roomId, userId, body?.lastMessageId) };
  }

  @Post('rooms/:roomId/archive')
  @HttpCode(200)
  @ApiOperation({ summary: 'Archive the conversation for the current user only' })
  async archive(@Param('roomId') roomId: string, @Request() req: any) {
    return { success: true, data: await this.messaging.setArchived(roomId, this.userId(req), true) };
  }

  @Delete('rooms/:roomId/archive')
  @ApiOperation({ summary: 'Unarchive the conversation for the current user' })
  async unarchive(@Param('roomId') roomId: string, @Request() req: any) {
    return { success: true, data: await this.messaging.setArchived(roomId, this.userId(req), false) };
  }

  @Post('rooms/:roomId/unread')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark the conversation as unread for the current user' })
  async markUnread(@Param('roomId') roomId: string, @Request() req: any) {
    const userId = this.userId(req);
    await this.rateLimiter.consume('markRead', userId);
    return { success: true, data: await this.messaging.markUnread(roomId, userId) };
  }

  @Post('rooms/:roomId/uploads')
  @ApiOperation({ summary: 'Presigned upload for a chat photo or voice note' })
  async createUpload(@Param('roomId') roomId: string, @Body() dto: CreateChatUploadDto, @Request() req: any) {
    const userId = this.userId(req);
    await this.rateLimiter.consume('upload', userId);
    const room = await this.chatService.getRoomForParticipant(roomId, userId);
    return { success: true, data: await this.uploads.createTicket(room.roomId, dto) };
  }
}
