import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModelService } from './model.service';  // Import your service
import { ModelSchema,} from './schemas/schema.model'; // Import the schema

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Model', schema: ModelSchema }]), // Register the model schema here
  ],
  providers: [ModelService], // Register ModelService
  exports: [ModelService], // If you want to use the service elsewhere, export it
})
export class ModelModule {}
