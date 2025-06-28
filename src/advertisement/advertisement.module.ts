import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdvertisementsController } from './advertisement.controller';
import { AdvertisementsService } from './advertisement.service';
import {
  Advertisement,
  AdvertisementSchema,
} from './schemas/advertisement.schema';
import { User, UserSchema } from '../users/schemas/user.schema'; // Import User schema for reference
import { Property, PropertySchema } from 'src/property/schemas/schema.property';
import { Category, CategorySchema } from 'src/category/schemas/category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Advertisement.name, schema: AdvertisementSchema },
      { name: User.name, schema: UserSchema }, // Reference to User schema
      { name: Property.name, schema: PropertySchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [AdvertisementsController],
  providers: [AdvertisementsService],
})
export class AdvertisementsModule {}
