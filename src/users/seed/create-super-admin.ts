/**
 * Creates a single SUPER_ADMIN user. Unlike add-super-admin.ts this script:
 *   - creates only the SA (no AD/NU/SR), with credentials you supply
 *   - never deletes an existing user; it aborts if email or phone is taken
 *   - connects to mongo directly, so no app-level side effects (Redis, cron, ...)
 *
 * Usage (env file defaults to .env):
 *   ENV_FILE=.env.prod SA_NAME="..." SA_EMAIL="..." SA_COUNTRY_CODE="+91" \
 *   SA_PHONE="..." SA_PASSWORD="..." npx ts-node src/users/seed/create-super-admin.ts
 */
import * as path from 'path';
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { UserSchema } from '../schemas/user.schema';
import { UserType } from '../enums/user.types';

const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// On some Windows setups Node's bundled c-ares cannot read the system DNS
// config and falls back to 127.0.0.1, so the mongodb+srv lookup dies with
// ECONNREFUSED. Set DNS_SERVERS to override, e.g. DNS_SERVERS=8.8.8.8,1.1.1.1
if (process.env.DNS_SERVERS) {
  const servers = process.env.DNS_SERVERS.split(',').map((s) => s.trim());
  dns.setServers(servers);
  console.log(`DNS      : ${servers.join(', ')} (overridden)`);
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
  return value;
}

async function bootstrap() {
  const mongoUri = required('MONGO_URI');
  const name = required('SA_NAME');
  const email = required('SA_EMAIL').toLowerCase().trim();
  const countryCode = required('SA_COUNTRY_CODE').trim();
  const phoneNumber = required('SA_PHONE').trim();
  const password = required('SA_PASSWORD');

  if (password.length < 12) {
    console.error('SA_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }

  // Show which database is being targeted, without leaking credentials.
  const redacted = mongoUri.replace(/\/\/[^@]+@/, '//<redacted>@');
  console.log(`Env file : ${envFile}`);
  console.log(`Mongo    : ${redacted}`);
  console.log(`Creating : ${name} <${email}> ${countryCode}${phoneNumber} [SA]`);

  await mongoose.connect(mongoUri);
  const userModel = mongoose.model('User', UserSchema);

  try {
    const clash = await userModel.findOne({
      $or: [{ email }, { countryCode, phoneNumber }],
    });
    if (clash) {
      console.error(
        `Aborting: a user already exists with that email or phone (_id ${String(clash._id)}, type ${clash.get('type')}). ` +
          'Nothing was written.',
      );
      process.exit(1);
    }

    // Plain password: the schema pre-save hook hashes it and normalizes countryCode.
    const user = new userModel({
      name,
      email,
      countryCode,
      phoneNumber,
      password,
      type: UserType.SUPER_ADMIN,
      isDeleted: false,
    });
    await user.save();

    console.log(`Created super admin _id ${String(user._id)}`);
  } finally {
    await mongoose.disconnect();
  }
}

bootstrap().catch((error) => {
  console.error('Failed to create super admin:', error);
  process.exit(1);
});
