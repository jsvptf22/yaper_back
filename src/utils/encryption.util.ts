import * as crypto from 'crypto';

export class EncryptionUtil {
  private static readonly algorithm = 'aes-256-ctr';
  // Using static values for secretKey and iv to ensure consistent encryption/decryption
  private static readonly secretKey = Buffer.from(
    process.env.ENCRYPTION_KEY || 'default-encryption-key-for-development-only',
    'utf8',
  ).slice(0, 32);
  private static readonly iv = Buffer.from(
    process.env.ENCRYPTION_IV || 'default-iv-16byte',
    'utf8',
  ).slice(0, 16);

  /**
   * Encrypts text using AES-256-CTR
   * @param text - Text to encrypt
   * @returns Encrypted text
   */
  static encrypt(text: string): string {
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.secretKey,
      this.iv,
    );

    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return encrypted.toString('hex');
  }

  /**
   * Decrypts text that was encrypted with AES-256-CTR
   * @param encryptedText - Text to decrypt
   * @returns Decrypted text
   */
  static decrypt(encryptedText: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      this.iv,
    );

    const encryptedBuffer = Buffer.from(encryptedText, 'hex');
    const decrypted = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final(),
    ]);

    return decrypted.toString();
  }
}
