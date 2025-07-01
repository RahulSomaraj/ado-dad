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
@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('create')
  async createChat(@Body() body, @Request() req) {
    const { otherUserId, contextType, contextId } = body;
    const { user } = req;
    return this.chatService.findOrCreateChat([user._id, otherUserId], contextType, contextId);
  }

  @Get()
  async getUserChats(@Request() req) {
    const { user } = req;
    return this.chatService.getUserChats(user._id);
  }

  @Get(':chatId/messages')
  async getMessages(@Param('chatId') chatId: string) {
    return this.chatService.getMessages(chatId);
  }

  @Post(':chatId/messages')
  async sendMessage(
    @Param('chatId') chatId: string,
    @Body() createMessageDto: CreateMessageDto,
    @Request() req,
  ) {
    const { user } = req;
    return this.chatService.sendMessage(chatId, user._id, createMessageDto.content);
  }
} 