import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Category extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: null })
  icon: string;

  // Optional self-reference (e.g., parent category)
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category', default: null })
  parent?: Category;

  // Field to mark soft deletion. If null, the document is active.
  @Prop({ default: null })
  deletedAt?: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
