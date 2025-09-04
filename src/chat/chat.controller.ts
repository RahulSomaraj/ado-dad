import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Admin: List chat rooms with filters and pagination
  @Get('rooms')
  async listChatRooms(
    @Query('userId') userId?: string,
    @Query('adId') adId?: string,
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit = '50',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const filters = {
      userId,
      adId,
      status,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };

    const result = await this.chatService.listChatRoomsForAdmin(
      filters,
      cursor,
      parseInt(limit, 10),
    );

    return {
      success: true,
      data: result.rooms,
      pagination: {
        cursor: result.nextCursor,
        hasMore: result.hasMore,
        total: result.total,
      },
    };
  }

  // Admin: Get messages for a specific room
  @Get('rooms/:roomId/messages')
  async getRoomMessages(
    @Param('roomId') roomId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit = '50',
  ) {
    const messages = await this.chatService.getRoomMessagesForAdmin(
      roomId,
      cursor,
      parseInt(limit, 10),
    );

    return {
      success: true,
      data: messages,
      roomId,
    };
  }

  // Admin: Archive a chat room
  @Post('rooms/:roomId/archive')
  async archiveChatRoom(@Param('roomId') roomId: string) {
    await this.chatService.archiveChatRoom(roomId);
    return {
      success: true,
      message: 'Chat room archived successfully',
      roomId,
    };
  }

  // Admin: Update chat room status
  @Put('rooms/:roomId/status')
  async updateChatRoomStatus(
    @Param('roomId') roomId: string,
    @Body() body: { status: string },
  ) {
    if (!body.status) {
      throw new BadRequestException('Status is required');
    }

    await this.chatService.updateChatRoomStatus(roomId, body.status);
    return {
      success: true,
      message: 'Chat room status updated successfully',
      roomId,
      status: body.status,
    };
  }

  // Admin: Export chat data
  @Get('export')
  async exportChats(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('adId') adId?: string,
    @Query('userId') userId?: string,
    @Query('format') format = 'json',
  ) {
    if (!from || !to) {
      throw new BadRequestException('From and to dates are required');
    }

    const data = await this.chatService.exportChatData({
      from: new Date(from),
      to: new Date(to),
      adId,
      userId,
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csv = this.convertToCSV(data.rooms);
      return {
        success: true,
        data: csv,
        format: 'csv',
        filename: `chat-export-${from}-${to}.csv`,
      };
    }

    return {
      success: true,
      data,
      format: 'json',
      filename: `chat-export-${from}-${to}.json`,
    };
  }

  // Public: Get messages for a room (for participants)
  @Get('rooms/:roomId/messages')
  async getMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
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
  }

  // Public: Mark messages as read
  @Post('rooms/:roomId/reads')
  async markAsRead(
    @Param('roomId') roomId: string,
    @Body() body: { lastReadMessageId?: string },
  ) {
    // Note: User ID comes from JWT token via guard
    if (body.lastReadMessageId) {
      await this.chatService.markMessagesAsRead(roomId, body.lastReadMessageId);
    }

    return {
      success: true,
      message: 'Messages marked as read',
      roomId,
    };
  }

  // Public: Get unread count for a room
  @Get('rooms/:roomId/unread-count')
  async getUnreadCount(@Param('roomId') roomId: string) {
    const count = await this.chatService.getUnreadCount(roomId);

    return {
      success: true,
      data: { unreadCount: count },
      roomId,
    };
  }

  private convertToCSV(data: any[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((header) => JSON.stringify(row[header] || '')).join(','),
      ),
    ];

    return csvRows.join('\n');
  }
}
