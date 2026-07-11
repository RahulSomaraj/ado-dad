import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export class EncryptionUtil {
  private static readonly SALT_ROUNDS = 10;
  private static readonly IV_LENGTH = 12; // GCM standard

  /** Derive a 32-byte key from ENCRYPTION_KEY; fail closed in production if unset. */
  private static getKey(): Buffer {
    const raw = process.env.ENCRYPTION_KEY;
    if (!raw || raw.length === 0) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_KEY is required in production');
      }
      return crypto.scryptSync('dev-insecure-key', 'ado-dad-enc-salt', 32);
    }
    return crypto.scryptSync(raw, 'ado-dad-enc-salt', 32);
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }
  static async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  static async comparePassword(pass: string, password: string): Promise<boolean> {
    return this.comparePasswords(pass, password);
  }

  /** Authenticated encryption (AES-256-GCM). Returns iv:tag:ciphertext (hex). */
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.getKey(), iv);
    const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
  }

  static decrypt(encryptedText: string): string {
    const parts = String(encryptedText).split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted payload');
    const [ivHex, tagHex, dataHex] = parts;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.getKey(),
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  }
}
