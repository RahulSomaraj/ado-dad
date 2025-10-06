import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseFilters,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ForbiddenException,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { EmailService } from '../utils/email.service';
import {
  ApiTags,
  ApiQuery,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
} from '@nestjs/swagger';
import { CreateUserDto, CreateUserWithFileDto } from './dto/create-user.dto'; // Import both DTOs
import { UpdateUserDto } from './dto/update-user.dto'; // Import UpdateUserDto
import { HttpExceptionFilter } from '../shared/exception-service';
import { GetUsersDto } from './dto/get-user.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { Roles } from '../roles/roles.decorator';
import { UserType } from './enums/user.types';
import { RolesGuard } from '../roles/roles.guard';
import { S3Service } from '../shared/s3.service';

@ApiTags('Users')
@Controller('users')
@UseFilters(new HttpExceptionFilter('Users'))
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly s3Service: S3Service,
  ) {}

  @Post()
  @ApiBody({
    description: 'Create a new user with profile picture URL',
    type: CreateUserDto, // Use CreateUserDto for creating user with URL
  })
  @ApiResponse({ status: 201, description: 'User created' })
  async createUser(@Body() userData: CreateUserDto) {
    return this.usersService.createUser(userData);
  }

  @Post('with-profile-picture')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Create a new user with profile picture file upload',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe' },
        phoneNumber: { type: 'string', example: '+123456789' },
        email: { type: 'string', example: 'john@example.com' },
        password: { type: 'string', example: 'password123' },
        type: { type: 'string', enum: ['SA', 'AD', 'NU', 'SR'], example: 'NU' },
        profilePic: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture file (JPG, PNG, WebP supported)',
        },
      },
      required: ['name', 'phoneNumber', 'email', 'password', 'type'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User created with profile picture',
  })
  @UseInterceptors(FileInterceptor('profilePic'))
  async createUserWithProfilePicture(
    @Body() userData: CreateUserWithFileDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          // Validate MIME types explicitly
          // Validate by MIME type
          new FileTypeValidator({ fileType: /^image\//i }),
        ],
        fileIsRequired: false,
      }),
    )
    profilePic?: Express.Multer.File,
  ) {
    // Upload profile picture if provided
    let profilePicUrl: string | undefined;
    if (profilePic) {
      try {
        profilePicUrl = await this.s3Service.uploadFile(profilePic);
      } catch (error) {
        console.log(
          'S3 upload failed, falling back to local storage:',
          error.message,
        );
        // Fallback to local storage
        const uploadsDir = require('path').join(
          __dirname,
          '..',
          '..',
          'public',
          'uploads',
        );
        const fs = require('fs');
        const { v4: uuidv4 } = require('uuid');

        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const uniqueFileName = `${uuidv4()}-${profilePic.originalname}`;
        const filePath = require('path').join(uploadsDir, uniqueFileName);
        fs.writeFileSync(filePath, profilePic.buffer);
        profilePicUrl = `/uploads/${uniqueFileName}`;
      }
    }

    // Create user with profile picture URL
    const createUserDto: CreateUserDto = {
      ...userData,
      profilePic: profilePicUrl,
    };

    return this.usersService.createUser(createUserDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @Get()
  @ApiResponse({ status: 200, description: 'List of users' })
  async getAllUsers(@Query() query: GetUsersDto, @Request() req): Promise<any> {
    const { user } = req;
    return this.usersService.getAllUsers(query, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN, UserType.USER, UserType.SHOWROOM)
  @Get(':id')
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN, UserType.USER, UserType.SHOWROOM)
  @Put(':id')
  @ApiBody({
    description: 'Update user details',
    type: UpdateUserDto, // Use UpdateUserDto for updating user
  })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: UpdateUserDto,
    @Request() req,
  ) {
    const actor = req.user;
    if (!actor) {
      throw new ForbiddenException();
    }
    const isAdmin =
      actor.type === UserType.SUPER_ADMIN || actor.type === UserType.ADMIN;
    if (!isAdmin && actor.id !== id && actor._id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.usersService.updateUser(id, updateData);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/password')
  @ApiBody({
    description: 'Change password',
    schema: {
      type: 'object',
      properties: {
        currentPassword: { type: 'string' },
        newPassword: { type: 'string' },
      },
      required: ['currentPassword', 'newPassword'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password changed' })
  async changePassword(
    @Param('id') id: string,
    @Body() body: { currentPassword: string; newPassword: string },
    @Request() req,
  ) {
    const actor = req.user;
    const isAdmin =
      actor?.type === UserType.SUPER_ADMIN || actor?.type === UserType.ADMIN;
    if (!isAdmin && actor?.id !== id && actor?._id !== id) {
      throw new ForbiddenException('You can only change your own password');
    }
    return this.usersService.changePassword(
      id,
      body.currentPassword,
      body.newPassword,
    );
  }
  @Delete(':id')
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @Post('send-otp')
  @ApiResponse({ status: 200, description: 'OTP sent' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async sendOTP(@Body('email') email: string) {
    return this.usersService.sendOTP(email);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @Post('verify-otp')
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or OTP expired' })
  async verifyOTP(@Body() body: { email: string; otp: string }) {
    return this.usersService.verifyOTP(body.email, body.otp);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Send a password reset email to the user if the email exists in the system.',
  })
  @ApiBody({
    description: 'Email address for password reset',
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'user@example.com',
          description: 'User email address',
        },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if email exists)',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'If the email exists, a password reset link has been sent.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email format',
  })
  async forgotPassword(@Body() body: { email: string }) {
    return this.usersService.forgotPassword(body.email);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN, UserType.USER, UserType.SHOWROOM)
  @Post('profile-picture')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update user profile picture',
    schema: {
      type: 'object',
      properties: {
        profilePic: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture file (JPG, PNG, WebP supported)',
        },
      },
      required: ['profilePic'],
    },
  })
  @ApiResponse({ status: 200, description: 'Profile picture updated' })
  @UseInterceptors(FileInterceptor('profilePic'))
  async updateProfilePicture(
    @Request() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /^image\//i }),
        ],
        fileIsRequired: true,
      }),
    )
    profilePic: Express.Multer.File,
  ) {
    // Upload profile picture
    let profilePicUrl: string;
    try {
      profilePicUrl = await this.s3Service.uploadFile(profilePic);
    } catch (error) {
      console.log(
        'S3 upload failed, falling back to local storage:',
        error.message,
      );
      // Fallback to local storage
      const uploadsDir = require('path').join(
        __dirname,
        '..',
        '..',
        'public',
        'uploads',
      );
      const fs = require('fs');
      const { v4: uuidv4 } = require('uuid');

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const uniqueFileName = `${uuidv4()}-${profilePic.originalname}`;
      const filePath = require('path').join(uploadsDir, uniqueFileName);
      fs.writeFileSync(filePath, profilePic.buffer);
      profilePicUrl = `/uploads/${uniqueFileName}`;
    }

    // Update user profile picture
    return this.usersService.updateUser(req.user.id, {
      profilePic: profilePicUrl,
    });
  }
}
