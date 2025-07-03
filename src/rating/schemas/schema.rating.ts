import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Product } from '../../product/schemas/product.schema';

// Comment Schema
@Schema({ _id: false })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ required: true, maxlength: 500 })
  comment: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

// Rating Schema
@Schema({ timestamps: true })
export class Rating extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: false, maxlength: 500 })
  review: string;

  @Prop({ type: [Comment], default: [] })
  comments: Comment[];
}

// Create the schema
export const RatingSchema = SchemaFactory.createForClass(Rating);
