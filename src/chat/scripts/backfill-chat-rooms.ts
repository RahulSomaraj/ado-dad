/**
 * One-off backfill for the chat redesign (checklist B15).
 *
 *   MONGO_URI=mongodb://... npx ts-node src/chat/scripts/backfill-chat-rooms.ts [--dry-run]
 *
 * For every chat room:
 *  - lastMessage   ← newest message (type, preview, sender, createdAt)
 *  - lastMessageAt ← newest message time, or room createdAt for empty rooms
 *  - unreadCounts  ← { initiator: 0, poster: 0 }  (clean slate: the old app never
 *                     marked anything read, so historical counts would be noise)
 *  - participants  ← string ids
 * Safe to re-run.
 */
import mongoose from 'mongoose';
import { ChatRoomSchema } from '../schemas/chat-room.schema';
import { ChatMessageSchema } from '../schemas/chat-message.schema';
import { ChatService } from '../chat.service';

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ado-dad';
  const dryRun = process.argv.includes('--dry-run');
  await mongoose.connect(uri);
  const Room = mongoose.model('ChatRoom', ChatRoomSchema);
  const Message = mongoose.model('ChatMessage', ChatMessageSchema);

  const latest = await Message.aggregate([
    { $sort: { _id: -1 } },
    {
      $group: {
        _id: '$roomId',
        id: { $first: '$_id' },
        type: { $first: '$type' },
        content: { $first: '$content' },
        senderId: { $first: '$senderId' },
        createdAt: { $first: '$createdAt' },
      },
    },
  ]).allowDiskUse(true);
  const byRoom = new Map(latest.map((m: any) => [m._id, m]));

  const cursor = Room.find({}).lean().cursor();
  let ops: any[] = [];
  let total = 0;
  for await (const room of cursor as any) {
    const m: any = byRoom.get(room.roomId);
    const initiator = String(room.initiatorId);
    const poster = String(room.adPosterId);
    const set: Record<string, any> = {
      participants: [initiator, poster],
      [`unreadCounts.${initiator}`]: 0,
      [`unreadCounts.${poster}`]: 0,
      lastMessageAt: m?.createdAt ?? room.lastMessageAt ?? room.createdAt ?? new Date(),
    };
    if (m) {
      set.lastMessage = {
        id: m.id,
        type: m.type,
        preview: ChatService.previewFor(m.type, m.content),
        senderId: m.senderId,
        createdAt: m.createdAt,
      };
    }
    ops.push({ updateOne: { filter: { _id: room._id }, update: { $set: set } } });
    total++;
    if (ops.length === 500) {
      if (!dryRun) await Room.bulkWrite(ops, { ordered: false });
      ops = [];
    }
  }
  if (ops.length && !dryRun) await Room.bulkWrite(ops, { ordered: false });

  if (!dryRun) {
    // Build the new indexes declared in the schemas (does not drop old ones).
    await Room.createIndexes();
    await Message.createIndexes();
  }
  console.log(`${dryRun ? '[dry-run] would update' : 'Updated'} ${total} rooms (${byRoom.size} with messages)`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
