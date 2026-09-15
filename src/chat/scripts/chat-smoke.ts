/**
 * Runs the real ChatService queries against a real MongoDB (UAT/local) to verify
 * the aggregation pipelines and map-field updates end to end. Cleans up after itself.
 *
 *   MONGO_URI=... SMOKE_BUYER_ID=<userId> SMOKE_AD_ID=<adId of someone else> \
 *     npx ts-node src/chat/scripts/chat-smoke.ts
 */
import mongoose, { Types } from 'mongoose';
import { ChatRoomSchema } from '../schemas/chat-room.schema';
import { ChatMessageSchema, MessageType } from '../schemas/chat-message.schema';
import { AdSchema } from '../../ads/schemas/ad.schema';
import { UserSchema } from '../../users/schemas/user.schema';
import { ChatService } from '../chat.service';
import { ContentModerationService } from '../services/content-moderation.service';

function check(cond: unknown, label: string) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  const { MONGO_URI, SMOKE_BUYER_ID: buyer, SMOKE_AD_ID: adId } = process.env;
  if (!MONGO_URI || !buyer || !adId) throw new Error('Set MONGO_URI, SMOKE_BUYER_ID, SMOKE_AD_ID');
  await mongoose.connect(MONGO_URI);

  const Room: any = mongoose.model('ChatRoom', ChatRoomSchema);
  const Message: any = mongoose.model('ChatMessage', ChatMessageSchema);
  const Ad: any = mongoose.model('Ad', AdSchema);
  const User: any = mongoose.model('User', UserSchema);
  await Promise.all([Room.createIndexes(), Message.createIndexes()]);

  const s3: any = {
    bucket: process.env.AWS_S3_BUCKET_NAME || 'bucket',
    getMediaHosts: () => [`${process.env.AWS_S3_BUCKET_NAME || 'bucket'}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com`],
  };
  const svc = new ChatService(Room, Message, Ad, User, new ContentModerationService(), s3);

  const existed = await Room.exists({ initiatorId: new Types.ObjectId(buyer), adId: new Types.ObjectId(adId) });
  const room = await svc.createChatRoom(buyer, adId);
  const seller = String(room.adPosterId);
  const created: Types.ObjectId[] = [];
  try {
    const cid = `smoke${Date.now()}`;
    const a = await svc.sendMessage(room.roomId, buyer, { type: MessageType.TEXT, content: 'Is it still available?', clientMessageId: cid });
    const replay = await svc.sendMessage(room.roomId, buyer, { type: MessageType.TEXT, content: 'Is it still available?', clientMessageId: cid });
    created.push(new Types.ObjectId(a.message.id));
    check(a.created && !replay.created && replay.message.id === a.message.id, 'idempotent send');

    const b = await svc.sendMessage(room.roomId, seller, { type: MessageType.TEXT, content: "Yes, I'd hate to lose a buyer" });
    created.push(new Types.ObjectId(b.message.id));
    check(b.created, 'flagged-not-blocked message delivered');

    const sellerList = await svc.listRooms(seller, { limit: 20 });
    const sRow = sellerList.rooms.find((r) => r.roomId === room.roomId);
    check(sRow?.unreadCount === 1, `seller unread = 1 (got ${sRow?.unreadCount})`);
    check(sRow?.myRole === 'selling' && !!sRow?.otherUser?.name, 'seller view: role + other user');
    check(sRow?.lastMessage?.preview?.startsWith('Yes'), 'lastMessage preview is newest');
    check(!JSON.stringify(sRow).includes('"email"'), 'no email in room view');

    const unreadOnly = await svc.listRooms(seller, { limit: 20, filter: 'unread' });
    check(unreadOnly.rooms.some((r) => r.roomId === room.roomId), 'unread filter includes room');

    const search = await svc.listRooms(buyer, { limit: 20, q: 'hate to lose' });
    check(search.rooms.some((r) => r.roomId === room.roomId), 'search by preview');

    const read = await svc.markRoomRead(room.roomId, seller);
    check(read.changed >= 1, 'markRead flipped buyer messages');
    const after = await svc.getRoomView(room.roomId, seller);
    check(after.unreadCount === 0, 'seller unread reset');
    const buyerView = await svc.getRoomView(room.roomId, buyer);
    check(buyerView.unreadCount === 1, `buyer unread = 1 (got ${buyerView.unreadCount})`);

    const page = await svc.getRoomMessages(room.roomId, buyer, { limit: 1 });
    check(page.messages.length === 1 && page.hasMore && page.order === 'desc', 'history page 1');
    const older = await svc.getRoomMessages(room.roomId, buyer, { limit: 1, cursor: page.nextCursor! });
    check(older.messages[0]?.id !== page.messages[0].id, 'history cursor moves back');
    const catchUp = await svc.getRoomMessages(room.roomId, buyer, { after: a.message.id });
    check(catchUp.messages.some((m) => m.id === b.message.id), 'after= catch-up returns newer');

    const summary = await svc.getUnreadSummary(buyer);
    check(summary.total >= 1, 'unread summary');

    let blocked = false;
    try {
      await svc.sendMessage(room.roomId, new Types.ObjectId().toString(), { type: MessageType.TEXT, content: 'x' });
    } catch (e: any) {
      blocked = e.code === 'NOT_PARTICIPANT';
    }
    check(blocked, 'stranger cannot send');
  } finally {
    await Message.deleteMany({ _id: { $in: created } });
    if (!existed) await Room.deleteOne({ _id: room._id });
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
