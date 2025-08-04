import { NextRequest, NextResponse } from 'next/server';
import { BUCKETS } from '@/lib/appwrite';
import { generateId, generateSecureId, validateFileType, validateFileSize, getClientIP, getAllowedTypes, hashPassword, encryptZipFile } from '@/lib/security';
import { supabaseAdmin } from '@/lib/supabase';
import { virusScanner } from '@/lib/virusScanner';
import { logger } from '@/lib/logger';
import FormData from 'form-data';
import fetch from 'node-fetch';
import AdmZip from 'adm-zip';

// Utility function to check environment configuration
function isProperlyConfigured(): boolean {
  return !(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co' ||
    !process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT === 'https://placeholder.appwrite.io/v1'
  );
}

// Utility function to validate and process files
async function validateAndProcessFiles(files: File[], relPaths: string[], request: NextRequest) {
  const allowedTypes = getAllowedTypes();
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '104857600');
  let totalSize = 0;
  const subfileMetadata: any[] = [];
  const fileBuffers: Buffer[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relPath = relPaths[i];
    
    if (!validateFileType(file.name, file.type, allowedTypes)) {
      return { error: NextResponse.json({ error: `File type not allowed: ${file.name}` }, { status: 400 }) };
    }
    
    if (!validateFileSize(file.size, maxSize)) {
      return { error: NextResponse.json({ error: `File size exceeds limit: ${file.name}` }, { status: 400 }) };
    }
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Virus scan each file
    const scanResult = await virusScanner.scanBuffer(fileBuffer);
    if (!scanResult.isClean) {
      await supabaseAdmin.from('audit_logs').insert({
        action: 'virus_detected',
        resource_type: 'file',
        resource_id: String(relPath),
        ip_address: getClientIP(request),
        // user_agent: request.headers.get('user-agent') || undefined,
        metadata: {
          filename: file.name,
          signature: scanResult.signature,
          message: scanResult.message
        }
      });
      return { error: NextResponse.json({ error: `File contains malicious content: ${file.name}` }, { status: 400 }) };
    }
    
    totalSize += file.size;
    fileBuffers.push(fileBuffer);
    subfileMetadata.push({
      file_name: file.name,
      file_path: relPath,
      size: file.size,
      mime_type: file.type,
    });
  }

  return { subfileMetadata, fileBuffers, totalSize };
}

// Utility function to upload file to Appwrite
async function uploadToAppwrite(encrypted: Buffer, zipName: string, fileId: string) {
  const form = new FormData();
  form.append('fileId', fileId);
  form.append('file', encrypted, { filename: zipName, contentType: 'application/zip' });
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout
    
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
      
      // Handle specific Appwrite errors
      if (res.status === 503) {
        return { error: NextResponse.json({ 
          error: 'Appwrite service temporarily unavailable. Please try again in a few minutes.',
          details: 'Service timeout or overloaded'
        }, { status: 503 }) };
      }
      
      if (res.status === 413) {
        return { error: NextResponse.json({ 
          error: 'File too large for Appwrite storage',
          details: 'File exceeds Appwrite bucket limits'
        }, { status: 413 }) };
      }
      
      return { error: NextResponse.json({ 
        error: 'Appwrite upload failed', 
        details: errText,
        status: res.status
      }, { status: 500 }) };
    }
    
    return { uploadedFile: await res.json() as any };
  } catch (error: any) {
    console.error('Appwrite upload error:', error);
    
    if (error.name === 'AbortError') {
      return { error: NextResponse.json({ 
        error: 'Upload timeout - file may be too large or network is slow',
        details: 'Request timed out after 60 seconds'
      }, { status: 408 }) };
    }
    
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      return { error: NextResponse.json({ 
        error: 'Network connection error',
        details: 'Unable to connect to Appwrite service'
      }, { status: 503 }) };
    }
    
    return { error: NextResponse.json({ 
      error: 'Upload failed due to network error',
      details: error.message
    }, { status: 500 }) };
  }
}

