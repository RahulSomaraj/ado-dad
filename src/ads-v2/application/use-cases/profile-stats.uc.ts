import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ad } from '../../../ads/schemas/ad.schema';
import { Favorite } from '../../../favorites/schemas/schema.favorite';
import { ChatRoom } from '../../../chat/schemas/chat-room.schema';

export interface ProfileStats {
  ads: number;
  wishlist: number;
  chats: number;
}

/**
 * Returns accurate per-user counts for the profile stats strip:
 *  - ads:      advertisements posted by the user (Ad.postedBy)
 *  - wishlist: favourited ads (Favorite.userId)
 *  - chats:    chat rooms the user participates in (ChatRoom.participants)
 *
 * All three models are already registered in AdsV2Module's forFeature(), so no
 * new module or cross-module dependency is required.
 */
@Injectable()
export class ProfileStatsUc {
  constructor(
    @InjectModel(Ad.name) private readonly adModel: Model<any>,
    @InjectModel(Favorite.name) private readonly favoriteModel: Model<any>,
    @InjectModel(ChatRoom.name) private readonly chatRoomModel: Model<any>,
  ) {}

  async exec(userId: string): Promise<ProfileStats> {
    const userOid = Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : null;

    const [ads, wishlist, chats] = await Promise.all([
      userOid
        ? this.adModel.countDocuments({ postedBy: userOid }).exec()
        : Promise.resolve(0),
      userOid
        ? this.favoriteModel.countDocuments({ userId: userOid }).exec()
        : Promise.resolve(0),
      // ChatRoom.participants stores user ids as strings.
      this.chatRoomModel.countDocuments({ participants: userId }).exec(),
    ]);

    return { ads, wishlist, chats };
  }
}
