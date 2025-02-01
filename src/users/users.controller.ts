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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { EmailService } from '../utils/email.service';
import { ApiTags, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto'; // Import CreateUserDto
import { UpdateUserDto } from './dto/update-user.dto'; // Import UpdateUserDto
import { HttpExceptionFilter } from 'src/shared/exception-service';

@ApiTags('users')
@Controller('users')
@UseFilters(new HttpExceptionFilter('Users'))
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of users per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search query to filter users',
  })
  @ApiResponse({ status: 200, description: 'List of users' })
  async getAllUsers(@Query() query): Promise<any> {
    return this.usersService.getAllUsers(query.page, query.limit, query);
  }

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

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Post('send-otp')
  @ApiResponse({ status: 200, description: 'OTP sent' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async sendOTP(@Body('email') email: string) {
    return this.usersService.sendOTP(email);
  }

  @Post('verify-otp')
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or OTP expired' })
  async verifyOTP(@Body() body: { email: string; otp: string }) {
    return this.usersService.verifyOTP(body.email, body.otp);
  }
}
