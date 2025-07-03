import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Schema({ collection: 'auth_tokens', timestamps: true })
export class AuthTokens extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: false })
  token: string;

  @Prop({ required: false })
  iat: number;

  @Prop({ required: false, default: false })
  isDeleted: boolean;

  @Prop({ type: Date, required: false, default: null })
  deletedAt: Date | null;
}

// ✅ Create Mongoose Schema
export const AuthTokensSchema = SchemaFactory.createForClass(AuthTokens);

// ✅ Corrected Pre-save Middleware (Hash Token Before Saving)
AuthTokensSchema.pre('save', async function (next) {
  const authToken = this as AuthTokens;

  if (authToken.isModified('token') && authToken.token) {
    const saltRounds = parseInt(process.env.SALT_ROUNDS ?? '10') || 10;
    authToken.token = await bcrypt.hash(authToken.token, saltRounds);
  }

  next();
});
