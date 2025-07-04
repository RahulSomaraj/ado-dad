import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../schemas/user.schema';
import { UserType } from '../enums/user.types';

const userTypes = [
  {
    type: UserType.SUPER_ADMIN,
    phoneNumber: '1212121212',
    name: 'Super Admin',
    email: 'superadmin@example.com',
  },
  {
    type: UserType.ADMIN,
    phoneNumber: '1212121213',
    name: 'Admin',
    email: 'admin@example.com',
  },
  {
    type: UserType.USER,
    phoneNumber: '1212121214',
    name: 'Normal User',
    email: 'user@example.com',
  },
  {
    type: UserType.SHOWROOM,
    phoneNumber: '1212121215',
    name: 'Showroom',
    email: 'showroom@example.com',
  },
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const userModel = app.get(getModelToken('User'));

    console.log('=== Adding Users for All User Types ===');

    for (const userData of userTypes) {
      const { type, phoneNumber, name, email } = userData;
      const password = '123456';

      // 1. Check if user exists
      const existing = await userModel.findOne({ phoneNumber });
      if (existing) {
        console.log(`User with phone ${phoneNumber} exists. Deleting...`);
        await userModel.deleteOne({ phoneNumber });
      }

      // 2. Create new user with plain password (pre-save hook will hash it)
      const newUser = new userModel({
        name,
        email,
        phoneNumber,
        password, // Plain password - will be hashed by pre-save hook
        type,
        isDeleted: false,
      });

      await newUser.save();
      console.log(`✅ Created ${type} user: ${name} (${phoneNumber})`);
    }

    console.log('\n=== All users created successfully! ===');
    console.log('Login credentials:');
    userTypes.forEach((user) => {
      console.log(`${user.type}: Phone: ${user.phoneNumber}, Password: 123456`);
    });
  } catch (error) {
    console.error('Error creating users:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
