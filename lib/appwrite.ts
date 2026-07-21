import { Client, Account, Databases, Storage, Functions, ID } from 'node-appwrite';

const client = new Client();

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://placeholder.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'placeholder-project-id');

// Server-side operations need the API key; without it the SDK runs with guest scope
if (process.env.APPWRITE_API_KEY) {
  client.setKey(process.env.APPWRITE_API_KEY);
}

// For server-side operations

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export { ID, client };

// Database and Collection IDs
export const DATABASE_ID = 'file_sharing_db';
export const COLLECTIONS = {
  FILES: 'files',
  FILE_LINKS: 'file_links',
  CHAT_ROOMS: 'chat_rooms',
  CHAT_MESSAGES: 'chat_messages',
  AUDIT_LOGS: 'audit_logs',
  USERS: 'users'
};

// Storage Bucket IDs
export const BUCKETS = {
  FILES: 'files_bucket',
  AVATARS: 'avatars_bucket'
};
