import { NextRequest, NextResponse } from 'next/server';
import { BUCKETS } from '@/lib/appwrite';
import { generateId, generateSecureId, validateFileType, validateFileSize, getClientIP, getAllowedTypes, hashPassword, encryptZipFile } from '@/lib/security';
import { supabaseAdmin } from '@/lib/supabase';
import { virusScanner } from '@/lib/virusScanner';
import { logger } from '@/lib/logger';
import FormData from 'form-data';
import fetch from 'node-fetch';
import AdmZip from 'adm-zip';
import redis, { REDIS_KEYS } from '@/lib/redis';

export const runtime = 'nodejs';

// Chunked upload configuration
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_CHUNKS = 50; // Maximum 250MB total (50 * 5MB)
const UPLOAD_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

interface ChunkMetadata {
  chunkId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  chunkIndex: number;
  uploadId: string;
  uploadedChunks: number[];
  createdAt: number;
  lastActivity: number;
}

interface UploadSession {
  uploadId: string;
  files: Array<{
    fileName: string;
    fileSize: number;
    totalChunks: number;
    uploadedChunks: number[];
    relativePath: string;
    mimeType: string;
  }>;
  password?: string;
  maxDownloads: number;
  createdAt: number;
  lastActivity: number;
  completed: boolean;
}

// Initialize chunked upload session
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'init':
        return handleInitUpload(request);
      case 'chunk':
        return handleChunkUpload(request);
      case 'complete':
        return handleCompleteUpload(request);
      case 'status':
        return handleUploadStatus(request);
      case 'abort':
        return handleAbortUpload(request);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    logger.error('Chunked upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Initialize upload session
async function handleInitUpload(request: NextRequest) {
  const body = await request.json();
  const { files, password, maxDownloads = 10 } = body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  // Validate files
  const allowedTypes = getAllowedTypes();
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '104857600');
  let totalSize = 0;

  for (const file of files) {
    if (!validateFileType(file.fileName, file.mimeType, allowedTypes)) {
      return NextResponse.json({ error: `File type not allowed: ${file.fileName}` }, { status: 400 });
    }
    
    if (!validateFileSize(file.fileSize, maxSize)) {
      return NextResponse.json({ error: `File size exceeds limit: ${file.fileName}` }, { status: 400 });
    }
    
    totalSize += file.fileSize;
  }

  // Check total ZIP size limit (50MB)
  if (totalSize > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Total file size exceeds 50MB limit' }, { status: 400 });
  }

  const uploadId = generateId();
  const session: UploadSession = {
    uploadId,
    files: files.map((file: any) => ({
      fileName: file.fileName,
      fileSize: file.fileSize,
      totalChunks: Math.ceil(file.fileSize / CHUNK_SIZE),
      uploadedChunks: [],
      relativePath: file.relativePath || file.fileName,
      mimeType: file.mimeType,
    })),
    password,
    maxDownloads,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    completed: false,
  };

  // Store session in Redis with TTL
  if (redis) {
    await redis.setex(
      REDIS_KEYS.FILE_UPLOAD(uploadId),
      UPLOAD_TIMEOUT / 1000,
      JSON.stringify(session)
    );
  }

  return NextResponse.json({
    uploadId,
    chunkSize: CHUNK_SIZE,
    files: session.files.map(f => ({
      fileName: f.fileName,
      totalChunks: f.totalChunks,
      fileSize: f.fileSize,
    })),
  });
}

