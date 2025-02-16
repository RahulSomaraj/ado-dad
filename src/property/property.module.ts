import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from './schemas/schema.property';
import { PropertyService } from './property.service';
import { PropertyController } from './property.controller';
import { User, UserSchema } from 'src/users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: User.name, schema: UserSchema },
    ]), // Registering the model
  ],
  providers: [PropertyService],
  controllers: [PropertyController],
  exports: [PropertyService], // Export PropertyService if needed elsewhere
})
export class PropertyModule {}
