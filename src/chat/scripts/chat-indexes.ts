/**
 * Index check for the chat redesign (checklist B15).
 *
 *   MONGO_URI=mongodb://... npx ts-node src/chat/scripts/chat-indexes.ts           # report only
 *   MONGO_URI=mongodb://... npx ts-node src/chat/scripts/chat-indexes.ts --apply   # also drop the legacy indexes
 *
 * 1. Prints which index each hot chat query uses (explain → winningPlan).
 * 2. Lists the legacy message indexes the old app created and, with --apply,
 *    drops them. Only indexes that exist AND were not the winner of any query
 *    above are dropped, so a wrong guess can't remove something in use.
 */
import mongoose, { Types } from 'mongoose';
import { ChatRoomSchema } from '../schemas/chat-room.schema';
import { ChatMessageSchema } from '../schemas/chat-message.schema';

const LEGACY_MESSAGE_INDEXES = ['isRead_1', 'createdAt_-1', 'roomRef_1_isRead_1', 'roomId_1_isRead_1'];

function winners(plan: any, out = new Set<string>()): Set<string> {
  if (!plan || typeof plan !== 'object') return out;
  if (plan.indexName) out.add(plan.indexName);
  for (const key of ['inputStage', 'inputStages', 'queryPlan', 'winningPlan', 'shards', 'stages', '$cursor', 'executionStats']) {
    const v = plan[key];
    if (Array.isArray(v)) v.forEach((s) => winners(s, out));
    else if (v) winners(v, out);
  }
  return out;
}

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ado-dad';
  const apply = process.argv.includes('--apply');
  await mongoose.connect(uri);
  const Room = mongoose.model('ChatRoom', ChatRoomSchema);
  const Message = mongoose.model('ChatMessage', ChatMessageSchema);

  const sample = await Room.findOne().sort({ lastMessageAt: -1 }).lean<any>();
  if (!sample) {
    console.log('No chat rooms — nothing to explain.');
    await mongoose.disconnect();
    return;
  }
  const uid = new Types.ObjectId(String(sample.initiatorId));
  const used = new Set<string>();

  const report = async (label: string, explain: any) => {
    const w = winners(explain);
    w.forEach((i) => used.add(i));
    console.log(`${label.padEnd(22)} → ${[...w].join(', ') || 'COLLSCAN (no index!)'}`);
  };

  await report(
    'room list',
    await Room.aggregate([
      { $match: { status: { $ne: 'archived' }, $or: [{ initiatorId: uid }, { adPosterId: uid }] } },
      { $sort: { lastMessageAt: -1, _id: -1 } },
      { $limit: 21 },
    ]).explain('executionStats'),
  );
  await report(
    'unread summary',
    await Room.aggregate([
      { $match: { $or: [{ initiatorId: uid }, { adPosterId: uid }], status: { $ne: 'archived' }, [`unreadCounts.${uid}`]: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: `$unreadCounts.${uid}` } } },
    ]).explain('executionStats'),
  );
  await report(
    'history (cursor)',
    await Message.find({ roomId: sample.roomId }).sort({ _id: -1 }).limit(30).explain('executionStats'),
  );
  await report(
    'mark-read update',
    await Message.find({ roomRef: sample._id, senderId: { $ne: uid }, isRead: false }).explain('executionStats'),
  );

  const existing = (await Message.collection.indexes()).map((i: any) => i.name as string);
  const droppable = LEGACY_MESSAGE_INDEXES.filter((n) => existing.includes(n) && !used.has(n));
  const keep = LEGACY_MESSAGE_INDEXES.filter((n) => existing.includes(n) && used.has(n));
  console.log(`\nLegacy message indexes present: ${LEGACY_MESSAGE_INDEXES.filter((n) => existing.includes(n)).join(', ') || 'none'}`);
  if (keep.length) console.log(`Still used by a query above, keeping: ${keep.join(', ')}`);
  if (!droppable.length) {
    console.log('Nothing to drop.');
  } else if (!apply) {
    console.log(`Would drop: ${droppable.join(', ')}   (re-run with --apply)`);
  } else {
    for (const name of droppable) {
      await Message.collection.dropIndex(name);
      console.log(`Dropped ${name}`);
    }
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