// Handle individual chunk upload
async function handleChunkUpload(request: NextRequest) {
  const formData = await request.formData();
  const uploadId = formData.get('uploadId') as string;
  const fileName = formData.get('fileName') as string;
  const chunkIndex = parseInt(formData.get('chunkIndex') as string);
  const chunk = formData.get('chunk') as File;

  if (!uploadId || !fileName || chunkIndex === undefined || !chunk) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  // Get upload session
  let session: UploadSession;
  if (redis) {
    const sessionData = await redis.get(REDIS_KEYS.FILE_UPLOAD(uploadId));
    if (!sessionData) {
      return NextResponse.json({ error: 'Upload session expired or not found' }, { status: 404 });
    }
    session = JSON.parse(sessionData);
  } else {
    return NextResponse.json({ error: 'Redis not available' }, { status: 503 });
  }

  // Find file in session
  const fileData = session.files.find(f => f.fileName === fileName);
  if (!fileData) {
    return NextResponse.json({ error: 'File not found in session' }, { status: 404 });
  }

  // Validate chunk index
  if (chunkIndex >= fileData.totalChunks) {
    return NextResponse.json({ error: 'Invalid chunk index' }, { status: 400 });
  }

  // Check if chunk already uploaded
  if (fileData.uploadedChunks.includes(chunkIndex)) {
    return NextResponse.json({ 
      message: 'Chunk already uploaded',
      chunkIndex,
      uploadedChunks: fileData.uploadedChunks.length,
      totalChunks: fileData.totalChunks,
    });
  }

  // Store chunk data in Redis
  const chunkKey = `chunk:${uploadId}:${fileName}:${chunkIndex}`;
  const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
  
  if (redis) {
    await redis.setex(chunkKey, UPLOAD_TIMEOUT / 1000, chunkBuffer.toString('base64'));
  }

  // Update session
  fileData.uploadedChunks.push(chunkIndex);
  fileData.uploadedChunks.sort((a, b) => a - b);
  session.lastActivity = Date.now();

  // Save updated session
  if (redis) {
    await redis.setex(
      REDIS_KEYS.FILE_UPLOAD(uploadId),
      UPLOAD_TIMEOUT / 1000,
      JSON.stringify(session)
    );
  }

  return NextResponse.json({
    message: 'Chunk uploaded successfully',
    chunkIndex,
    uploadedChunks: fileData.uploadedChunks.length,
    totalChunks: fileData.totalChunks,
    progress: (fileData.uploadedChunks.length / fileData.totalChunks) * 100,
  });
}

