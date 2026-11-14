import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/ado-dad';

const parseBoolean = (value: any, defaultValue: boolean): boolean => {
  if (value === undefined || value === null) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return defaultValue;
};

const run = async () => {
  await mongoose.connect(MONGO_URI);
  const collection = mongoose.connection.collection('manufacturers');

  const cursor = collection.find({
    $or: [
      { isActive: { $type: 'string' } },
      { isPremium: { $type: 'string' } },
      { isDeleted: { $type: 'string' } },
    ],
  });

  let scanned = 0;
  let updated = 0;

  for await (const doc of cursor) {
    scanned += 1;
    const updates: Record<string, boolean> = {};

    if (typeof doc.isActive === 'string') {
      updates.isActive = parseBoolean(doc.isActive, true);
    }

    if (typeof doc.isPremium === 'string') {
      updates.isPremium = parseBoolean(doc.isPremium, false);
    }

    if (typeof doc.isDeleted === 'string') {
      updates.isDeleted = parseBoolean(doc.isDeleted, false);
    }

    if (Object.keys(updates).length > 0) {
      await collection.updateOne({ _id: doc._id }, { $set: updates });
      updated += 1;
    }
  }

  console.log(
    `Manufacturer boolean fix complete. Scanned: ${scanned}, Updated: ${updated}`,
  );
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Manufacturer boolean fix failed:', error);
  process.exit(1);
});
