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
  const collection = mongoose.connection.collection('vehiclemodels');

  const cursor = collection.find({
    $or: [
      { isActive: { $type: 'string' } },
      { isDeleted: { $type: 'string' } },
      { isCommercialVehicle: { $type: 'string' } },
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

    if (typeof doc.isDeleted === 'string') {
      updates.isDeleted = parseBoolean(doc.isDeleted, false);
    }

    if (typeof doc.isCommercialVehicle === 'string') {
      updates.isCommercialVehicle = parseBoolean(
        doc.isCommercialVehicle,
        false,
      );
    }

    if (Object.keys(updates).length > 0) {
      await collection.updateOne({ _id: doc._id }, { $set: updates });
      updated += 1;
    }
  }

  console.log(
    `Vehicle model boolean fix complete. Scanned: ${scanned}, Updated: ${updated}`,
  );
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Vehicle model boolean fix failed:', error);
  process.exit(1);
});
