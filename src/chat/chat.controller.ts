import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('ad/:adId')
  async createAdChat(@Param('adId') adId: string, @Request() req) {
    const userId = req.user.id;
    // For now, we'll need to get the adPosterId from the ad
    // This should be enhanced to get the actual ad poster ID
    const adPosterId = req.body.adPosterId; // This should come from the ad lookup

    if (!adPosterId) {
      return { error: 'Ad poster ID is required' };
    }

    const chat = await this.chatService.createAdChat(adId, adPosterId, userId);
    return { success: true, chat };
  }

  @Get('user')
  async getUserChats(@Request() req) {
    const userId = req.user.id;
    const chats = await this.chatService.getUserChats(userId);
    return { success: true, chats };
  }

  @Get('ad/:adId')
  async getAdChats(@Param('adId') adId: string) {
    const chats = await this.chatService.getAdChats(adId);
    return { success: true, chats };
  }

  @Get(':chatId/messages')
  async getChatMessages(@Param('chatId') chatId: string) {
    const messages = await this.chatService.getMessages(chatId);
    return { success: true, messages };
  }

  @Post(':chatId/messages')
  async sendMessage(
    @Param('chatId') chatId: string,
    @Body() body: { content: string },
    @Request() req,
  ) {
    const userId = req.user.id;
    const message = await this.chatService.sendMessage(
      chatId,
      userId,
      body.content,
    );
    return { success: true, message };
  }

  @Post(':chatId/block/:targetUserId')
  async block(
    @Param('chatId') chatId: string,
    @Param('targetUserId') targetUserId: string,
    @Request() req,
  ) {
    const blockerId = req.user.id;
    const chat = await this.chatService.blockUser(
      chatId,
      blockerId,
      targetUserId,
    );
    return { success: true, chat };
  }

  @Post(':chatId/unblock/:targetUserId')
  async unblock(
    @Param('chatId') chatId: string,
    @Param('targetUserId') targetUserId: string,
    @Request() req,
  ) {
    const blockerId = req.user.id;
    const chat = await this.chatService.unblockUser(
      chatId,
      blockerId,
      targetUserId,
    );
    return { success: true, chat };
  }

  @Post(':chatId/read')
  async markAsRead(@Param('chatId') chatId: string, @Request() req) {
    const userId = req.user.id;
    await this.chatService.markMessagesAsRead(chatId, userId);
    return { success: true };
  }

  @Get(':chatId/unread-count')
  async getUnreadCount(@Param('chatId') chatId: string, @Request() req) {
    const userId = req.user.id;
    const count = await this.chatService.getUnreadMessageCount(chatId, userId);
    return { success: true, count };
  }
}
