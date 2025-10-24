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
  ApiOperation,
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
  @ApiOperation({
    summary: 'Create a new chat room',
    description: `
      Create a new chat room for communication between users regarding a specific advertisement.
      
      **Features:**
      - Creates a chat room between the current user and the ad poster
      - Automatically adds both users as participants
      - Generates a unique room ID based on ad and user information
      - Sets initial status as 'active'
      - Returns complete room information including participants
      
      **Business Logic:**
      - Users can create chat rooms for any advertisement
      - Each ad can have multiple chat rooms (one per initiator)
      - Room ID format: chat_{adId}_{initiatorId}_{adPosterId}
      - Automatically handles user role assignment (initiator/receiver)
    `,
  })
  @ApiBody({
    description: 'Create a new chat room for an advertisement',
    type: CreateChatRoomDto,
    examples: {
      basic_chat_room: {
        summary: 'Basic Chat Room Creation',
        description: 'Create a chat room for a specific advertisement',
        value: {
          adId: '507f1f77bcf86cd799439011',
        },
      },
      property_chat_room: {
        summary: 'Property Chat Room',
        description: 'Create a chat room for a property advertisement',
        value: {
          adId: '507f1f77bcf86cd799439012',
        },
      },
      vehicle_chat_room: {
        summary: 'Vehicle Chat Room',
        description: 'Create a chat room for a vehicle advertisement',
        value: {
          adId: '507f1f77bcf86cd799439013',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Chat room created successfully',
    schema: {
      example: {
        success: true,
        data: {
          roomId:
            'chat_507f1f77bcf86cd799439011_507f1f77bcf86cd799439021_507f1f77bcf86cd799439022',
          initiatorId: '507f1f77bcf86cd799439021',
          adId: '507f1f77bcf86cd799439011',
          adPosterId: '507f1f77bcf86cd799439022',
          participants: [
            '507f1f77bcf86cd799439021',
            '507f1f77bcf86cd799439022',
          ],
          status: 'active',
          createdAt: '2024-01-15T10:30:00.000Z',
        },
        message: 'Chat room created successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data or validation error',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid Ad ID format: invalid-id',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Advertisement not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Advertisement not found',
        error: 'Not Found',
      },
    },
  })
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
  @ApiOperation({
    summary: 'Get user chat rooms with enhanced data',
    description: `
      Retrieve all chat rooms where the current user is a participant with enhanced information.
      
      **Features:**
      - Returns all active chat rooms for the authenticated user
      - Includes rooms where user is initiator or ad poster
      - Shows last message timestamp and message count
      - Sorted by most recent activity
      - Returns complete room information with user details
      
      **Response includes:**
      - Room ID and participants
      - Advertisement ID and poster information
      - Room status and timestamps
      - Message count and last activity
      - **Other user details**: Name, profile picture, email
      - **Latest message**: Content, type, and timestamp
      - **Advertisement details**: Title, description, price, images, category
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'User chat rooms retrieved successfully with enhanced data',
    schema: {
      example: {
        success: true,
        data: [
          {
            roomId:
              'chat_507f1f77bcf86cd799439011_507f1f77bcf86cd799439021_507f1f77bcf86cd799439022',
            initiatorId: '507f1f77bcf86cd799439021',
            adId: '507f1f77bcf86cd799439011',
            adPosterId: '507f1f77bcf86cd799439022',
            participants: [
              '507f1f77bcf86cd799439021',
              '507f1f77bcf86cd799439022',
            ],
            status: 'active',
            lastMessageAt: '2024-01-15T14:30:00.000Z',
            messageCount: 5,
            createdAt: '2024-01-15T10:30:00.000Z',
            updatedAt: '2024-01-15T14:30:00.000Z',
            otherUser: {
              id: '507f1f77bcf86cd799439022',
              name: 'John Doe',
              profilePic: 'https://example.com/profile.jpg',
              email: 'john@example.com',
            },
            latestMessage: {
              content: 'Hello, is this still available?',
              type: 'text',
              createdAt: '2024-01-15T14:30:00.000Z',
            },
            adDetails: {
              id: '507f1f77bcf86cd799439011',
              title: 'Beautiful 3 Bedroom Apartment',
              description: 'Spacious apartment with modern amenities',
              price: 2500,
              images: [
                'https://example.com/image1.jpg',
                'https://example.com/image2.jpg',
              ],
              category: 'property',
            },
          },
          {
            roomId:
              'chat_507f1f77bcf86cd799439012_507f1f77bcf86cd799439021_507f1f77bcf86cd799439023',
            initiatorId: '507f1f77bcf86cd799439021',
            adId: '507f1f77bcf86cd799439012',
            adPosterId: '507f1f77bcf86cd799439023',
            participants: [
              '507f1f77bcf86cd799439021',
              '507f1f77bcf86cd799439023',
            ],
            status: 'active',
            lastMessageAt: '2024-01-15T12:15:00.000Z',
            messageCount: 12,
            createdAt: '2024-01-15T09:15:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async getUserChatRooms(@Request() req: any) {
    const userId = req.user.id || req.user._id;

    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }

    try {
      const chatRooms = await this.chatService.getUserChatRooms(userId);

      return {
        success: true,
        data: chatRooms,
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
  @ApiOperation({
    summary: 'Get room messages with pagination',
    description: `
      Retrieve messages from a specific chat room with cursor-based pagination.
      
      **Features:**
      - Returns paginated messages from the specified room (newest first)
      - Cursor-based pagination for efficient loading of message history
      - Includes complete sender information (name, email, profile picture)
      - Supports limit parameter for message count control (1-200 messages)
      - Returns pagination metadata (nextCursor, hasMore, total count)
      - Perfect for mobile and web chat interfaces
      
      **Pagination:**
      - First request: Don't include cursor parameter
      - Subsequent requests: Use nextCursor from previous response
      - Messages are returned in descending order (newest first)
      - Use nextCursor to load older messages
      
      **Parameters:**
      - roomId: Unique identifier for the chat room
      - limit: Maximum number of messages to retrieve (default: 50, max: 200)
      - cursor: Message ID to start pagination from (optional)
    `,
  })
  @ApiParam({
    name: 'roomId',
    description: 'Chat room ID',
    example:
      'chat_507f1f77bcf86cd799439011_507f1f77bcf86cd799439021_507f1f77bcf86cd799439022',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of messages to retrieve (default: 50, max: 200)',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiQuery({
    name: 'cursor',
    description: 'Cursor for pagination (message ID to start from)',
    required: false,
    type: String,
    example: '507f1f77bcf86cd799439031',
  })
  @ApiResponse({
    status: 200,
    description: 'Room messages retrieved successfully with pagination',
    schema: {
      example: {
        success: true,
        data: {
          messages: [
            {
              _id: '507f1f77bcf86cd799439031',
              roomId:
                'chat_507f1f77bcf86cd799439011_507f1f77bcf86cd799439021_507f1f77bcf86cd799439022',
              senderId: '507f1f77bcf86cd799439021',
              content: 'Hello! Is this property still available?',
              type: 'text',
              attachments: [],
              isRead: true,
              readAt: '2024-01-15T14:31:00.000Z',
              createdAt: '2024-01-15T14:30:00.000Z',
              updatedAt: '2024-01-15T14:30:00.000Z',
              sender: {
                _id: '507f1f77bcf86cd799439021',
                name: 'John Doe',
                email: 'john.doe@example.com',
                profilePic: 'https://example.com/profile1.jpg',
              },
            },
            {
              _id: '507f1f77bcf86cd799439032',
              roomId:
                'chat_507f1f77bcf86cd799439011_507f1f77bcf86cd799439021_507f1f77bcf86cd799439022',
              senderId: '507f1f77bcf86cd799439022',
              content:
                'Yes, it is still available. Would you like to schedule a viewing?',
              type: 'text',
              attachments: [],
              isRead: false,
              readAt: null,
              createdAt: '2024-01-15T14:32:00.000Z',
              updatedAt: '2024-01-15T14:32:00.000Z',
              sender: {
                _id: '507f1f77bcf86cd799439022',
                name: 'Jane Smith',
                email: 'jane.smith@example.com',
                profilePic: 'https://example.com/profile2.jpg',
              },
            },
          ],
          nextCursor: '507f1f77bcf86cd799439030',
          hasMore: true,
          total: 25,
        },
        roomId:
          'chat_507f1f77bcf86cd799439011_507f1f77bcf86cd799439021_507f1f77bcf86cd799439022',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions or not a room participant',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Room not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Chat room not found',
        error: 'Not Found',
      },
    },
  })
  async getRoomMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit = '50',
    @Query('cursor') cursor?: string,
  ) {
    try {
      const result = await this.chatService.getRoomMessages(
        roomId,
        cursor, // cursor for pagination
        parseInt(limit, 10),
      );

      return {
        success: true,
        data: result,
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
  @ApiOperation({
    summary: 'Check existing chat room',
    description: `
      Check if a chat room already exists between the current user and the ad poster for a specific advertisement.
      
      **Features:**
      - Checks for existing chat room between current user and ad poster
      - Returns room information if found, null if not found
      - Useful for preventing duplicate chat room creation
      - Validates user permissions and ad existence
      
      **Use Cases:**
      - Before creating a new chat room
      - To check if user can start a conversation
      - To get existing room ID for navigation
    `,
  })
  @ApiParam({
    name: 'adId',
    description: 'Advertisement ID to check for existing chat room',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiParam({
    name: 'otherUserId',
    description: 'Other user ID to check for existing chat room',
    example: '507f1f77bcf86cd799439022',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat room existence checked successfully',
    schema: {
      example: {
        success: true,
        data: {
          exists: true,
          roomId:
            'chat_507f1f77bcf86cd799439011_507f1f77bcf86cd799439021_507f1f77bcf86cd799439022',
          participants: [
            '507f1f77bcf86cd799439021',
            '507f1f77bcf86cd799439022',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'No existing chat room found',
    schema: {
      example: {
        success: true,
        data: {
          exists: false,
          roomId: null,
          participants: [
            '507f1f77bcf86cd799439021',
            '507f1f77bcf86cd799439022',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid ad ID format',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid Ad ID format: invalid-id',
        error: 'Bad Request',
      },
    },
  })
  async checkExistingChatRoom(
    @Param('adId') adId: string,
    @Param('otherUserId') otherUserId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id || req.user._id;

    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }

    if (!otherUserId) {
      throw new BadRequestException('Other User ID is required');
    }

    try {
      const existingRoom = await this.chatService.findExistingChatRoom(
        userId,
        adId,
        otherUserId,
      );

      return {
        success: true,
        data: {
          exists: !!existingRoom,
          roomId: existingRoom?.roomId || null,
          participants: [userId, otherUserId],
        },
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}
