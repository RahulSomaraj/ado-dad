import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Schema({ collection: 'auth_tokens', timestamps: true })
export class AuthTokens extends Document {
  @Prop({ required: true })
  userId: number;

  @Prop({ required: false })
  token: string;

  @Prop({ required: false })
  iat: number;

  @Prop({ required: false, default: false })
  isDeleted: boolean;

  @Prop({ type: Date, required: false, default: null }) // ✅ Explicitly define type
  deletedAt: Date | null;

  // Hash token before saving to the database
  async hashToken() {
    if (this.token) {
      const saltRounds = parseInt(process.env.SALT_ROUNDS ?? '10') || 10;
      this.token = await bcrypt.hash(this.token, saltRounds);
    }
  }
}

// Create Mongoose Schema
export const AuthTokensSchema = SchemaFactory.createForClass(AuthTokens);

// Pre-save middleware to hash token before saving
AuthTokensSchema.pre('save', async function (next) {
  const tokenDocument = this as AuthTokens;
  await tokenDocument.hashToken();
  next();
});
