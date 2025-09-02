import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import * as crypto from 'crypto';
import fs from 'fs';

// Password hashing
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// JWT token operations
export const generateToken = (payload: string | object | Buffer, expiresIn: string = '24h'): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn } as any);
};

export const verifyToken = (token: string): any => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Generate unique IDs
export const generateId = (length: number = 21): string => {
  // Generate proper UUID format for database compatibility
  return crypto.randomUUID();
};

// export function generateId() {
//   return randomUUID();
// }  works for multiple files upload but failes to give link and token will need to change for that

export const generateSecureId = (length: number = 5): string => {
  return crypto.randomBytes(length).toString('hex');
};

// Password generation for chat rooms
export const generateRoomPassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// File validation
export const getAllowedTypes = (): string[] => {
  return process.env.ALLOWED_FILE_TYPES?.split(',').map(t => t.trim().toLowerCase()) || [];
};

export const validateFileType = (fileName: string, mimeType: string, allowedTypes: string[]): boolean => {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  return allowedTypes.some(type => {
    type = type.trim().toLowerCase();
    if (type.includes('/')) {
      // MIME type match (supports wildcards like image/*)
      if (type.endsWith('/*')) {
        const baseType = type.split('/')[0];
        return mimeType.startsWith(baseType + '/');
      }
      return mimeType === type;
    }
    // Extension match
    return fileExtension === type;
  });
};

export const validateFileSize = (size: number, maxSize: number): boolean => {
  return size <= maxSize;
};

// IP address extraction
// export const getClientIP = (req: any): string => {
//   return req.headers['x-forwarded-for'] || 
//          req.connection.remoteAddress || 
//          req.socket.remoteAddress ||
//          (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
//          '127.0.0.1';
// };

export const getClientIP = (req: any): string => {
  // Next.js API routes: req.headers.get for edge, req.headers for node
  if (typeof req.headers?.get === 'function') {
    // Edge API route (NextRequest)
    return req.headers.get('x-forwarded-for') || '127.0.0.1';
  }
  if (req.headers && typeof req.headers === 'object') {
    return req.headers['x-forwarded-for'] || '127.0.0.1';
  }
  return '127.0.0.1';
};

// Generate avatar URL
export const generateAvatarUrl = (seed: string): string => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

// Encryption/Decryption for sensitive data using secure AES-256-CBC
export const encrypt = (text: string): string => {
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key as unknown as Uint8Array, iv as unknown as Uint8Array);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
};

export const decrypt = (encryptedText: string): string => {
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);
  const [ivHex, encrypted] = encryptedText.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key as unknown as Uint8Array, iv as unknown as Uint8Array);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Hybrid encryption for zip files (AES-256 + RSA)
/**
 * Decrypts an encrypted zip file buffer using AES-256-CBC after decrypting the AES key with RSA-OAEP.
 *
 * @param encrypted The encrypted zip file content as a Buffer (including the IV at the beginning).
 * @param encryptedKey The base64-encoded encrypted AES key.
 * @returns The decrypted zip file content as a Buffer.
 * @throws Error if ZIP_ENCRYPTION_PRIVATE_KEY environment variable is not set or is invalid.
 */
export function encryptZipFile(buffer: Buffer): { encrypted: Buffer; encryptedKey: string } {
  const aesKey = crypto.randomBytes(32); // AES-256 key
  const iv = crypto.randomBytes(16);     // Initialization Vector

  // Fix: Use Buffer as Uint8Array by accessing .buffer and .byteOffset, .byteLength for strict TS environments
  const cipher = crypto.createCipheriv('aes-256-cbc', 
    new Uint8Array(aesKey.buffer, aesKey.byteOffset, aesKey.byteLength),
    new Uint8Array(iv.buffer, iv.byteOffset, iv.byteLength)
  );
  const encryptedData = Buffer.concat([
    // @ts-ignore
    cipher.update(buffer as unknown as Uint8Array),
    cipher.final() as unknown as Uint8Array
  ]);

  // Prepend the IV to the encrypted data for easier decryption
  const encrypted = Buffer.concat([
    new Uint8Array(iv.buffer, iv.byteOffset, iv.byteLength),
    // @ts-ignore
    encryptedData
  ]);
  const publicKey = process.env.ZIP_ENCRYPTION_PUBLIC_KEY?.replace(/\\n/g, '\n');
  // const publicKey = fs.readFileSync('public_key.pem', 'utf8').replace(/\\n/g, '\n');

  if (!publicKey) {
    throw new Error('ZIP_ENCRYPTION_PUBLIC_KEY environment variable is not set or is invalid.');
  }

  // Encrypt the AES key using RSA public key encryption with OAEP padding
  const encryptedKey = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    },
    new Uint8Array(aesKey.buffer, aesKey.byteOffset, aesKey.byteLength)
  ).toString('base64');

  return { encrypted, encryptedKey };
}

/**
 * Decrypts an encrypted zip file buffer using AES-256-CBC after decrypting the AES key with RSA-OAEP.
 *
 * @param encrypted The encrypted zip file content as a Buffer (including the IV at the beginning).
 * @param encryptedKey The base64-encoded encrypted AES key.
 * @returns The decrypted zip file content as a Buffer.
 * @throws Error if ZIP_ENCRYPTION_PRIVATE_KEY environment variable is not set or is invalid.
 */
export function decryptZipFile(encrypted: Buffer, encryptedKey: string): Buffer {

  const privateKey = process.env.ZIP_ENCRYPTION_PRIVATE_KEY?.replace(/\\n/g, '\n');
  // const privateKey = fs.readFileSync('private_key.pem', 'utf8').replace(/\\n/g, '\n');

  if (!privateKey) {
    throw new Error('ZIP_ENCRYPTION_PRIVATE_KEY environment variable is not set or is invalid.');
  }

  // Decrypt the AES key using RSA private key decryption with OAEP padding
  const aesKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    },
    new Uint8Array(Buffer.from(encryptedKey, 'base64').buffer, Buffer.from(encryptedKey, 'base64').byteOffset, Buffer.from(encryptedKey, 'base64').byteLength)
  );

  // Extract the IV from the beginning of the encrypted data
  const iv = encrypted.subarray(0, 16);
  const data = encrypted.subarray(16); // The actual encrypted data without the IV

  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    new Uint8Array(aesKey.buffer, aesKey.byteOffset, aesKey.byteLength),
    new Uint8Array(iv.buffer, iv.byteOffset, iv.byteLength)
  );
  return Buffer.concat([
    // @ts-ignore
    decipher.update(data as unknown as Uint8Array),
    decipher.final() as unknown as Uint8Array
  ]);
}