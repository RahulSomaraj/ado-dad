import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertySchema } from './schemas/schema.property';
import { PropertyService } from './property.service';
import { PropertyController } from './property.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Property', schema: PropertySchema }]), // Registering the model
  ],
  providers: [PropertyService],
  controllers: [PropertyController],
  exports: [PropertyService], // Export PropertyService if needed elsewhere
})
export class PropertyModule {}
