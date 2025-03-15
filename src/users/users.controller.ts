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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { EmailService } from '../utils/email.service';
import {
  ApiTags,
  ApiQuery,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto'; // Import CreateUserDto
import { UpdateUserDto } from './dto/update-user.dto'; // Import UpdateUserDto
import { HttpExceptionFilter } from 'src/shared/exception-service';
import { GetUsersDto } from './dto/get-user.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import { Roles } from 'src/roles/roles.decorator';
import { UserType } from './enums/user.types';
import { RolesGuard } from 'src/roles/roles.guard';

@ApiTags('users')
@Controller('users')
@UseFilters(new HttpExceptionFilter('Users'))
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @Get()
  @ApiResponse({ status: 200, description: 'List of users' })
  async getAllUsers(@Query() query: GetUsersDto, @Request() req): Promise<any> {
    const { user } = req;
    return this.usersService.getAllUsers(query, user);
  }

  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN, UserType.USER)
  @Get(':id')
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Post()
  @ApiBody({
    description: 'Create a new user',
    type: CreateUserDto, // Use CreateUserDto for creating user
  })
  @ApiResponse({ status: 201, description: 'User created' })
  async createUser(@Body() userData: CreateUserDto) {
    return this.usersService.createUser(userData);
  }

  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @Put(':id')
  @ApiBody({
    description: 'Update user details',
    type: UpdateUserDto, // Use UpdateUserDto for updating user
  })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(@Param('id') id: string, @Body() updateData: UpdateUserDto) {
    return this.usersService.updateUser(id, updateData);
  }

  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @Delete(':id')
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @Post('send-otp')
  @ApiResponse({ status: 200, description: 'OTP sent' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async sendOTP(@Body('email') email: string) {
    return this.usersService.sendOTP(email);
  }

  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @Post('verify-otp')
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or OTP expired' })
  async verifyOTP(@Body() body: { email: string; otp: string }) {
    return this.usersService.verifyOTP(body.email, body.otp);
  }
}