// Complete upload and process files
async function handleCompleteUpload(request: NextRequest) {
  const body = await request.json();
  const { uploadId } = body;

  if (!uploadId) {
    return NextResponse.json({ error: 'Upload ID required' }, { status: 400 });
  }

  // Get upload session
  let session: UploadSession;
  if (redis) {
    const sessionData = await redis.get(REDIS_KEYS.FILE_UPLOAD(uploadId));
    if (!sessionData) {
      return NextResponse.json({ error: 'Upload session expired or not found' }, { status: 404 });
    }
    session = JSON.parse(sessionData);
  } else {
    return NextResponse.json({ error: 'Redis not available' }, { status: 503 });
  }

  // Check if all chunks are uploaded
  for (const file of session.files) {
    if (file.uploadedChunks.length !== file.totalChunks) {
      return NextResponse.json({ 
        error: 'Not all chunks uploaded',
        file: file.fileName,
        uploaded: file.uploadedChunks.length,
        total: file.totalChunks,
      }, { status: 400 });
    }
  }

  try {
    // Reconstruct files from chunks
    const fileBuffers: Buffer[] = [];
    const subfileMetadata: any[] = [];

    for (const file of session.files) {
      const chunks: Buffer[] = [];
      
      // Collect all chunks for this file
      for (let i = 0; i < file.totalChunks; i++) {
        const chunkKey = `chunk:${uploadId}:${file.fileName}:${i}`;
        if (redis) {
          const chunkData = await redis.get(chunkKey);
          if (!chunkData) {
            throw new Error(`Missing chunk ${i} for file ${file.fileName}`);
          }
          chunks.push(Buffer.from(chunkData, 'base64'));
        }
      }

      // Combine chunks into complete file
      const completeFile = Buffer.concat(chunks.map(chunk => new Uint8Array(chunk)));
      
      // Virus scan the reconstructed file
      const scanResult = await virusScanner.scanBuffer(completeFile);
      if (!scanResult.isClean) {
        // Cleanup chunks
        await cleanupUploadSession(uploadId, session);
        
        await supabaseAdmin.from('audit_logs').insert({
          action: 'virus_detected',
          resource_type: 'file',
          resource_id: file.relativePath,
          ip_address: getClientIP(request),
          metadata: {
            filename: file.fileName,
            signature: scanResult.signature,
            message: scanResult.message
          }
        });
        
        return NextResponse.json({ 
          error: `File contains malicious content: ${file.fileName}` 
        }, { status: 400 });
      }

      fileBuffers.push(completeFile);
      subfileMetadata.push({
        file_name: file.fileName,
        file_path: file.relativePath,
        size: file.fileSize,
        mime_type: file.mimeType,
      });
    }

    // Create ZIP archive
    const zip = new AdmZip();
    for (let i = 0; i < session.files.length; i++) {
      zip.addFile(session.files[i].relativePath, fileBuffers[i]);
    }
    const zipBuffer = zip.toBuffer();
    const zipName = `archive_${Date.now()}.zip`;

    // Encrypt the ZIP buffer
    const { encrypted, encryptedKey } = encryptZipFile(zipBuffer);

    // Upload to Appwrite
    const fileId = generateId();
    const uploadResult = await uploadToAppwrite(encrypted, zipName, fileId);
    if (uploadResult.error) {
      await cleanupUploadSession(uploadId, session);
      return uploadResult.error;
    }

    const uploadedFile = uploadResult.uploadedFile;

    // Save to database (similar to existing upload logic)
    const downloadToken = generateSecureId();
    const editToken = generateSecureId();
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Hash password if provided
    const hashedPassword = session.password ? await hashPassword(session.password) : null;

    // Insert main file record
    const { data: fileRecord, error: insertError } = await supabaseAdmin
      .from('zip_file_metadata')
      .insert({
        original_name: zipName,
        size: encrypted.length,
        mime_type: 'application/zip',
        download_token: downloadToken,
        edit_token: editToken,
        password: hashedPassword,
        expiry_date: expiryDate,
        max_downloads: session.maxDownloads,
        uploaded_by: getClientIP(request),
        appwrite_id: uploadedFile.$id as string,
        encrypted_key: encryptedKey,
      })
      .select()
      .single();

    if (insertError) {
      await cleanupUploadSession(uploadId, session);
      return NextResponse.json({ error: 'Database error', details: insertError.message }, { status: 500 });
    }

    // Insert subfile metadata
    const subfileRows = subfileMetadata.map(meta => ({
      zip_id: fileRecord.id,
      file_name: meta.file_name,
      file_path: meta.file_path,
      size: meta.size,
      mime_type: meta.mime_type,
      file_token: generateSecureId(),
      extracted: false,
    }));

    const { error: subfileError } = await supabaseAdmin
      .from('zip_subfile_metadata')
      .insert(subfileRows);

    if (subfileError) {
      await cleanupUploadSession(uploadId, session);
      return NextResponse.json({ error: 'Subfile metadata error', details: subfileError.message }, { status: 500 });
    }

    // Cleanup upload session
    await cleanupUploadSession(uploadId, session);

    // Log audit event
    await supabaseAdmin.from('audit_logs').insert({
      action: 'file_upload',
      resource_type: 'file',
      resource_id: fileRecord.id,
      ip_address: getClientIP(request),
      metadata: {
        filename: zipName,
        size: encrypted.length,
        mimeType: 'application/zip',
        subfiles: subfileMetadata.length,
        uploadMethod: 'chunked'
      }
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const downloadUrl = `${baseUrl}/files/${downloadToken}`;
    const editUrl = `${baseUrl}/files/manage/${editToken}`;

    return NextResponse.json({
      success: true,
      downloadUrl,
      editUrl,
      zipId: fileRecord.id,
      subfiles: subfileMetadata.map((meta, idx) => ({ ...meta, file_token: subfileRows[idx].file_token }))
    });

  } catch (error: any) {
    logger.error('Complete upload error:', error);
    await cleanupUploadSession(uploadId, session);
    return NextResponse.json({ error: 'Upload completion failed', details: error.message }, { status: 500 });
  }
}

// Get upload status with Server-Sent Events
async function handleUploadStatus(request: NextRequest) {
  const url = new URL(request.url);
  const uploadId = url.searchParams.get('uploadId');

  if (!uploadId) {
    return NextResponse.json({ error: 'Upload ID required' }, { status: 400 });
  }

  // Check if SSE is requested
  const accept = request.headers.get('accept');
  if (accept?.includes('text/event-stream')) {
    return handleSSEStatus(uploadId);
  }

  // Regular JSON response
  if (redis) {
    const sessionData = await redis.get(REDIS_KEYS.FILE_UPLOAD(uploadId));
    if (!sessionData) {
      return NextResponse.json({ error: 'Upload session not found' }, { status: 404 });
    }

    const session: UploadSession = JSON.parse(sessionData);
    const progress = session.files.map(file => ({
      fileName: file.fileName,
      uploadedChunks: file.uploadedChunks.length,
      totalChunks: file.totalChunks,
      progress: (file.uploadedChunks.length / file.totalChunks) * 100,
    }));

    return NextResponse.json({
      uploadId,
      progress,
      completed: session.completed,
      lastActivity: session.lastActivity,
    });
  }

  return NextResponse.json({ error: 'Redis not available' }, { status: 503 });
}

// Server-Sent Events for real-time progress
async function handleSSEStatus(uploadId: string) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      const checkProgress = async () => {
        try {
          if (redis) {
            const sessionData = await redis.get(REDIS_KEYS.FILE_UPLOAD(uploadId));
            if (!sessionData) {
              sendEvent({ error: 'Upload session not found' });
              controller.close();
              return;
            }

            const session: UploadSession = JSON.parse(sessionData);
            const progress = session.files.map(file => ({
              fileName: file.fileName,
              uploadedChunks: file.uploadedChunks.length,
              totalChunks: file.totalChunks,
              progress: (file.uploadedChunks.length / file.totalChunks) * 100,
            }));

            sendEvent({
              uploadId,
              progress,
              completed: session.completed,
              lastActivity: session.lastActivity,
            });

            if (session.completed) {
              controller.close();
            }
          }
        } catch (error) {
          sendEvent({ error: 'Failed to check progress' });
          controller.close();
        }
      };

      // Check progress every 2 seconds
      const interval = setInterval(checkProgress, 2000);
      
      // Initial check
      checkProgress();

      // Cleanup on close
      const cleanup = () => {
        clearInterval(interval);
      };
      
      // No signal property on ReadableStreamDefaultController
      // controller.signal?.addEventListener('abort', cleanup);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Abort upload and cleanup
async function handleAbortUpload(request: NextRequest) {
  const body = await request.json();
  const { uploadId } = body;

  if (!uploadId) {
    return NextResponse.json({ error: 'Upload ID required' }, { status: 400 });
  }

  if (redis) {
    const sessionData = await redis.get(REDIS_KEYS.FILE_UPLOAD(uploadId));
    if (sessionData) {
      const session: UploadSession = JSON.parse(sessionData);
      await cleanupUploadSession(uploadId, session);
    }
  }

  return NextResponse.json({ message: 'Upload aborted successfully' });
}

// Utility function to upload to Appwrite (same as existing)
async function uploadToAppwrite(encrypted: Buffer, zipName: string, fileId: string) {
  const form = new FormData();
  form.append('fileId', fileId);
  form.append('file', encrypted, { filename: zipName, contentType: 'application/zip' });
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${BUCKETS.FILES}/files`, {
      method: 'POST',
      headers: {
        'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? '',
        'X-Appwrite-Key': process.env.APPWRITE_API_KEY ?? '',
        ...form.getHeaders()
      },
      body: form,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const errText = await res.text();
      console.error('Appwrite upload failed:', errText);
      return { error: NextResponse.json({ error: 'Appwrite upload failed', details: errText }, { status: 500 }) };
    }
    
    const uploadedFile: any = await res.json();
    return { uploadedFile };
  } catch (error: any) {
    console.error('Appwrite upload error:', error);
    return { error: NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 }) };
  }
}

// Cleanup upload session and chunks
async function cleanupUploadSession(uploadId: string, session: UploadSession) {
  if (!redis) return;

  try {
    // Delete session
    await redis.del(REDIS_KEYS.FILE_UPLOAD(uploadId));

    // Delete all chunks
    for (const file of session.files) {
      for (let i = 0; i < file.totalChunks; i++) {
        const chunkKey = `chunk:${uploadId}:${file.fileName}:${i}`;
        await redis.del(chunkKey);
      }
    }
  } catch (error) {
    logger.error('Cleanup error:', error instanceof Error ? error.message : String(error));
  }
}