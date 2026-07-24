import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { BUCKETS } from '@/lib/appwrite';
import { generateId, generateSecureId, getClientIP, decryptZipFile, encryptZipFile } from '@/lib/security';
import AdmZip from 'adm-zip';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { virusScanner } from '@/lib/virusScanner';

export const runtime = 'nodejs';

// POST handler: update zip archive
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  if (request.headers.get('content-type')?.includes('application/json')) {
    let editToken: string | undefined;
    try {
      ({ editToken } = await request.json());
    } catch {
      return NextResponse.json({ valid: false, error: 'Invalid JSON body' }, { status: 400 });
    }
    if (!editToken) {
      return NextResponse.json({ valid: false, error: 'Missing edit token' }, { status: 400 });
    }

    const { data: fileRecord, error } = await supabaseAdmin
      .from('zip_file_metadata')
      .select('edit_token')
      .eq('download_token', id)
      .single();

    if (error || !fileRecord) {
      return NextResponse.json({ valid: false, error: 'File not found' }, { status: 404 });
    }

    if (fileRecord.edit_token !== editToken) {
      return NextResponse.json({ valid: false, error: 'Invalid edit token' }, { status: 403 });
    }

    return NextResponse.json({ valid: true });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const relPaths = formData.getAll('relativePaths') as string[];
    const editToken = formData.get('editToken') as string;
    const filesToDeleteRaw = formData.get('filesToDelete') as string;
    const pathsToAddRaw = formData.get('pathsToAdd') as string;
    let filesToDelete: string[] = [];
    let pathsToAdd: string[] = [];
    try {
      filesToDelete = filesToDeleteRaw ? JSON.parse(filesToDeleteRaw) : [];
      pathsToAdd = pathsToAddRaw ? JSON.parse(pathsToAddRaw) : [];
    } catch {
      return NextResponse.json({ error: 'Malformed filesToDelete or pathsToAdd' }, { status: 400 });
    }
    
    console.log('=== FILE UPDATE WORKFLOW START ===');
    console.log('Received update request:', {
      filesCount: files.length,
      relPathsCount: relPaths.length,
      filesToDeleteCount: filesToDelete.length,
      pathsToAddCount: pathsToAdd.length,
      pathsToAdd: pathsToAdd
    });
    
    console.log('Workflow steps:');
    console.log('1. Fetch existing encrypted ZIP from Appwrite');
    console.log('2. Decrypt ZIP and add/remove files');
    console.log('3. Re-encrypt and upload new ZIP to Appwrite');
    console.log('4. Update zip_file_metadata table');
    console.log('5. Update zip_subfile_metadata table');
    console.log('6. Delete old Appwrite file');
    console.log('7. Verify metadata synchronization');

    if (!editToken) {
      return NextResponse.json({ error: 'Missing edit token' }, { status: 400 });
    }

    const { data: fileRecord, error: fetchError } = await supabaseAdmin
      .from('zip_file_metadata')
      .select('*')
      .eq('download_token', id)
      .single();

    if (fetchError || !fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (fileRecord.edit_token !== editToken) {
      return NextResponse.json({ error: 'Invalid edit token' }, { status: 403 });
    }

    const oldAppwriteId = fileRecord.appwrite_id;
    console.log('Step 1: Fetching existing encrypted ZIP from Appwrite...');
    const zipRes = await fetch(
      `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${BUCKETS.FILES}/files/${oldAppwriteId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`,
      {
        headers: {
          'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? '',
          'X-Appwrite-Key': process.env.APPWRITE_API_KEY ?? '',
        },
      }
    );

    if (!zipRes.ok) {
      console.error('Failed to fetch current zip from storage:', zipRes.status, zipRes.statusText);
      return NextResponse.json({ error: 'Failed to fetch current zip from storage' }, { status: 500 });
    }

    console.log('Step 2: Decrypting ZIP and preparing for modifications...');
    const zipBuffer = Buffer.from(await zipRes.arrayBuffer());
    const decryptedZipBuffer = decryptZipFile(zipBuffer, fileRecord.encrypted_key);
    const zip = new AdmZip(decryptedZipBuffer);
    console.log('Successfully decrypted ZIP with', zip.getEntries().length, 'entries');

    // Delete files that were marked for deletion
    if (filesToDelete.length > 0) {
      console.log('Removing files from ZIP:', filesToDelete.length, 'files');
      for (const fileToken of filesToDelete) {
        const { data: subfile } = await supabaseAdmin
          .from('zip_subfile_metadata')
          .select('file_path')
          .eq('file_token', fileToken)
          .single();
        if (subfile && subfile.file_path) {
          zip.deleteFile(subfile.file_path);
          console.log('Removed file from ZIP:', subfile.file_path);
        }
      }
    }

    let subfileRows: any[] = [];
    
    // Process actual files that were uploaded
    for (let i = 0; i < files.length; i++) {
      try {
        console.log(`Processing file ${i + 1}/${files.length}:`, files[i].name);
        const file = files[i];
        const relPath = relPaths[i];
        
        console.log('Converting file to buffer...');
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        console.log('File buffer size:', fileBuffer.length);
        
        console.log('Scanning file for viruses...');
        const scanResult = await virusScanner.scanBuffer(fileBuffer);
        console.log('Scan result:', scanResult);
        
        if (!scanResult.isClean) {
          return NextResponse.json({ error: `File contains malicious content: ${file.name}` }, { status: 400 });
        }
        
        console.log('Adding file to ZIP...');
        zip.addFile(relPath, fileBuffer);
        
        console.log('Creating subfile metadata...');
        subfileRows.push({
          zip_id: fileRecord.id,
          file_name: file.name,
          file_path: relPath,
          size: file.size,
          mime_type: file.type,
          file_token: generateSecureId(),
          extracted: false
        });
        
        console.log(`Successfully processed file: ${file.name}`);
      } catch (fileError: any) {
        console.error(`Error processing file ${files[i].name}:`, fileError);
        return NextResponse.json({ 
          error: `Failed to process file: ${files[i].name}`, 
          details: fileError.message 
        }, { status: 500 });
      }
    }
    
    // Process paths that need metadata but don't have actual files (folders, etc.)
    for (const path of pathsToAdd) {
      // Skip if this path already has a file being processed
      if (relPaths.includes(path)) continue;
      
      // Check if this is a folder path (ends with / or has no extension)
      const isFolder = path.endsWith('/') || !path.includes('.') || path.split('/').length > 1;
      
      if (isFolder) {
        // For folders, we don't add them to the ZIP but we need to ensure they exist in metadata
        // The ZIP library will handle folder creation automatically when files are added
        console.log('Processing folder path:', path);
      } else {
        // This might be a file path that was sent but doesn't have an actual file
        // We'll create a placeholder entry
        console.log('Processing file path without file:', path);
        const fileName = path.split('/').pop() || path;
        subfileRows.push({
          zip_id: fileRecord.id,
          file_name: fileName,
          file_path: path,
          size: 0, // Placeholder size
          mime_type: 'application/octet-stream',
          file_token: generateSecureId(),
          extracted: false
        });
      }
    }

    console.log('Step 3: Creating new ZIP and preparing for upload...');
    const newZipBuffer = zip.toBuffer();
    const timestamp = Date.now();
    const zipName = `archive_${timestamp}.zip`;
    const newAppwriteId = generateId();
    
    // Count only newly added files (not total files)
    const newlyAddedFilesCount = subfileRows.length;

    console.log('ZIP details:', {
      newlyAddedFilesCount,
      zipName,
      newAppwriteId,
      zipSize: newZipBuffer.length
    });

    const { encrypted, encryptedKey } = encryptZipFile(newZipBuffer);
    console.log('Successfully encrypted ZIP, size:', encrypted.length);

    console.log('Creating FormData for Appwrite upload:', {
      newAppwriteId,
      zipName,
      encryptedSize: encrypted.length
    });

    const form = new FormData();
    form.append('fileId', newAppwriteId);
    form.append('file', encrypted, { filename: zipName, contentType: 'application/zip' });

    const headers: Record<string, string> = {
      'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? '',
      'X-Appwrite-Key': process.env.APPWRITE_API_KEY ?? '',
    };

    try {
      const formHeaders = form.getHeaders();
      Object.assign(headers, formHeaders);
    } catch (headerError) {
      console.warn('Failed to get FormData headers, using default:', headerError);
      headers['Content-Type'] = 'multipart/form-data';
    }

    console.log('Making Appwrite upload request with headers:', Object.keys(headers));

    const res = await fetch(`${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${BUCKETS.FILES}/files`, {
      method: 'POST',
      headers,
      body: form
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Appwrite upload failed:', {
        status: res.status,
        statusText: res.statusText,
        error: errText
      });
      return NextResponse.json({ error: 'Appwrite upload failed', details: errText }, { status: 500 });
    }

    console.log('Successfully uploaded new ZIP to Appwrite with ID:', newAppwriteId);

    // Step 1: Update the main zip_file_metadata table
    const updateFields = {
      appwrite_id: newAppwriteId,
      uploaded_at: new Date().toISOString(),
      uploaded_by: getClientIP(request),
      original_name: zipName,
      encrypted_key: encryptedKey
    };

    console.log('Updating zip_file_metadata with:', updateFields);

    const { error: updateError } = await supabaseAdmin
      .from('zip_file_metadata')
      .update(updateFields)
      .eq('id', fileRecord.id);

    if (updateError) {
      console.error('Failed to update zip_file_metadata:', updateError);
      // Try to delete the uploaded file since metadata update failed
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${BUCKETS.FILES}/files/${newAppwriteId}`,
          {
            method: 'DELETE',
            headers: {
              'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? '',
              'X-Appwrite-Key': process.env.APPWRITE_API_KEY ?? '',
            },
          }
        );
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file after metadata update failure:', cleanupError);
      }
      return NextResponse.json({ error: 'Failed to update file metadata', details: updateError.message }, { status: 500 });
    }

    console.log('Successfully updated zip_file_metadata');

    // Step 2: Update zip_subfile_metadata table
    console.log('Starting zip_subfile_metadata update process...');

    // Get existing subfile metadata to preserve file tokens for unchanged files
    const { data: existingSubfiles, error: existingFetchError } = await supabaseAdmin
      .from('zip_subfile_metadata')
      .select('file_path, file_name, size, mime_type, file_token, extracted, downloaded_at')
      .eq('zip_id', fileRecord.id);

    if (existingFetchError) {
      console.error('Failed to fetch existing subfile metadata:', existingFetchError);
      return NextResponse.json({ error: 'Failed to fetch existing subfile metadata', details: existingFetchError.message }, { status: 500 });
    }

    console.log(`Found ${existingSubfiles?.length || 0} existing subfiles in metadata`);

    // Delete subfiles that were marked for deletion
    if (filesToDelete.length > 0) {
      console.log('Deleting files from metadata:', filesToDelete);
      const { error: deleteError } = await supabaseAdmin
        .from('zip_subfile_metadata')
        .delete()
        .in('file_token', filesToDelete);
      
      if (deleteError) {
        console.error('Failed to delete subfile metadata:', deleteError);
        return NextResponse.json({ error: 'Failed to delete subfile metadata', details: deleteError.message }, { status: 500 });
      }
      console.log(`Successfully deleted ${filesToDelete.length} files from metadata`);
    }

    // Insert new files
    if (subfileRows.length > 0) {
      console.log('Inserting new files to metadata:', subfileRows.map(f => f.file_path));
      const { error: subfileInsertError } = await supabaseAdmin.from('zip_subfile_metadata').insert(subfileRows);
      if (subfileInsertError) {
        console.error('Failed to insert new subfile metadata:', subfileInsertError);
        return NextResponse.json({ error: 'Failed to insert new subfile metadata', details: subfileInsertError.message }, { status: 500 });
      }
      console.log(`Successfully inserted ${subfileRows.length} new files to metadata`);
    }

    // Update existing files that might have changed (size, mime_type, etc.)
    const zipEntries = zip.getEntries();
    const existingSubfileMap = new Map(existingSubfiles?.map((f: any) => [f.file_path, f]) || []);
    
    // Create a set of all paths that should exist in metadata
    const allPathsSet = new Set([
      ...zipEntries.filter(entry => !entry.isDirectory).map(entry => entry.entryName),
      ...pathsToAdd
    ]);
    
    console.log('All paths that should exist in metadata:', Array.from(allPathsSet));
    
    // Update existing files that might have changed
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      
      const existingFile = existingSubfileMap.get(entry.entryName) as any;
      const isNewFile = subfileRows.some(row => row.file_path === entry.entryName);
      
      // Skip if it's a new file (already inserted above) or if it hasn't changed
      if (isNewFile || !existingFile) continue;
      
      // Check if file has changed (size, name, etc.)
      const hasChanged = existingFile.size !== entry.header.size || 
                        existingFile.file_name !== entry.name;
      
      if (hasChanged) {
        const { error: updateError } = await supabaseAdmin
          .from('zip_subfile_metadata')
          .update({
            file_name: entry.name,
            size: entry.header.size,
            mime_type: (entry.header as any).mimeType || existingFile.mime_type || ''
          })
          .eq('file_token', existingFile.file_token);
        
        if (updateError) {
          console.error('Failed to update subfile metadata for:', entry.entryName, updateError);
        }
      }
    }
    
    // Ensure all paths from pathsToAdd are represented in metadata
    const additionalSubfileRows: any[] = [];
    for (const path of pathsToAdd) {
      const existingEntry = existingSubfileMap.get(path);
      const isNewEntry = subfileRows.some(row => row.file_path === path);
      const isInZip = zipEntries.some(entry => entry.entryName === path);
      
      // If this path is not in the ZIP and not already in metadata, add it
      if (!isInZip && !existingEntry && !isNewEntry) {
        const fileName = path.split('/').pop() || path;
        const isFolder = path.endsWith('/') || !path.includes('.') || path.split('/').length > 1;
        
        if (!isFolder) {
          console.log('Adding missing path to metadata:', path);
          additionalSubfileRows.push({
            zip_id: fileRecord.id,
            file_name: fileName,
            file_path: path,
            size: 0,
            mime_type: 'application/octet-stream',
            file_token: generateSecureId(),
            extracted: false
          });
        }
      }
    }
    
    // Insert additional files that were missing
    if (additionalSubfileRows.length > 0) {
      const { error: additionalInsertError } = await supabaseAdmin.from('zip_subfile_metadata').insert(additionalSubfileRows);
      if (additionalInsertError) {
        console.error('Failed to insert additional subfile metadata:', additionalInsertError);
        return NextResponse.json({ error: 'Failed to insert additional subfile metadata', details: additionalInsertError.message }, { status: 500 });
      }
      console.log(`Successfully inserted ${additionalSubfileRows.length} additional files to metadata`);
    }

    // Step 3: Delete the old Appwrite file after successful metadata updates
    console.log('Deleting old Appwrite file:', oldAppwriteId);
    try {
      const deleteRes = await fetch(
        `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${BUCKETS.FILES}/files/${oldAppwriteId}`,
        {
          method: 'DELETE',
          headers: {
            'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? '',
            'X-Appwrite-Key': process.env.APPWRITE_API_KEY ?? '',
          },
        }
      );
      
      if (deleteRes.ok) {
        console.log('Successfully deleted old Appwrite file');
      } else {
        console.warn('Failed to delete old Appwrite file, but continuing:', deleteRes.status, deleteRes.statusText);
      }
    } catch (deleteError) {
      console.warn('Error deleting old Appwrite file, but continuing:', deleteError);
    }

    // Log the operation summary
    const operationSummary = {
      added: [...subfileRows.map(f => f.file_path), ...additionalSubfileRows.map(f => f.file_path)],
      deleted: filesToDelete,
      paths_requested: pathsToAdd,
      newly_added_count: newlyAddedFilesCount,
      updated: zipEntries.filter(entry => !entry.isDirectory).length - subfileRows.length,
      new_zip_name: zipName,
      new_appwrite_id: newAppwriteId,
      total_files: zipEntries.filter(entry => !entry.isDirectory).length
    };

    console.log('=== FILE UPDATE WORKFLOW COMPLETED ===');
    console.log('File update operation completed:', operationSummary);

    // Verify metadata synchronization
    const { data: finalSubfiles, error: verifyError } = await supabaseAdmin
      .from('zip_subfile_metadata')
      .select('file_path, file_name')
      .eq('zip_id', fileRecord.id);

    if (verifyError) {
      console.error('Failed to verify metadata synchronization:', verifyError);
    } else {
      const expectedFiles = zipEntries.filter(entry => !entry.isDirectory).map(entry => entry.entryName);
      const actualFiles = finalSubfiles?.map((f: any) => f.file_path) || [];
      
      console.log('Final metadata verification:', {
        expectedFiles: expectedFiles,
        actualFiles: actualFiles,
        expectedCount: expectedFiles.length,
        actualCount: actualFiles.length
      });
      
      if (expectedFiles.length !== actualFiles.length) {
        console.warn('Metadata synchronization mismatch:', {
          expected: expectedFiles.length,
          actual: actualFiles.length,
          missing: expectedFiles.filter((f: string) => !actualFiles.includes(f)),
          extra: actualFiles.filter((f: string) => !expectedFiles.includes(f))
        });
      } else {
        console.log('Metadata synchronization verified successfully');
      }
    }

    await supabaseAdmin.from('audit_logs').insert({
      action: 'file_update',
      resource_type: 'zip',
      resource_id: fileRecord.id,
      ip_address: getClientIP(request),
      metadata: operationSummary
    });

    // Add cache control headers to ensure fresh data
    const response = NextResponse.json({ 
      success: true, 
      summary: {
        added: subfileRows.length + additionalSubfileRows.length,
        deleted: filesToDelete.length,
        paths_requested: pathsToAdd.length,
        newly_added_count: newlyAddedFilesCount,
        total_files: operationSummary.total_files,
        details: {
          files_added: [...subfileRows.map(f => f.file_path), ...additionalSubfileRows.map(f => f.file_path)],
          files_deleted: filesToDelete,
          paths_processed: pathsToAdd
        }
      }
    });
    
    // Add headers to prevent caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (err: any) {
    console.error('Unexpected error in file update:', {
      error: err.message,
      stack: err.stack,
      name: err.name
    });
    return NextResponse.json({ 
      error: 'Unexpected server error', 
      details: err.message,
      type: err.name 
    }, { status: 500 });
  }
}

// DELETE handler: delete entire zip
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const editToken = body.editToken;

    if (!editToken) {
      return NextResponse.json({ error: 'Missing edit token' }, { status: 400 });
    }

    const { data: fileRecord, error: fetchError } = await supabaseAdmin
      .from('zip_file_metadata')
      .select('*')
      .eq('download_token', id)
      .single();

    if (fetchError || !fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (fileRecord.edit_token !== editToken) {
      return NextResponse.json({ error: 'Invalid edit token' }, { status: 403 });
    }

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${BUCKETS.FILES}/files/${fileRecord.appwrite_id}`,
        {
          method: 'DELETE',
          headers: {
            'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? '',
            'X-Appwrite-Key': process.env.APPWRITE_API_KEY ?? '',
          },
        }
      );
    } catch (err) {
      console.error('Failed to delete file from Appwrite:', err);
    }

    const { error: supabaseDeleteError } = await supabaseAdmin
      .from('zip_file_metadata')
      .delete()
      .eq('id', fileRecord.id);

    if (supabaseDeleteError) {
      return NextResponse.json({ error: 'Failed to delete file metadata', details: supabaseDeleteError.message }, { status: 500 });
    }

    await supabaseAdmin.from('audit_logs').insert({
      action: 'file_deleted',
      resource_type: 'zip',
      resource_id: fileRecord.id,
      ip_address: getClientIP(request),
      metadata: {
        filename: fileRecord.original_name,
        reason: 'user_deleted',
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Unexpected server error', details: err.message }, { status: 500 });
  }
}