// Utility function to create audit log
async function createAuditLog(action: string, resourceId: string, request: NextRequest, metadata: any = {}) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action,
      resource_type: 'zip',
      resource_id: resourceId,
      ip_address: getClientIP(request),
      // user_agent: request.headers.get('user-agent') || undefined,
      metadata
    });
  } catch (err: any) {
    logger.error('Failed to create audit log:', err);
  }
}

export async function POST(request: NextRequest) {
  // Check environment configuration
  if (!isProperlyConfigured()) {
    return NextResponse.json(
      { error: 'Service not properly configured' },
      { status: 503 }
    );
  }

  try {
    // Log the configured max file size for debugging
    // const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800');
    // console.log('Configured MAX_FILE_SIZE:', maxSize, 'bytes (', Math.round(maxSize / 1024 / 1024), 'MB)');

    // Rate limiting
    // const rateLimitResult = await fileUploadRateLimiter.isAllowed(request);
    // if (!rateLimitResult.allowed) {
    //   return NextResponse.json(
    //     { error: 'Too many upload attempts. Please try again later.' },
    //     { status: 429 }
    //   );
    // }    // check: keeping it off for development perspective, preventing multiple file uploads

    const formData = await request.formData();
    // Debug: log all formData keys and values
    const debugEntries = Array.from(formData.entries());
    console.log('FormData entries:', debugEntries.map(([k, v]) => [k, v instanceof File ? v.name : v]));
    const files = formData.getAll('files') as File[];
    let relPaths = formData.getAll('relativePaths') as string[];
    console.log('Number of files received:', files.length);
    if (files.length > 0) {
      console.log('File types:', files.map(f => typeof f));
      console.log('File names:', files.map(f => f && f.name));
      console.log('File sizes:', files.map(f => f && f.size));
      console.log('Total size:', files.reduce((sum, f) => sum + (f ? f.size : 0), 0));
    }
    const password = formData.get('password') as string;
    const expiresIn = formData.get('expiresIn') as string;
    const maxDownloadsRaw = formData.get('maxDownloads');
    let maxDownloads = 10;   // default downloads would be 10
    if (maxDownloadsRaw !== null && maxDownloadsRaw !== undefined) {
      const parsed = parseInt(String(maxDownloadsRaw), 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
        maxDownloads = parsed;
      }
    }
    const captchaToken = formData.get('captchaToken') as string;

    if (!files || files.length === 0) {
      // Debug: log all formData entries if no files found
      console.error('No files provided. FormData entries:', debugEntries);
      return NextResponse.json(
        { error: 'No files provided', debug: debugEntries },
        { status: 400 }
      );
    }
    // Fallback: if relPaths is missing or count mismatch, use file.name for each file
    if (!relPaths || relPaths.length !== files.length) {
      relPaths = files.map(f => (f as any).webkitRelativePath || f.name);
    }

    if (!relPaths || relPaths.length !== files.length) {
      return NextResponse.json(
        { error: 'Relative paths missing or count mismatch' },
        { status: 400 }
      );
    }

    // Verify CAPTCHA   //check : for development purpose its turned off, switch on for production
    // if (!captchaToken) {
    //   return NextResponse.json(
    //     { error: 'CAPTCHA verification required' },
    //     { status: 400 }
    //   );
    // }

    // const captchaResponse = await fetch('https://hcaptcha.com/siteverify', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //   body: `secret=${process.env.HCAPTCHA_SECRET_KEY}&response=${captchaToken}`
    // });

    // const captchaData = await captchaResponse.json() as { success: boolean; [key: string]: any };
    // if (!captchaData.success) {
    //   return NextResponse.json(
    //     { error: 'CAPTCHA verification failed' },
    //     { status: 400 }
    //   );
    // }

    // Validate and process files
    const validationResult = await validateAndProcessFiles(files, relPaths, request);
    if (validationResult.error) return validationResult.error;
    
    const { subfileMetadata, fileBuffers, totalSize } = validationResult;

    // Create ZIP archive in-memory
    const zip = new AdmZip();
    for (let i = 0; i < files.length; i++) {
      zip.addFile(relPaths[i], fileBuffers[i]);
    }
    const zipBuffer = zip.toBuffer();
    const zipName = `archive_${Date.now()}.zip`;

    // Encrypt the ZIP buffer
    const { encrypted, encryptedKey } = encryptZipFile(zipBuffer);

    // Upload encrypted ZIP to Appwrite
    const fileId = generateId();
    console.log(`Attempting to upload ${zipName} (${encrypted.length} bytes) to Appwrite...`);
    const uploadResult = await uploadToAppwrite(encrypted, zipName, fileId);
    if (uploadResult.error) {
      console.error('Appwrite upload failed:', uploadResult.error);
      return uploadResult.error;
    }
    
    const uploadedFile = uploadResult.uploadedFile;

    // Calculate expiry
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();  // 7 days for expiration

    let hashedPassword = null;
    if (password) {
      hashedPassword = await hashPassword(password);
    }

    // Store file metadata in Supabase, including Appwrite file UID and encryptedKey
    const { data: fileRecord, error: fileInsertError } = await supabaseAdmin.from('zip_file_metadata').insert([
      {
        original_name: zipName,
        size: encrypted.length,
        mime_type: 'application/zip',
        download_token: generateSecureId(),
        edit_token: generateSecureId(),
        password: hashedPassword,
        expiry_date: expiryDate,
        max_downloads: maxDownloads,
        download_count: 0,
        is_active: true,
        uploaded_at: new Date().toISOString(),
        uploaded_by: getClientIP(request),
        appwrite_id: uploadedFile.$id, // Store Appwrite file UID
        encrypted_key: encryptedKey // Store encrypted AES key
      }
    ]).select().single();
    if (fileInsertError) {
      logger.error('Supabase file insert error:', fileInsertError);
      return NextResponse.json(
        { error: 'Failed to save file metadata in Supabase', details: fileInsertError.message },
        { status: 500 }
      );
    }
    const zipId = fileRecord.id;

    // Store subfile metadata in Supabase
    const subfileRows = subfileMetadata.map(meta => ({
      zip_id: zipId,
      file_name: meta.file_name,
      file_path: meta.file_path,
      size: meta.size,
      mime_type: meta.mime_type,
      file_token: generateSecureId(),
      extracted: false,
      // downloaded_at: null
    }));
    const { error: subfileInsertError } = await supabaseAdmin.from('zip_subfile_metadata').insert(subfileRows);
    if (subfileInsertError) {
      logger.error('Supabase subfile insert error:', subfileInsertError);
      return NextResponse.json(
        { error: 'Failed to save subfile metadata in Supabase', details: subfileInsertError.message },
        { status: 500 }
      );
    }

    // Log audit event
    await createAuditLog('file_upload', zipId, request, {
      filename: zipName,
      size: encrypted.length,
      mimeType: 'application/zip',
      subfiles: subfileMetadata.length
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const downloadUrl = `${baseUrl}/files/${fileRecord.download_token}`;
    const editUrl = `${baseUrl}/files/manage/${fileRecord.edit_token}`;

    return NextResponse.json({
      success: true,
      downloadUrl,
      editUrl,
      zipId,
      subfiles: subfileMetadata.map((meta, idx) => ({ ...meta, file_token: subfileRows[idx].file_token }))
    });
  } catch (err: any) {
    logger.error('Upload error:', err);
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Unexpected server error';
    let statusCode = 500;
    
    if (err.message?.includes('body too large') || err.message?.includes('payload too large')) {
      errorMessage = 'File size exceeds server limit';
      statusCode = 413;
    } else if (err.message?.includes('timeout')) {
      errorMessage = 'Upload timeout - file may be too large';
      statusCode = 408;
    } else if (err.message?.includes('network') || err.message?.includes('connection')) {
      errorMessage = 'Network error during upload';
      statusCode = 503;
    }
    
    // return NextResponse.json(
    //   { 
    //     error: errorMessage, 
    //     details: err.message,
    //     maxFileSize: process.env.MAX_FILE_SIZE || '52428800',
    //     maxFileSizeMB: Math.round(parseInt(process.env.MAX_FILE_SIZE || '52428800') / 1024 / 1024)
    //   },
    //   { status: statusCode }
    // );
  }
}
