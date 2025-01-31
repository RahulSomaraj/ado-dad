import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Product } from '../../product/schemas/product.schema'; // Reference to Product schema
import { User } from '../../users/schemas/user.schema'; // Reference to User schema

@Schema({ timestamps: true })
export class Cart extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User; // Refers to the User model

  @Prop([
    {
      product: { type: Types.ObjectId, ref: 'Product', required: true }, // Refers to the Product model
      quantity: { type: Number, required: true, min: 1 },
    },
  ])
  items: Array<{
    product: Types.ObjectId | Product; // Refers to the Product model
    quantity: number;
  }>;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
