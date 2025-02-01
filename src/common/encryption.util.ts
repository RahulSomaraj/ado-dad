import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export class EncryptionUtil {
  private static readonly SALT_ROUNDS = 10; // For bcrypt
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your_32_char_secret_key'; // Must be 32 characters
  private static readonly IV_LENGTH = 16; // AES IV length

  /**
   * Hash a password using bcrypt
   * @param password - The plain text password
   * @returns Hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare a plain text password with a hashed password
   * @param password - The plain text password
   * @param hash - The hashed password
   * @returns Boolean indicating if they match
   */
  static async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Compare plain text password with a hashed password (wrapper for comparePasswords)
   * @param pass - The plain text password
   * @param password - The hashed password
   * @returns Boolean indicating if they match
   */
  static async comparePassword(pass: string, password: string): Promise<boolean> {
    return this.comparePasswords(pass, password);
  }

  /**
   * Encrypt a text using AES-256-CBC
   * @param text - The plain text to encrypt
   * @returns The encrypted text in hex format
   */
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt an AES-256-CBC encrypted text
   * @param encryptedText - The encrypted text in hex format
   * @returns The decrypted plain text
   */
  static decrypt(encryptedText: string): string {
    const [ivHex, encryptedHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedTextBuffer = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedTextBuffer);  // Pass Buffer here
    decrypted = Buffer.concat([decrypted, decipher.final()]);  // Concatenate the final part
    return decrypted.toString('utf8');  // Convert the final buffer to a string
  }
}
